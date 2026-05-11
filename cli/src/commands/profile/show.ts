import { Args, Command, Flags } from "@oclif/core";
import { getProfile, profileExists, resolveProfileName } from "../../config.js";

export default class ProfileShow extends Command {
  static description = "Show details of a profile (defaults to the active one)";

  static examples = [
    "imbrace profile show",
    "imbrace profile show dev --json",
  ];

  static args = {
    name: Args.string({ description: "Profile name (default: active profile)" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(ProfileShow);
    const name = resolveProfileName(args.name);
    if (!profileExists(name)) {
      this.error(`Profile "${name}" does not exist. Run: imbrace profile list`);
    }
    const p = getProfile(name);

    if (flags.json) {
      this.log(JSON.stringify({
        ok: true,
        name,
        method: p.method,
        email: p.email || null,
        env: p.env || "stable",
        base_url: p.base_url || null,
        organization_id: p.organization_id || null,
        timeout: p.timeout ?? null,
        services: p.services || null,
        check_health: p.check_health ?? null,
        credential_preview: (p.credential || "").slice(0, 10) + "...",
      }, null, 2));
      return;
    }

    this.log(`\n  Profile:         ${name}`);
    this.log(`  Method:          ${p.method || "api-key"}`);
    this.log(`  Email:           ${p.email || "(api-key)"}`);
    this.log(`  Environment:     ${p.env || "stable"}`);
    if (p.base_url) this.log(`  Base URL:        ${p.base_url}`);
    if (p.organization_id) this.log(`  Organization:    ${p.organization_id}`);
    if (typeof p.timeout === "number") this.log(`  Timeout:         ${p.timeout} ms`);
    if (p.services) this.log(`  Services:        ${JSON.stringify(p.services)}`);
    if (typeof p.check_health === "boolean") this.log(`  Check health:    ${p.check_health}`);
    this.log(`  Credential:      ${(p.credential || "").slice(0, 10)}... (hidden)\n`);
  }
}
