// Direct gateway fetch for routes the SDK doesn't expose (e.g. workflow-agent
// system models, raw assistant fetch for PUT-merge).
//
// Honors the active profile's env / base_url so sandbox/develop/prodv2 users
// hit the correct gateway. Pulls URLs from the SDK's ENVIRONMENTS table to
// avoid drift — if SDK adds a new env or moves a host, CLI picks it up after
// `npm install @imbrace/sdk@latest`.

import { ENVIRONMENTS } from "@imbrace/sdk";
import { getCredential, getProfile, type SdkEnvironment } from "../config.js";

// Resolve gateway URL from active profile. Precedence: explicit base_url >
// env preset > "stable" fallback.
function resolveGateway(): string {
  const p = getProfile();
  if (p.base_url) return p.base_url.replace(/\/$/, "");
  const env: SdkEnvironment = (p.env as SdkEnvironment) || "stable";
  return (ENVIRONMENTS[env]?.gateway || ENVIRONMENTS.stable.gateway).replace(/\/$/, "");
}

// Back-compat export — points at the active profile's gateway. Callers that
// import `GW` get the right URL automatically.
export const GW = resolveGateway();

function authHeader(): Record<string, string> {
  const cred = getCredential();
  if (!cred) throw new Error("Not logged in. Run: imbrace login --api-key api_xxx...");
  // Match the same detection logic as `lib/client.ts` — both `api_*` and
  // legacy `sk-*` are server-side keys, anything else is a JWT/access token.
  const isApiKey = cred.startsWith("api_") || cred.startsWith("sk-");
  return isApiKey ? { "x-api-key": cred } : { authorization: `Bearer ${cred}` };
}

export async function gatewayFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveGateway();
  const res = await fetch(`${base}${path}`, {
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
