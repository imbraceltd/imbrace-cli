import { Command, Flags } from "@oclif/core";
import { ImbraceClient } from "@imbrace/sdk";
import { resolveProfileName, setProfile, type SdkEnvironment } from "../config.js";
import { resetClient } from "../lib/client.js";

export default class Login extends Command {
  static description = "Login to Imbrace platform (writes credentials into a profile — default is 'default')";

  static examples = [
    "imbrace login --api-key api_xxx...",
    "imbrace login --api-key api_xxx... --profile work",
    "imbrace login --email user@example.com --password mypass --profile personal",
  ];

  static flags = {
    email: Flags.string({ char: "e", description: "Email address" }),
    password: Flags.string({ char: "p", description: "Password" }),
    "api-key": Flags.string({ char: "k", description: "API key (starts with api_ or sk-)" }),
    profile: Flags.string({
      description: "Profile to write credentials to (default: active profile, or 'default')",
    }),
    env: Flags.string({
      description: "SDK environment (default: stable)",
      options: ["stable", "sandbox", "develop", "prodv2"],
    }),
    "org-id": Flags.string({ description: "Organization ID" }),
    timeout: Flags.integer({ description: "Request timeout in ms (default: 30000)" }),
  };

  async run() {
    const { flags } = await this.parse(Login);
    const profile = resolveProfileName(flags.profile);
    const env = flags.env as SdkEnvironment | undefined;

    if (flags["api-key"]) {
      this.log(`🔑 Verifying API key for profile "${profile}"...`);
      try {
        const opts: any = { apiKey: flags["api-key"] };
        if (env) opts.env = env;
        if (flags["org-id"]) opts.organizationId = flags["org-id"];
        if (typeof flags.timeout === "number") opts.timeout = flags.timeout;
        const client = new ImbraceClient(opts);
        await client.boards.list();
        setProfile(profile, {
          credential: flags["api-key"],
          method: "api-key",
          env,
          organization_id: flags["org-id"],
          ...(typeof flags.timeout === "number" && { timeout: flags.timeout }),
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
        const opts: any = {};
        if (env) opts.env = env;
        if (flags["org-id"]) opts.organizationId = flags["org-id"];
        if (typeof flags.timeout === "number") opts.timeout = flags.timeout;
        const client = new ImbraceClient(opts);
        await client.login(flags.email, flags.password);
        const token = (client as any).tokenManager?.getToken();
        if (!token) this.error("Login succeeded but no token was issued");
        setProfile(profile, {
          credential: token,
          method: "password",
          email: flags.email,
          env,
          organization_id: flags["org-id"],
          ...(typeof flags.timeout === "number" && { timeout: flags.timeout }),
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
