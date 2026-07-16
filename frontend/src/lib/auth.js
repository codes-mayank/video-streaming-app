const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";

let refreshPromise = null;

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

  return "Something went wrong. Please try again.";
}

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function signup({ username, email, fullName, password }) {
  return authFetch("/users/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      full_name: fullName,
      password,
    }),
  });
}

export function login(usernameOrEmail, password) {
  return authFetch("/users/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username_or_email: usernameOrEmail,
      password,
    }),
  });
}

export function googleLogin(token) {
  return authFetch("/users/auth/google/login", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/users/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(await parseErrorResponse(res));
    }
    return true;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/users/auth/me`, {
    credentials: "include",
  });

  if (res.status === 401) {
    try {
      await refreshSession();
    } catch {
      return null;
    }

    const retry = await fetch(`${API_BASE}/users/auth/me`, {
      credentials: "include",
    });
    if (retry.status === 401) return null;
    if (!retry.ok) throw new Error(await parseErrorResponse(retry));
    return retry.json();
  }

  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export function editProfile({ username, email, fullName }) {
  return authFetch("/users/auth/edit-profile", {
    method: "PATCH",
    body: JSON.stringify({
      username,
      email,
      full_name: fullName,
    }),
  });
}

function guessImageType(file) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return types[ext] || "image/jpeg";
}

export async function uploadProfileImage(file) {
  const contentType = guessImageType(file);
  const { file_key, upload_url } = await authFetch("/users/auth/profile-photo-upload/initiate", {
    method: "POST",
    body: JSON.stringify({
      content_type: contentType,
    }),
  });

  let uploaded = false;
  try {
    const directRes = await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
      },
    });
    uploaded = directRes.ok;
  } catch {
    uploaded = false;
  }

  if (!uploaded) {
    const formData = new FormData();
    formData.append("file_key", file_key);
    formData.append("file", file);

    const proxyRes = await fetch(`${API_BASE}/users/auth/profile-photo-upload/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!proxyRes.ok) {
      throw new Error(await parseErrorResponse(proxyRes));
    }
  }

  const { profile_image_url } = await authFetch("/users/auth/profile-photo-upload/complete", {
    method: "POST",
    body: JSON.stringify({ file_key }),
  });
  return profile_image_url;
}

export function logout() {
  return authFetch("/users/auth/logout", { method: "POST" });
}
