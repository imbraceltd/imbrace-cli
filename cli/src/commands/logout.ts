import { Command, Flags } from "@oclif/core";
import { clearCredential, resolveProfileName } from "../config.js";

export default class Logout extends Command {
  static description = "Logout and clear saved credentials for the active (or named) profile";

  static examples = [
    "imbrace logout",
    "imbrace logout --profile work",
  ];

  static flags = {
    profile: Flags.string({ description: "Profile to clear (default: active)" }),
  };

  async run() {
    const { flags } = await this.parse(Logout);
    const name = resolveProfileName(flags.profile);
    if (flags.profile) process.env.IMBRACE_PROFILE = flags.profile;
    clearCredential();
    this.log(`✅ Logged out (profile: ${name}). Credentials cleared.`);
  }
}
