import Conf from "conf";

interface ImbraceConfig {
  credential?: string;
  method?: "api-key" | "password";
  email?: string;
}

/**
 * Saves credentials via the `conf` package — cross-platform, auto-create.
 * Path depends on OS:
 *   macOS:   ~/Library/Preferences/imbrace-nodejs/config.json
 *   Linux:   ~/.config/imbrace-nodejs/config.json
 *   Windows: %APPDATA%/imbrace-nodejs/Config/config.json
 */
export const config = new Conf<ImbraceConfig>({ projectName: "imbrace" });

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
  };
}
