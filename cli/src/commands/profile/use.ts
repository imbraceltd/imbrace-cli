import { Args, Command, Flags } from "@oclif/core";
import { setActiveProfile } from "../../config.js";

export default class ProfileUse extends Command {
  static description = "Switch the active profile (affects all subsequent commands)";

  static examples = [
    "imbrace profile use dev",
    "imbrace profile use work --json",
  ];

  static args = {
    name: Args.string({ description: "Profile name to activate", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(ProfileUse);

    try {
      setActiveProfile(args.name);
    } catch (error: any) {
      this.error(error.message);
    }

    const message = `Active profile set to "${args.name}"`;
    if (flags.json) {
      this.log(JSON.stringify({ ok: true, message, active: args.name }, null, 2));
      return;
    }
    this.log(`\n✅ ${message}\n`);
  }
}
