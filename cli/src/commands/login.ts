import { Command, Flags } from "@oclif/core";
import { ImbraceClient } from "@imbrace/sdk";
import { saveCredential } from "../config.js";
import { resetClient } from "../lib/client.js";

export default class Login extends Command {
  static description = "Login to Imbrace platform";

  static examples = [
    "imbrace login --email user@example.com --password mypass",
    "imbrace login --api-key api_xxx...",
  ];

  static flags = {
    email: Flags.string({ char: "e", description: "Email address" }),
    password: Flags.string({ char: "p", description: "Password" }),
    "api-key": Flags.string({ char: "k", description: "API key (starts with api_ or sk-)" }),
  };

  async run() {
    const { flags } = await this.parse(Login);

    if (flags["api-key"]) {
      this.log("🔑 Verifying API key...");
      try {
        const client = new ImbraceClient({ apiKey: flags["api-key"] });
        // Lightweight verification — list boards rejects an invalid key.
        await client.boards.list();
        saveCredential({ credential: flags["api-key"], method: "api-key" });
        resetClient();
        this.log(`\n✅ Authenticated with API key\n   Method: api-key\n`);
      } catch (error: any) {
        this.error(`Invalid API key: ${error?.message}`);
      }
      return;
    }

    if (flags.email && flags.password) {
      this.log(`📧 Logging in as ${flags.email}...`);
      try {
        const client = new ImbraceClient();
        await client.login(flags.email, flags.password);
        // Internal: read the access token the SDK just stored.
        const token = (client as any).tokenManager?.getToken();
        if (!token) this.error("Login succeeded but no token was issued");
        saveCredential({ credential: token, method: "password", email: flags.email });
        resetClient();
        this.log(`\n✅ Logged in as ${flags.email}\n   Method: password\n`);
      } catch (error: any) {
        this.error(`Login failed: ${error?.message}`);
      }
      return;
    }

    this.error(
      "Provide --email + --password, or --api-key\n" +
        "  imbrace login --api-key api_xxx...\n" +
        "  imbrace login --email user@example.com --password mypass",
    );
  }
}
