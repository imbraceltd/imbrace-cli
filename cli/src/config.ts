import Conf from "conf";

interface ImbraceConfig {
  credential?: string;
  method?: "api-key" | "password";
  email?: string;
  apiUrl?: string;
}

/**
 * Saves credentials to ~/.config/imbrace/config.json
 * Uses `conf` package — cross-platform, auto-create
 */
export const config = new Conf<ImbraceConfig>({
  projectName: "imbrace",
  defaults: {
    apiUrl: "http://localhost:3456",
  },
});

export function saveCredential(opts: {
  credential: string;
  method: "api-key" | "password";
  email?: string;
}) {
  config.set("credential", opts.credential);
  config.set("method", opts.method);
  if (opts.email) config.set("email", opts.email);
}

export function getCredential(): string | undefined {
  return config.get("credential");
}

export function getApiUrl(): string {
  return config.get("apiUrl") || "http://localhost:3456";
}

export function clearCredential() {
  config.delete("credential");
  config.delete("method");
  config.delete("email");
}

export function getAuthInfo() {
  return {
    credential: config.get("credential"),
    method: config.get("method"),
    email: config.get("email"),
    apiUrl: config.get("apiUrl"),
  };
}
