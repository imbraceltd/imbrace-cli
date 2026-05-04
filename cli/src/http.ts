import { getCredential, getApiUrl } from "./config.js";

/**
 * HTTP client gọi Hono API
 * Tự động attach Bearer token từ config
 */
export async function apiRequest<T = any>(
  path: string,
  opts?: {
    method?: string;
    body?: any;
  },
): Promise<T> {
  const credential = getCredential();
  const baseUrl = getApiUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (credential) {
    headers["Authorization"] = `Bearer ${credential}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: opts?.method || "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}

export async function apiRequestText(path: string): Promise<string> {
  const credential = getCredential();
  const baseUrl = getApiUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (credential) {
    headers["Authorization"] = `Bearer ${credential}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { method: "GET", headers });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}



