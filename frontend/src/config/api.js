/** Central API config — set VITE_API_BASE_URL in frontend/.env */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_ORIGIN =
  API_BASE_URL.replace(/\/api\/?$/, "") || "http://localhost:5000";

/** Build absolute URL for uploaded assets (/uploads/...) */
export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

/** Server-Sent Events (EventSource cannot use axios interceptors) */
export function sseUrl(pathWithQuery) {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${API_ORIGIN}${path}`;
}
