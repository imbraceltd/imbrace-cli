import { Args, Command, Flags } from "@oclif/core";
import { config, getProfile, profileExists, setProfile, deleteProfile } from "../../config.js";

export default class ProfileRename extends Command {
  static description = "Rename a profile (preserves credentials + active state)";

  static examples = [
    "imbrace profile rename old new",
  ];

  static args = {
    from: Args.string({ description: "Existing profile name", required: true }),
    to: Args.string({ description: "New profile name", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(ProfileRename);
    if (args.from === args.to) this.error("Source and destination names are identical.");
    if (!profileExists(args.from)) this.error(`Profile "${args.from}" does not exist.`);
    if (profileExists(args.to)) this.error(`Profile "${args.to}" already exists.`);
    const src = getProfile(args.from);

    // Capture active state BEFORE deletion (deleteProfile auto-resets active
    // when it removes the currently-active profile).
    const wasActive = config.get("active_profile") === args.from;
    setProfile(args.to, src);
    deleteProfile(args.from);
    if (wasActive) config.set("active_profile", args.to);

    const message = `Renamed "${args.from}" → "${args.to}"`;
    if (flags.json) {
      this.log(JSON.stringify({ ok: true, message }, null, 2));
      return;
    }
    this.log(`\n✅ ${message}\n`);
  }
}
