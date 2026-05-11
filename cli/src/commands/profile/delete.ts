import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";
import { deleteProfile, profileExists } from "../../config.js";

export default class ProfileDelete extends Command {
  static description = "Delete a profile (does not affect data on the platform — only local credentials)";

  static examples = [
    "imbrace profile delete dev --yes",
  ];

  static args = {
    name: Args.string({ description: "Profile name to delete", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(ProfileDelete);

    if (!profileExists(args.name)) {
      this.error(`Profile "${args.name}" does not exist.`);
    }

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete profile "${args.name}"?`, default: false });
      if (!ok) { this.log("Cancelled."); return; }
    }

    deleteProfile(args.name);

    const message = `Profile "${args.name}" deleted`;
    if (flags.json) {
      this.log(JSON.stringify({ ok: true, message }, null, 2));
      return;
    }
    this.log(`\n✅ ${message}\n`);
  }
}
