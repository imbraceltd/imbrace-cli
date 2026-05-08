// Direct gateway fetch for routes the SDK doesn't expose (e.g. workflow-agent
// system models, raw assistant fetch for PUT-merge).
import { getCredential } from "../config.js";

export const GW = "https://app-gatewayv2.imbrace.co";

function authHeader(): Record<string, string> {
  const cred = getCredential();
  if (!cred) throw new Error("Not logged in. Run: imbrace login --api-key api_xxx...");
  return cred.startsWith("api_") ? { "x-api-key": cred } : { authorization: `Bearer ${cred}` };
}

export async function gatewayFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GW}${path}`, {
    ...init,
    headers: { ...authHeader(), ...(init?.headers as any) },
  });
  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
  return res.json() as Promise<T>;
}

// System provider only exposes one model "Default" via /workflow-agent endpoint.
// Empty/error → fall back to ["Default"] so create commands still work.
export async function fetchSystemModels(): Promise<string[]> {
  try {
    const j = await gatewayFetch<any>("/ai/v3/workflow-agent/models");
    const arr = j?.data || j?.message?.data || [];
    return arr.map((m: any) => (typeof m === "string" ? m : m.name)).filter(Boolean);
  } catch {
    return ["Default"];
  }
}
