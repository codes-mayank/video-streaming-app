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

export async function searchVideos(query) {
  const params = new URLSearchParams({ query: query.trim() });
  const res = await fetch(`${API_BASE}/videos/search?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
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

function guessContentType(file) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const types = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
  };
  return types[ext] || "video/mp4";
}

export async function uploadVideo({ title, description, file, userId, uploadedBy }) {
  const videoName = (file.name.replace(/\.[^/.]+$/, "") || title).slice(0, 200);
  const contentType = guessContentType(file);

  const initRes = await fetch(`${API_BASE}/videos/upload/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: description || null,
      content_type: contentType,
      size_bytes: file.size,
      user_id: String(userId),
      video_name: videoName,
      uploaded_by: uploadedBy || null,
    }),
  });

  if (!initRes.ok) {
    throw new Error(await parseErrorResponse(initRes));
  }

  const { video_id: videoId, upload_url: uploadUrl } = await initRes.json();

  let uploaded = false;

  try {
    const directRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    uploaded = directRes.ok;
  } catch {
    uploaded = false;
  }

  if (!uploaded) {
    const formData = new FormData();
    formData.append("file", file);

    const proxyRes = await fetch(`${API_BASE}/videos/${videoId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!proxyRes.ok) {
      throw new Error(await parseErrorResponse(proxyRes));
    }
  }

  const completeRes = await fetch(`${API_BASE}/videos/${videoId}/complete`, {
    method: "POST",
  });

  if (!completeRes.ok) {
    throw new Error(await parseErrorResponse(completeRes));
  }

  return completeRes.json();
}
