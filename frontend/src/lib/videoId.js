function toBase64Url(value) {
  const raw = String(value);
  if (typeof btoa === "function") {
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(raw, "utf8").toString("base64url");
}

function fromBase64Url(token) {
  let b64 = String(token).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";

  if (typeof atob === "function") {
    return atob(b64);
  }
  return Buffer.from(b64, "base64").toString("utf8");
}

export function encodeId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 0) return null;
  return toBase64Url(String(Math.trunc(n)));
}

export function decodeId(token) {
  if (token == null || token === "") return null;
  const value = String(token);

  // Allow old numeric links to keep working.
  if (/^\d+$/.test(value)) return value;

  try {
    const raw = fromBase64Url(value);
    if (!/^\d+$/.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export const encodeVideoId = encodeId;
export const decodeVideoId = decodeId;
export const encodeChannelId = encodeId;
export const decodeChannelId = decodeId;

export function watchPath(id) {
  const token = encodeId(id);
  return token ? `/watch/${token}` : "/";
}

export function channelPath(id) {
  const token = encodeId(id);
  return token ? `/channel/${token}` : "/";
}
