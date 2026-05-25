import { Command, Flags } from "@oclif/core";
import { execSync } from "child_process";

export default class Update extends Command {
  static description = "Update the Imbrace CLI to the latest version";

  static examples = [
    "imbrace update",
    "imbrace update --check",
    "imbrace update --version 0.6.5",
  ];

  static flags = {
    check: Flags.boolean({ char: "c", description: "Check for updates without installing" }),
    version: Flags.string({ description: "Install a specific version instead of latest" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(Update);

    const current = this.config.version;
    let latest: string;

    try {
      latest = execSync("npm view @imbrace/cli version 2>/dev/null", { encoding: "utf8" }).trim();
    } catch {
      this.error("Could not reach npm registry. Check your internet connection.");
    }

    const target = flags.version ?? latest;
    const isUpToDate = current === latest && !flags.version;

    if (flags.check) {
      const result = { current, latest, up_to_date: isUpToDate };
      if (flags.json) {
        this.log(JSON.stringify(result, null, 2));
      } else {
        this.log(`\n  Current version:  ${current}`);
        this.log(`  Latest version:   ${latest}`);
        this.log(isUpToDate ? "  Status:           up to date ✓\n" : `  Status:           update available → ${latest}\n`);
      }
      return;
    }

    if (isUpToDate) {
      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message: `Already on latest version ${current}`, current, latest }));
      } else {
        this.log(`\n  Already on latest version ${current} ✓\n`);
      }
      return;
    }

    if (!flags.json) {
      this.log(`\n  Updating @imbrace/cli ${current} → ${target} …\n`);
    }

    try {
      execSync(`npm install -g @imbrace/cli@${target}`, { stdio: flags.json ? "pipe" : "inherit" });
    } catch (err: any) {
      this.error(`Update failed: ${err.message}`);
    }

    if (flags.json) {
      this.log(JSON.stringify({ ok: true, message: `Updated to ${target}`, from: current, to: target }));
    } else {
      this.log(`\n  ✅ Updated to @imbrace/cli@${target}\n`);
    }
  }
}
