import { Command, Flags } from "@oclif/core";
import { getAuthInfo } from "../config.js";

export default class Whoami extends Command {
  static description = "Show current login info";

  static examples = ["imbrace whoami", "imbrace whoami --json"];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(Whoami);
    const info = getAuthInfo();

    if (!info.credential) {
      this.error("Not logged in. Run: imbrace login --help");
    }

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            email: info.email || null,
            method: info.method,
            apiUrl: info.apiUrl,
            authenticated: true,
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`\n  Email:    ${info.email || "(api-key)"}`);
    this.log(`  Method:   ${info.method}`);
    this.log(`  API URL:  ${info.apiUrl}`);
    this.log(`  Status:   authenticated\n`);
  }
}
