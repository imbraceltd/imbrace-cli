import { Command, Flags } from "@oclif/core";
import { input, password as promptPassword, select } from "@inquirer/prompts";
import { ImbraceClient } from "@imbrace/sdk";
import { resolveProfileName, setProfile, type SdkEnvironment } from "../config.js";
import { resetClient } from "../lib/client.js";

export default class Login extends Command {
  static description = "Login to Imbrace platform (writes credentials into a profile — default is 'default'). Pass no flags to prompt interactively.";

  static examples = [
    "imbrace login                                          # interactive prompt",
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

    const noAuthProvided = !flags["api-key"] && !(flags.email && flags.password);
    const isTTY = !!process.stdin.isTTY;

    // Resolve auth + non-required SDK config — fill via prompt when missing
    // and we have a TTY. Refuse to block silently in scripts (no TTY).
    let apiKey = flags["api-key"];
    let email = flags.email;
    let pass = flags.password;
    let envFlag = flags.env as SdkEnvironment | undefined;
    let profileName = flags.profile;

    if (noAuthProvided) {
      if (!isTTY) {
        this.error(
          "Missing credentials. Provide --api-key or --email + --password.\n" +
            "  imbrace login --api-key api_xxx...\n" +
            "  imbrace login --email user@example.com --password mypass",
        );
      }

      const method = await select({
        message: "Login method:",
        choices: [
          { name: "API Key (recommended for CI/CD)", value: "api-key" },
          { name: "Email + Password", value: "password" },
        ],
      });

      if (method === "api-key") {
        apiKey = await input({ message: "API Key (api_... or sk-...):" });
        if (!apiKey) this.error("API key is required.");
      } else {
        email = await input({ message: "Email:" });
        if (!email) this.error("Email is required.");
        pass = await promptPassword({ message: "Password:" });
        if (!pass) this.error("Password is required.");
      }

      // Optional profile name (default to active or "default") — let the user
      // skip by pressing Enter on the default value.
      const defaultProfile = resolveProfileName(profileName);
      const enteredProfile = await input({
        message: `Profile to save into (default: ${defaultProfile}):`,
        default: defaultProfile,
      });
      profileName = enteredProfile || defaultProfile;

      // Optional env — show the 4 SDK presets + "stable (default)" choice.
      const envChoice = await select({
        message: "SDK environment:",
        choices: [
          { name: "stable (default — app-gatewayv2.imbrace.co)", value: "stable" },
          { name: "sandbox", value: "sandbox" },
          { name: "develop", value: "develop" },
          { name: "prodv2", value: "prodv2" },
        ],
        default: envFlag || "stable",
      });
      envFlag = envChoice as SdkEnvironment;
    }

    const profile = resolveProfileName(profileName);

    let services: Record<string, string> | undefined;
    if (flags.services) {
      try { services = JSON.parse(flags.services); }
      catch (e: any) { this.error(`--services is not valid JSON: ${e.message}`); }
    }

    const buildOpts = (cred: { apiKey?: string; accessToken?: string }) => {
      const o: any = { ...cred };
      if (envFlag) o.env = envFlag;
      if (flags["base-url"]) o.baseUrl = flags["base-url"];
      if (flags["org-id"]) o.organizationId = flags["org-id"];
      if (typeof flags.timeout === "number") o.timeout = flags.timeout;
      if (typeof flags["check-health"] === "boolean") o.checkHealth = flags["check-health"];
      if (services) o.services = services;
      return o;
    };

    const profilePatch = {
      env: envFlag,
      organization_id: flags["org-id"],
      base_url: flags["base-url"],
      ...(typeof flags.timeout === "number" && { timeout: flags.timeout }),
      ...(typeof flags["check-health"] === "boolean" && { check_health: flags["check-health"] }),
      ...(services && { services }),
    };

    if (apiKey) {
      this.log(`🔑 Verifying API key for profile "${profile}"...`);
      try {
        const client = new ImbraceClient(buildOpts({ apiKey }));
        await client.boards.list();
        setProfile(profile, {
          credential: apiKey,
          method: "api-key",
          ...profilePatch,
        });
        resetClient();
        this.log(`\n✅ Authenticated (profile: ${profile})\n   Method: api-key${envFlag ? `\n   Env: ${envFlag}` : ""}\n`);
      } catch (error: any) {
        this.error(`Invalid API key: ${error?.message}`);
      }
      return;
    }

    if (email && pass) {
      this.log(`📧 Logging in as ${email} for profile "${profile}"...`);
      try {
        const client = new ImbraceClient(buildOpts({}));
        // SDK 1.1.x splits login into two phases: login() stores a short-lived
        // `login_acc_` token and returns the user's orgs; selectOrganization()
        // then swaps it for an org-scoped `acc_` token. We must complete both —
        // saving the login_acc_ token directly makes every later call 401.
        const res = await client.login(email, pass);
        // Normalize org shape across SDK versions: ≥1.2 returns
        // { organization_id, display_name }; earlier returned { id, name }.
        const orgs = (Array.isArray((res as any).organizations) ? (res as any).organizations : [])
          .map((o: any) => ({ id: o.organization_id ?? o.id, name: o.display_name ?? o.name }))
          .filter((o: any) => o.id) as Array<{ id: string; name: string }>;

        let orgId = flags["org-id"];
        if (!orgId) {
          if (orgs.length === 1) {
            orgId = orgs[0].id;
          } else if (orgs.length > 1) {
            if (!isTTY) {
              this.error(
                `Account belongs to ${orgs.length} organizations — pass --org-id <id>:\n` +
                  orgs.map((o) => `  ${o.id}  ${o.name}`).join("\n"),
              );
            }
            orgId = await select({
              message: "Select organization:",
              choices: orgs.map((o) => ({ name: `${o.name} (${o.id})`, value: o.id })),
            });
          } else {
            this.error("Login succeeded but no organizations were returned. Pass --org-id <id> explicitly.");
          }
        }

        await client.selectOrganization(orgId!);
        const token = (client as any).tokenManager?.getToken();
        if (!token) this.error("Login succeeded but no access token was issued after selecting the organization");
        setProfile(profile, {
          credential: token,
          method: "password",
          email,
          ...profilePatch,
          organization_id: orgId,
        });
        resetClient();
        this.log(`\n✅ Logged in as ${email} (profile: ${profile})\n   Org: ${orgId}${envFlag ? `\n   Env: ${envFlag}` : ""}\n`);
      } catch (error: any) {
        this.error(`Login failed: ${error?.message}`);
      }
      return;
    }

    // Should be unreachable — interactive prompt either populated apiKey or
    // email+pass, and non-interactive path errored out earlier.
    this.error(
      "Provide --email + --password, or --api-key\n" +
        "  imbrace login --api-key api_xxx...\n" +
        "  imbrace login --email user@example.com --password mypass",
    );
  }
}
