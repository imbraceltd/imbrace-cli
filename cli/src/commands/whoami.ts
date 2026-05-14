import { Command, Flags } from "@oclif/core";
import { getAuthInfo } from "../config.js";

export default class Whoami extends Command {
  static description = "Show current login info (active profile + credentials)";

  static examples = ["imbrace whoami", "imbrace whoami --json"];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
    profile: Flags.string({ description: "Show info for a specific profile (default: active profile)" }),
  };

  async run() {
    const { flags } = await this.parse(Whoami);
    if (flags.profile) process.env.IMBRACE_PROFILE = flags.profile;
    const info = getAuthInfo();

    if (!info.credential) {
      this.error(`Not logged in for profile "${info.profile}". Run: imbrace login --help`);
    }

    if (flags.json) {
      this.log(JSON.stringify({
        profile: info.profile,
        email: info.email || null,
        method: info.method,
        env: info.env || "stable",
        organization_id: info.organization_id || null,
        authenticated: true,
      }, null, 2));
      return;
    }

    this.log(`\n  Profile:       ${info.profile}`);
    this.log(`  Email:         ${info.email || "(api-key)"}`);
    this.log(`  Method:        ${info.method}`);
    this.log(`  Environment:   ${info.env || "stable"}`);
    if (info.organization_id) this.log(`  Organization:  ${info.organization_id}`);
    this.log(`  Status:        authenticated\n`);
  }
}
