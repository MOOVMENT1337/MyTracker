export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  constructor(status, error = {}) {
    super(error.message || `HTTP ${status}`);
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        "X-Tracker-Browser": "1",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Cannot connect to server",
    });
  }
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("tracker-session-expired"));
    throw new ApiError(response.status, payload?.error);
  }
  if (response.status !== 204 && !payload)
    throw new ApiError(502, { code: "INVALID_RESPONSE" });
  return payload;
}

export async function data(path, options) {
  return (await request(path, options))?.data;
}
export async function list(path, query = {}, signal) {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry !== "" && entry != null && entry !== false)
          params.append(key, entry);
      }
    }
    params.set("limit", "100");
    params.set("offset", String(offset));
    const page = await request(`${path}?${params}`, { signal });
    items.push(...page.data);
    if (
      page.pagination?.total !== undefined
        ? items.length >= page.pagination.total
        : page.data.length < 100
    )
      break;
  }
  return items;
}

export function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== "" && item != null && item !== false)
        params.append(key, item);
    }
  return params.toString();
}
