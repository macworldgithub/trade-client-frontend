// Browser requests stay on the frontend origin; Next proxies them to NestJS.
export const API_URL = "/api/v1";
let csrfToken: string | null = null;
let pendingCsrf: Promise<string> | null = null;
let pendingRefresh: Promise<boolean> | null = null;
let sessionGeneration = 0;

async function csrf() {
  if (csrfToken) return csrfToken;
  if (!pendingCsrf) {
    pendingCsrf = (async () => {
      const response = await fetch(`${API_URL}/auth/csrf`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status >= 500
        ? "The sign-in service is temporarily unavailable. Please retry in a moment."
        : "Unable to initialize session security. Please refresh and retry.");
      const result = await response.json().catch(() => null) as { csrfToken?: string } | null;
      if (!result?.csrfToken) throw new Error("The sign-in service returned an invalid response. Please retry.");
      csrfToken = result.csrfToken;
      return result.csrfToken;
    })().finally(() => { pendingCsrf = null; });
  }
  return pendingCsrf;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase());
  const perform = async () => {
    const headers = new Headers(init.headers);
    if (unsafe) headers.set("X-CSRF-Token", await csrf());
    return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  };
  let response = await perform();
  if (unsafe && response.status === 403) {
    const error = await response.clone().json().catch(() => ({})) as { code?: string };
    if (error.code === "CSRF_INVALID") {
      csrfToken = null;
      response = await perform();
    }
  }
  return response;
}

async function refreshSession() {
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      const response = await send("/auth/refresh", { method: "POST" });
      if (response.ok) sessionGeneration++;
      return response.ok;
    })().finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

export type ApiOptions = RequestInit & { auth?: boolean };
async function request(path: string, options: ApiOptions = {}) {
  const { auth = true, ...init } = options;
  const generation = sessionGeneration;
  let response = await send(path, init);
  if (response.status === 401 && auth && !path.startsWith("/auth/refresh")) {
    // The browser lock also serializes refresh rotation across open tabs.
    const rotate = async () => {
      const current = await send(path, init);
      if (current.status !== 401) return current;
      return await refreshSession() ? send(path, init) : current;
    };
    if (generation !== sessionGeneration) response = await send(path, init);
    else if (typeof navigator !== "undefined" && navigator.locks) response = await navigator.locks.request("trade-session-refresh", rotate);
    else if (await refreshSession()) response = await send(path, init);
  }
  if (!response.ok) {
    const body = await response.text();
    let message = body || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) message = parsed.message.join(", ");
      else if (parsed.message) message = parsed.message;
    } catch {}
    throw new Error(message);
  }
  return response;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const response = await request(path, { ...options, headers });
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

export async function downloadFile(path: string, defaultFilename = "export.csv", options: ApiOptions = {}): Promise<void> {
  const response = await request(path, options);
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  let filename = defaultFilename;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1].trim();
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
