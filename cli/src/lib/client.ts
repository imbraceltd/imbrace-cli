import { ImbraceClient } from "@imbrace/sdk";
import { getProfile, resolveProfileName } from "../config.js";

let cachedClient: ImbraceClient | null = null;
let cachedProfileName: string | null = null;

/**
 * Build an authenticated ImbraceClient from the active profile.
 *
 * Resolution order: explicit `--profile <name>` flag > IMBRACE_PROFILE env var
 * > `active_profile` in config > "default".
 *
 * The SDK accepts apiKey or accessToken plus an optional environment
 * (`stable` | `sandbox` | `develop`) and `organizationId`. Each profile maps
 * 1:1 to a separate ImbraceClient instance.
 */
export function getClient(profileName?: string): ImbraceClient {
  const name = resolveProfileName(profileName);

  // Re-build if profile switched mid-process (e.g. tests).
  if (cachedClient && cachedProfileName === name) return cachedClient;

  const p = getProfile(name);
  if (!p.credential) {
    throw new Error(
      `Not logged in for profile "${name}". Run: imbrace login --api-key api_xxx... [--profile ${name}]`,
    );
  }

  const isApiKey = p.credential.startsWith("sk-") || p.credential.startsWith("api_");
  const opts: any = isApiKey ? { apiKey: p.credential } : { accessToken: p.credential };
  if (p.env) opts.env = p.env;
  if (p.base_url) opts.baseUrl = p.base_url;
  if (p.organization_id) opts.organizationId = p.organization_id;
  if (typeof p.timeout === "number") opts.timeout = p.timeout;
  if (p.services && Object.keys(p.services).length) opts.services = p.services;
  if (typeof p.check_health === "boolean") opts.checkHealth = p.check_health;

  cachedClient = new ImbraceClient(opts);
  cachedProfileName = name;
  return cachedClient;
}

export function resetClient() {
  cachedClient = null;
  cachedProfileName = null;
}
