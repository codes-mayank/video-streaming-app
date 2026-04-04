"""
Single-pass multi-resolution HLS using FFmpeg filter_complex + var_stream_map
(see https://trac.ffmpeg.org/wiki/Encode/H.264 - variant HLS).

FFmpeg writes flat files in a staging dir (0.m3u8, 0_000.ts, master.m3u8, …),
then we rearrange into:

  {output_base_prefix}/
    master.m3u8
    1080p/{basename}.m3u8, {basename}_000.ts, …
    720p/…
    480p/…
"""

import re
import shutil
import subprocess
from pathlib import Path

from app.core.config import settings
from app.services.storage import get_s3_client

# Variant index from FFmpeg %v → folder name (matches scale order in filter_complex)
VARIANT_INDEX_TO_FOLDER = [
    (0, "1080p"),
    (1, "720p"),
    (2, "480p"),
]


def _safe_segment_basename(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name).strip("._-")
    return (name or "video")[:120]


def _probe_has_audio(path: Path) -> bool:
    cmd = [
        settings.FFPROBE_BINARY,
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=index",
        "-of",
        "csv=p=0",
        str(path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return False
    return bool((result.stdout or "").strip())


def _run(cmd: list[str], *, cwd: str | None = None) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"ffmpeg failed (exit {result.returncode}): {err[:4000]}")


def _find_variant_playlist(staging: Path, idx: int) -> Path | None:
    for name in (f"{idx}.m3u8", f"stream_{idx}.m3u8", f"v{idx}.m3u8"):
        p = staging / name
        if p.is_file():
            return p
    return None


def _reorganize_variant_outputs(staging: Path, layout: Path, seg_name: str) -> None:
    """Move FFmpeg flat %v outputs into resolution subfolders and rename to seg_name."""
    layout.mkdir(parents=True, exist_ok=True)

    master_src = staging / "master.m3u8"
    if not master_src.is_file():
        raise RuntimeError(f"missing master.m3u8 in staging; files: {list(staging.iterdir())}")

    master_text = master_src.read_text(encoding="utf-8", errors="replace")

    for idx, folder in VARIANT_INDEX_TO_FOLDER:
        v_pl = _find_variant_playlist(staging, idx)
        if not v_pl:
            raise RuntimeError(f"missing variant playlist for index {idx} in {list(staging.glob('*.m3u8'))}")

        dest_dir = layout / folder
        dest_dir.mkdir(parents=True, exist_ok=True)

        sub_text = v_pl.read_text(encoding="utf-8", errors="replace")
        sub_text = sub_text.replace(f"{idx}_", f"{seg_name}_")
        (dest_dir / f"{seg_name}.m3u8").write_text(sub_text, encoding="utf-8")

        for seg in sorted(staging.glob(f"{idx}_*.ts")):
            suffix = seg.name[len(f"{idx}_") :]
            shutil.move(str(seg), str(dest_dir / f"{seg_name}_{suffix}"))

        old_name = v_pl.name
        master_text = master_text.replace(old_name, f"{folder}/{seg_name}.m3u8")

    (layout / "master.m3u8").write_text(master_text, encoding="utf-8")


def _upload_directory(local_dir: Path, prefix: str, bucket_name: str) -> str:
    client = get_s3_client()
    master_key = ""
    prefix = prefix.strip("/")
    for path in sorted(local_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(local_dir).as_posix()
        key = f"{prefix}/{rel}"
        if path.suffix == ".m3u8":
            content_type = "application/vnd.apple.mpegurl"
        elif path.suffix == ".ts":
            content_type = "video/mp2t"
        else:
            content_type = "application/octet-stream"
        client.upload_file(str(path), bucket_name, key, ExtraArgs={"ContentType": content_type})
        if rel == "master.m3u8":
            master_key = key
    return master_key


def transcode_to_hls(
    video_id: int,
    source_key: str,
    bucket_name: str,
    *,
    output_base_prefix: str,
    segment_basename: str,
) -> tuple[str, str]:
    base = output_base_prefix.strip("/")
    seg_name = _safe_segment_basename(segment_basename)
    seg_seconds = max(2, min(30, settings.HLS_SEGMENT_SECONDS))

    workdir = Path(settings.TRANSCODE_WORKDIR) / f"video_{video_id}"
    input_path = workdir / "source"
    staging = workdir / "staging"
    layout = workdir / "hls_layout"
    if staging.exists():
        shutil.rmtree(staging, ignore_errors=True)
    if layout.exists():
        shutil.rmtree(layout, ignore_errors=True)
    staging.mkdir(parents=True, exist_ok=True)

    client = get_s3_client()
    client.download_file(bucket_name, source_key, str(input_path))

    has_audio = _probe_has_audio(input_path)

    # force_divisible_by=2: libx264 rejects odd dimensions (e.g. 853x480 from 854x480 box).
    filter_complex = (
        "[0:v]split=3[v1][v2][v3];"
        "[v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p[v1out];"
        "[v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p[v2out];"
        "[v3]scale=w=854:h=480:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p[v3out]"
    )

    cmd: list[str] = [
        settings.FFMPEG_BINARY,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_path),
        "-filter_complex",
        filter_complex,
    ]

    if has_audio:
        cmd.extend(
            [
                "-map",
                "[v1out]",
                "-map",
                "0:a:0",
                "-map",
                "[v2out]",
                "-map",
                "0:a:0",
                "-map",
                "[v3out]",
                "-map",
                "0:a:0",
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-b:v:0",
                "5000k",
                "-b:v:1",
                "2800k",
                "-b:v:2",
                "1400k",
                "-b:a:0",
                "128k",
                "-b:a:1",
                "128k",
                "-b:a:2",
                "128k",
                "-ar",
                "48000",
                "-ac",
                "2",
            ]
        )
        var_stream_map = "v:0,a:1 v:2,a:3 v:4,a:5"
    else:
        cmd.extend(
            [
                "-map",
                "[v1out]",
                "-map",
                "[v2out]",
                "-map",
                "[v3out]",
                "-c:v",
                "libx264",
                "-b:v:0",
                "5000k",
                "-b:v:1",
                "2800k",
                "-b:v:2",
                "1400k",
            ]
        )
        var_stream_map = "v:0 v:1 v:2"

    cmd.extend(
        [
            "-f",
            "hls",
            "-hls_time",
            str(seg_seconds),
            "-hls_playlist_type",
            "vod",
            "-hls_segment_type",
            "mpegts",
            "-hls_segment_filename",
            "%v_%03d.ts",
            "-master_pl_name",
            "master.m3u8",
            "-var_stream_map",
            var_stream_map,
            "-hls_flags",
            "independent_segments",
            "%v.m3u8",
        ]
    )

    _run(cmd, cwd=str(staging))
    _reorganize_variant_outputs(staging, layout, seg_name)

    master_key = _upload_directory(layout, base, bucket_name)
    shutil.rmtree(workdir, ignore_errors=True)
    return base, master_key
