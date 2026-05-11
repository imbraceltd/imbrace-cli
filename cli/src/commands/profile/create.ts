import { Args, Command, Flags } from "@oclif/core";
import { ImbraceClient } from "@imbrace/sdk";
import { profileExists, setProfile, type SdkEnvironment } from "../../config.js";

export default class ProfileCreate extends Command {
  static description = "Create a new profile (verifies the credential against the platform)";

  static examples = [
    "imbrace profile create work --api-key api_xxx...",
    "imbrace profile create dev --api-key api_yyy... --env sandbox",
    "imbrace profile create prod --api-key api_zzz... --org-id org_xxx --json",
  ];

  static args = {
    name: Args.string({ description: "Profile name (e.g. 'work', 'dev', 'sandbox')", required: true }),
  };

  static flags = {
    "api-key": Flags.string({ description: "API key (api_... or sk-...)", required: true }),
    env: Flags.string({
      description: "SDK environment preset (default: stable)",
      options: ["stable", "sandbox", "develop", "prodv2"],
    }),
    "base-url": Flags.string({ description: "Override gateway base URL (advanced — bypasses env preset)" }),
    "org-id": Flags.string({ description: "Organization ID — sent as x-organization-id header on every request" }),
    timeout: Flags.integer({ description: "Request timeout in ms (default: 30000)" }),
    "check-health": Flags.boolean({ description: "Ping /global/health on client init (default: false)" }),
    services: Flags.string({ description: "Per-service URL override as JSON (advanced — e.g. '{\"ai\":\"https://...\"}')" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    force: Flags.boolean({ description: "Skip credential verification" }),
  };

  async run() {
    const { args, flags } = await this.parse(ProfileCreate);

    if (profileExists(args.name)) {
      this.error(`Profile "${args.name}" already exists. Use 'profile use ${args.name}' to switch or delete first.`);
    }

    let services: Record<string, string> | undefined;
    if (flags.services) {
      try { services = JSON.parse(flags.services); }
      catch (e: any) { this.error(`--services is not valid JSON: ${e.message}`); }
    }

    // Verify the credential works before saving — avoids confusing 401s later.
    if (!flags.force) {
      try {
        const opts: any = { apiKey: flags["api-key"] };
        if (flags.env) opts.env = flags.env;
        if (flags["base-url"]) opts.baseUrl = flags["base-url"];
        if (flags["org-id"]) opts.organizationId = flags["org-id"];
        if (typeof flags.timeout === "number") opts.timeout = flags.timeout;
        if (services) opts.services = services;
        const client = new ImbraceClient(opts);
        await client.boards.list();
      } catch (error: any) {
        this.error(`Credential verification failed: ${error.message}\n  Pass --force to skip this check.`);
      }
    }

    setProfile(args.name, {
      credential: flags["api-key"],
      method: "api-key",
      env: flags.env as SdkEnvironment | undefined,
      base_url: flags["base-url"],
      organization_id: flags["org-id"],
      ...(typeof flags.timeout === "number" && { timeout: flags.timeout }),
      ...(typeof flags["check-health"] === "boolean" && { check_health: flags["check-health"] }),
      ...(services && { services }),
    });

    const message = `Profile "${args.name}" created`;
    if (flags.json) {
      this.log(JSON.stringify({ ok: true, message, profile: args.name }, null, 2));
      return;
    }

    this.log(`\n✅ ${message}`);
    this.log(`\n  Use it:    imbrace profile use ${args.name}`);
    this.log(`  Per-call:  imbrace --profile ${args.name} workflow list\n`);
  }
}
