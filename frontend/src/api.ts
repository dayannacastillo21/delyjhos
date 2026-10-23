export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
let accessToken = "";
export function setAccessToken(value: string) {
  accessToken = value;
}
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && accessToken) {
      accessToken = "";
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("delyjhos-session-expired"));
    }
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (e: { loc?: string[]; msg?: string }) =>
                  `${e.loc?.filter((x) => x !== "body").join(".") || "Datos"}: ${e.msg}`,
              )
              .join("; ")
          : "No se pudo completar la solicitud";
    throw new Error(message);
  }
  return data as T;
}
export const assetUrl = (value?: string | null) =>
  value?.startsWith("/uploads/") ? API_BASE + value : value || "";
export type ApiStatus = { status: string; service: string };
export const getApiStatus = (signal?: AbortSignal) =>
  api<ApiStatus>("/", { signal });
export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};
export type RecordData = Record<string, unknown> & { id: number };
