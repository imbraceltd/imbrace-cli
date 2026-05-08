import { Command, Flags } from "@oclif/core";
import { select, input, password } from "@inquirer/prompts";
import { ImbraceClient } from "@imbrace/sdk";
import { getCredential, saveCredential } from "./config.js";
import { resetClient } from "./lib/client.js";

export abstract class BaseCommand extends Command {
  // Enable -h as alias for --help on every command (helps coding agents discover usage)
  static baseFlags = {
    help: Flags.help({ char: "h", description: "Show help for the command" }),
  };

  async init() {
    await super.init();
    await this.ensureLoggedIn();
  }

  private async ensureLoggedIn() {
    if (getCredential()) return;

    this.log("\n⚠️  You are not logged in. Please login first.\n");

    const method = await select({
      message: "Login method:",
      choices: [
        { name: "API Key (recommended for CI/CD)", value: "api-key" },
        { name: "Email + Password", value: "password" },
      ],
    });

    try {
      if (method === "api-key") {
        const apiKey = await input({ message: "API Key (api_... or sk-...):" });
        const client = new ImbraceClient({ apiKey });
        await client.boards.list();
        saveCredential({ credential: apiKey, method: "api-key" });
      } else {
        const email = await input({ message: "Email:" });
        const pass = await password({ message: "Password:" });
        const client = new ImbraceClient();
        await client.login(email, pass);
        const token = (client as any).tokenManager?.getToken();
        if (!token) throw new Error("No token issued");
        saveCredential({ credential: token, method: "password", email });
      }
      resetClient();
      this.log(`\n✅ Logged in\n`);
    } catch (error: any) {
      this.error(`Login failed: ${error.message}`);
    }
  }
}
