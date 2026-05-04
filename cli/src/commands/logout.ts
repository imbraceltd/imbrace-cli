import { Command } from "@oclif/core";
import { clearCredential } from "../config.js";

export default class Logout extends Command {
  static description = "Logout and clear saved credentials";

  static examples = ["imbrace logout"];

  async run() {
    clearCredential();
    this.log("✅ Logged out. Credentials cleared.");
  }
}
