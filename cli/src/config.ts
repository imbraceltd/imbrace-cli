import Conf from "conf";

export type AuthMethod = "api-key" | "password";
// Mirrors SDK `Environment` type (environments.d.ts).
export type SdkEnvironment = "stable" | "sandbox" | "develop" | "prodv2";

export interface ProfileData {
  credential?: string;
  method?: AuthMethod;
  email?: string;
  // Maps 1:1 to SDK ImbraceClientConfig fields below.
  env?: SdkEnvironment;             // → env
  base_url?: string;                // → baseUrl
  organization_id?: string;         // → organizationId
  timeout?: number;                 // → timeout (ms, default 30000)
  services?: Record<string, string>; // → services (Partial<ServiceUrls>, advanced)
  check_health?: boolean;           // → checkHealth (default false)
}

interface ImbraceConfig {
  active_profile?: string;
  profiles?: Record<string, ProfileData>;
  // ── Legacy (pre-profile) — kept for migration; migrate() clears these. ──
  credential?: string;
  method?: AuthMethod;
  email?: string;
}

/**
 * Cross-platform config via `conf` package (projectName: "imbrace").
 * Path:
 *   macOS:   ~/Library/Preferences/imbrace-nodejs/config.json
 *   Linux:   ~/.config/imbrace-nodejs/config.json
 *   Windows: %APPDATA%/imbrace-nodejs/Config/config.json
 *
 * Schema (post-migration):
 *   {
 *     "active_profile": "default",
 *     "profiles": {
 *       "default": { credential, method, email, env?, base_url?, organization_id? },
 *       "<name>":  { ... }
 *     }
 *   }
 */
export const config = new Conf<ImbraceConfig>({ projectName: "imbrace" });

export const DEFAULT_PROFILE = "default";

// Move any legacy single-credential config into a "default" profile.
// Idempotent — safe to call on every CLI invocation.
function migrate() {
  const legacy = config.get("credential");
  if (!legacy) return;
  const profiles = config.get("profiles") || {};
  if (!profiles[DEFAULT_PROFILE]) {
    profiles[DEFAULT_PROFILE] = {
      credential: legacy,
      method: config.get("method"),
      email: config.get("email"),
    };
    config.set("profiles", profiles);
    config.set("active_profile", DEFAULT_PROFILE);
  }
  config.delete("credential");
  config.delete("method");
  config.delete("email");
}
migrate();

// ─── Profile-aware resolution ────────────────────────────────────────────────

// Resolution order: explicit > env var > config > "default".
export function resolveProfileName(explicit?: string): string {
  return explicit || process.env.IMBRACE_PROFILE || config.get("active_profile") || DEFAULT_PROFILE;
}

export function getProfile(name?: string): ProfileData {
  const profileName = resolveProfileName(name);
  const profiles = config.get("profiles") || {};
  return profiles[profileName] || {};
}

export function profileExists(name: string): boolean {
  const profiles = config.get("profiles") || {};
  return Object.prototype.hasOwnProperty.call(profiles, name);
}

export function listProfiles(): Array<{ name: string; active: boolean; data: ProfileData }> {
  const profiles = config.get("profiles") || {};
  const active = config.get("active_profile") || DEFAULT_PROFILE;
  return Object.entries(profiles).map(([name, data]) => ({ name, active: name === active, data }));
}

export function setProfile(name: string, data: ProfileData) {
  const profiles = config.get("profiles") || {};
  profiles[name] = { ...profiles[name], ...data };
  config.set("profiles", profiles);
  if (!config.get("active_profile")) config.set("active_profile", name);
}

export function deleteProfile(name: string) {
  const profiles = config.get("profiles") || {};
  delete profiles[name];
  config.set("profiles", profiles);
  if (config.get("active_profile") === name) {
    const remaining = Object.keys(profiles);
    config.set("active_profile", remaining[0] || DEFAULT_PROFILE);
  }
}

export function setActiveProfile(name: string) {
  const profiles = config.get("profiles") || {};
  if (!profiles[name]) throw new Error(`Profile "${name}" does not exist. Run: imbrace profile list`);
  config.set("active_profile", name);
}

// ─── Back-compat shims (existing commands call these — keep them working) ───

export function getCredential(): string | undefined {
  return getProfile().credential;
}

export function saveCredential(opts: {
  credential: string;
  method: AuthMethod;
  email?: string;
}) {
  const name = resolveProfileName();
  setProfile(name, {
    credential: opts.credential,
    method: opts.method,
    email: opts.email,
  });
}

export function clearCredential() {
  const name = resolveProfileName();
  const profiles = config.get("profiles") || {};
  if (profiles[name]) {
    delete profiles[name].credential;
    delete profiles[name].method;
    delete profiles[name].email;
    config.set("profiles", profiles);
  }
}

export function getAuthInfo() {
  const p = getProfile();
  const name = resolveProfileName();
  return {
    profile: name,
    credential: p.credential,
    method: p.method,
    email: p.email,
    env: p.env,
    base_url: p.base_url,
    organization_id: p.organization_id,
  };
}
