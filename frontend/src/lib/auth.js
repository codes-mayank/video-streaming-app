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

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/users/auth/me`, {
    credentials: "include",
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await parseErrorResponse(res));

  return res.json();
}

export function logout() {
  return authFetch("/users/auth/logout", { method: "POST" });
}
