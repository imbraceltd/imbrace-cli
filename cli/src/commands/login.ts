import { Command, Flags } from "@oclif/core";
import { ImbraceClient } from "@imbrace/sdk";
import { resolveProfileName, setProfile, type SdkEnvironment } from "../config.js";
import { resetClient } from "../lib/client.js";

export default class Login extends Command {
  static description = "Login to Imbrace platform (writes credentials into a profile — default is 'default')";

  static examples = [
    "imbrace login --api-key api_xxx...",
    "imbrace login --api-key api_xxx... --profile work",
    "imbrace login --api-key api_xxx... --profile dev --env sandbox --org-id org_xxx",
    "imbrace login --email user@example.com --password mypass --profile personal",
  ];

  static flags = {
    email: Flags.string({ char: "e", description: "Email address" }),
    password: Flags.string({ char: "p", description: "Password" }),
    "api-key": Flags.string({ char: "k", description: "API key (starts with api_ or sk-)" }),

    // ── Profile target ────────────────────────────────────────────────────
    profile: Flags.string({
      description: "Profile to write credentials to (default: active profile, or 'default')",
    }),

    // ── SDK ImbraceClientConfig pass-throughs ────────────────────────────
    env: Flags.string({
      description: "SDK environment (default: stable)",
      options: ["stable", "sandbox", "develop", "prodv2"],
    }),
    "base-url": Flags.string({ description: "Override gateway base URL (advanced — bypasses env preset)" }),
    "org-id": Flags.string({ description: "Organization ID — sent as x-organization-id header" }),
    timeout: Flags.integer({ description: "Request timeout in ms (default: 30000)" }),
    "check-health": Flags.boolean({ description: "Ping /global/health on client init (default: false)" }),
    services: Flags.string({ description: "Per-service URL override as JSON (advanced — e.g. '{\"ai\":\"https://...\"}')" }),
  };

  async run() {
    const { flags } = await this.parse(Login);
    const profile = resolveProfileName(flags.profile);
    const env = flags.env as SdkEnvironment | undefined;

    let services: Record<string, string> | undefined;
    if (flags.services) {
      try { services = JSON.parse(flags.services); }
      catch (e: any) { this.error(`--services is not valid JSON: ${e.message}`); }
    }

    // Build the SDK options once — reuse for both verification and storage.
    const buildOpts = (cred: { apiKey?: string; accessToken?: string }) => {
      const o: any = { ...cred };
      if (env) o.env = env;
      if (flags["base-url"]) o.baseUrl = flags["base-url"];
      if (flags["org-id"]) o.organizationId = flags["org-id"];
      if (typeof flags.timeout === "number") o.timeout = flags.timeout;
      if (typeof flags["check-health"] === "boolean") o.checkHealth = flags["check-health"];
      if (services) o.services = services;
      return o;
    };

    const profilePatch = {
      env,
      organization_id: flags["org-id"],
      base_url: flags["base-url"],
      ...(typeof flags.timeout === "number" && { timeout: flags.timeout }),
      ...(typeof flags["check-health"] === "boolean" && { check_health: flags["check-health"] }),
      ...(services && { services }),
    };

    if (flags["api-key"]) {
      this.log(`🔑 Verifying API key for profile "${profile}"...`);
      try {
        const client = new ImbraceClient(buildOpts({ apiKey: flags["api-key"] }));
        await client.boards.list();
        setProfile(profile, {
          credential: flags["api-key"],
          method: "api-key",
          ...profilePatch,
        });
        resetClient();
        this.log(`\n✅ Authenticated (profile: ${profile})\n   Method: api-key${env ? `\n   Env: ${env}` : ""}\n`);
      } catch (error: any) {
        this.error(`Invalid API key: ${error?.message}`);
      }
      return;
    }

    if (flags.email && flags.password) {
      this.log(`📧 Logging in as ${flags.email} for profile "${profile}"...`);
      try {
        const client = new ImbraceClient(buildOpts({}));
        await client.login(flags.email, flags.password);
        const token = (client as any).tokenManager?.getToken();
        if (!token) this.error("Login succeeded but no token was issued");
        setProfile(profile, {
          credential: token,
          method: "password",
          email: flags.email,
          ...profilePatch,
        });
        resetClient();
        this.log(`\n✅ Logged in as ${flags.email} (profile: ${profile})\n`);
      } catch (error: any) {
        this.error(`Login failed: ${error?.message}`);
      }
      return;
    }

    this.error(
      "Provide --email + --password, or --api-key\n" +
        "  imbrace login --api-key api_xxx...\n" +
        "  imbrace login --email user@example.com --password mypass",
    );
  }
}
