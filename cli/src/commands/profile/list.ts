import { Command, Flags } from "@oclif/core";
import { listProfiles } from "../../config.js";

export default class ProfileList extends Command {
  static description = "List all saved profiles (AWS-style multi-account credential sets)";

  static examples = [
    "imbrace profile list",
    "imbrace profile list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(ProfileList);
    const profiles = listProfiles();

    if (flags.json) {
      this.log(JSON.stringify({ ok: true, count: profiles.length, profiles }, null, 2));
      return;
    }

    if (profiles.length === 0) {
      this.log("\n  No profiles yet. Create one:\n    imbrace profile create default --api-key api_xxx...\n");
      return;
    }

    this.log(`\n  ${profiles.length} profile(s):\n`);
    this.log("    NAME                 ENV       STATUS / EMAIL");
    this.log("  ───────────────────────────────────────────────────────────────");
    for (const p of profiles) {
      const marker = p.active ? "* " : "  ";
      const name = p.name.padEnd(20);
      const env = (p.data.env || "stable").padEnd(9);
      const status = !p.data.credential
        ? "(logged out — run `imbrace login --profile " + p.name + "`)"
        : (p.data.email || "(api-key)");
      this.log(`  ${marker}${name} ${env} ${status}`);
    }
    this.log(`\n  * = active. Switch: imbrace profile use <name>  •  Delete: imbrace profile delete <name>\n`);
  }
}
