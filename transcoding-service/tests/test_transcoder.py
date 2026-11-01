from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services import transcoder


def test_safe_segment_basename_removes_path_characters():
    assert transcoder._safe_segment_basename("  clip / summer?.mp4  ") == "clip_summer_.mp4"
    assert transcoder._safe_segment_basename("../") == "video"


def test_probe_duration_rounds_up(monkeypatch, tmp_path):
    monkeypatch.setattr(
        transcoder.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="10.01\n", stderr=""),
    )

    assert transcoder._probe_duration_seconds(tmp_path / "source.mp4") == 11


@pytest.mark.parametrize("output", ["nan", "-1", "not-a-number"])
def test_probe_duration_rejects_invalid_output(monkeypatch, tmp_path, output):
    monkeypatch.setattr(
        transcoder.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=output, stderr=""),
    )

    with pytest.raises(RuntimeError, match="invalid video duration"):
        transcoder._probe_duration(tmp_path / "source.mp4")


def test_reorganize_variant_outputs(tmp_path):
    staging = tmp_path / "staging"
    layout = tmp_path / "layout"
    staging.mkdir()
    (staging / "master.m3u8").write_text(
        "#EXTM3U\n0.m3u8\n1.m3u8\n2.m3u8\n", encoding="utf-8"
    )
    for index, _folder in transcoder.VARIANT_INDEX_TO_FOLDER:
        (staging / f"{index}.m3u8").write_text(
            f"#EXTM3U\n{index}_000.ts\n", encoding="utf-8"
        )
        (staging / f"{index}_000.ts").write_bytes(b"segment")

    transcoder._reorganize_variant_outputs(staging, layout, "sample")

    master = (layout / "master.m3u8").read_text(encoding="utf-8")
    for _index, folder in transcoder.VARIANT_INDEX_TO_FOLDER:
        assert f"{folder}/sample.m3u8" in master
        assert "sample_000.ts" in (layout / folder / "sample.m3u8").read_text()
        assert (layout / folder / "sample_000.ts").read_bytes() == b"segment"


def test_reorganize_requires_all_variant_playlists(tmp_path):
    staging = tmp_path / "staging"
    staging.mkdir()
    (staging / "master.m3u8").write_text("#EXTM3U", encoding="utf-8")

    with pytest.raises(RuntimeError, match="missing variant playlist"):
        transcoder._reorganize_variant_outputs(staging, tmp_path / "layout", "sample")


@pytest.mark.parametrize("has_audio", [False, True])
def test_transcode_pipeline_builds_playlists_and_uploads_files(monkeypatch, tmp_path, has_audio):
    uploads = []
    commands = []
    client = SimpleNamespace(
        download_file=lambda bucket, key, path: Path(path).write_bytes(b"source"),
        upload_file=lambda *args, **kwargs: uploads.append((args, kwargs)),
    )
    monkeypatch.setattr(transcoder, "get_s3_client", lambda: client)
    monkeypatch.setattr(transcoder, "_probe_duration", lambda path: 10.2)
    monkeypatch.setattr(transcoder, "_probe_has_audio", lambda path: has_audio)
    monkeypatch.setattr(transcoder.settings, "TRANSCODE_WORKDIR", str(tmp_path))

    def fake_ffmpeg(command, *, cwd=None):
        commands.append(command)
        staging = Path(cwd)
        (staging / "master.m3u8").write_text("0.m3u8\n1.m3u8\n2.m3u8\n")
        for index, _folder in transcoder.VARIANT_INDEX_TO_FOLDER:
            (staging / f"{index}.m3u8").write_text(f"{index}_000.ts\n")
            (staging / f"{index}_000.ts").write_bytes(b"segment")

    monkeypatch.setattr(transcoder, "_run", fake_ffmpeg)
    result = transcoder.transcode_to_hls(
        17,
        "raw/source.mp4",
        "videos",
        output_base_prefix="/users/4/movie/",
        segment_basename="My / Movie",
    )

    assert result == ("users/4/movie", "users/4/movie/master.m3u8", 11, None)
    assert len(uploads) == 7  # master, three variants, three segments
    assert any(args[2].endswith("1080p/My_Movie.m3u8") for args, _ in uploads)
    assert ("v:0,a:0 v:1,a:1 v:2,a:2" if has_audio else "v:0 v:1 v:2") in commands[0]
    assert not (tmp_path / "video_17").exists()
