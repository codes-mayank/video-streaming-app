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

function guessImageContentType(file) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return types[ext] || "image/jpeg";
}

async function uploadFileToStorage({ uploadUrl, contentType, file, proxyPath }) {
  try {
    const directRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (directRes.ok) return;
  } catch {
    // Fall back to same-origin proxy upload.
  }

  const formData = new FormData();
  formData.append("file", file);

  const proxyRes = await fetch(`${API_BASE}${proxyPath}`, {
    method: "POST",
    body: formData,
  });

  if (!proxyRes.ok) {
    throw new Error(await parseErrorResponse(proxyRes));
  }
}

export function getThumbnailUrl(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
  return `${API_BASE}${thumbnailUrl}`;
}

export async function uploadVideo({ title, description, file, thumbnailFile, userId, uploadedBy }) {
  const videoName = (file.name.replace(/\.[^/.]+$/, "") || title).slice(0, 200);
  const contentType = guessContentType(file);
  const thumbnailContentType = guessImageContentType(thumbnailFile);

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
      thumbnail_content_type: thumbnailContentType,
      thumbnail_size_bytes: thumbnailFile.size,
    }),
  });

  if (!initRes.ok) {
    throw new Error(await parseErrorResponse(initRes));
  }

  const {
    video_id: videoId,
    upload_url: uploadUrl,
    thumbnail_upload_url: thumbnailUploadUrl,
  } = await initRes.json();

  await uploadFileToStorage({
    uploadUrl,
    contentType,
    file,
    proxyPath: `/videos/${videoId}/upload`,
  });

  await uploadFileToStorage({
    uploadUrl: thumbnailUploadUrl,
    contentType: thumbnailContentType,
    file: thumbnailFile,
    proxyPath: `/videos/${videoId}/thumbnail/upload`,
  });

  const completeRes = await fetch(`${API_BASE}/videos/${videoId}/complete`, {
    method: "POST",
  });

  if (!completeRes.ok) {
    throw new Error(await parseErrorResponse(completeRes));
  }

  return completeRes.json();
}
