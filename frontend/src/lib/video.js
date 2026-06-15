const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";

async function parseErrorResponse(res) {
  const data = await res.json().catch(() => ({}));
  const { detail } = data;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.message) return item.message;
        if (item?.msg) return item.msg;
        return String(item);
      })
      .join(", ");
  }

  return "Failed to load videos.";
}

export async function getVideos() {
  const res = await fetch(`${API_BASE}/videos`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

export async function getVideo(id) {
  const res = await fetch(`${API_BASE}/videos/${id}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

export function getPlaybackSource(playbackUrl) {
  if (!playbackUrl) return null;

  const src = `${API_BASE}/videos${playbackUrl}`;
  if (playbackUrl.includes(".m3u8")) {
    return { src, type: "application/x-mpegURL" };
  }

  return { src, type: "video/mp4" };
}
