export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export type ApiOptions = RequestInit & { auth?: boolean };
export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { auth = true, headers, ...init } = options;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("trade_access_token")
      : null;
  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  if (response.status === 401 && auth && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("trade_refresh_token");
    if (refreshToken && !path.includes("/auth/refresh")) {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
      if (refreshed.ok) {
        const session = (await refreshed.json()) as { accessToken?: string; refreshToken?: string };
        if (session.accessToken) localStorage.setItem("trade_access_token", session.accessToken);
        if (session.refreshToken) localStorage.setItem("trade_refresh_token", session.refreshToken);
        response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`, ...headers }, cache: "no-store" });
      }
    }
  }
  if (!response.ok) {
    const body = await response.text();
    let message = body || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) message = parsed.message.join(", ");
      else if (parsed.message) message = parsed.message;
    } catch {
      // Keep the plain response when the API does not return JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function money(cents?: number | null) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}
export function shortDate(value?: string | Date) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
