import { Command } from "@oclif/core";
import { select, input, password } from "@inquirer/prompts";
import { getCredential, saveCredential, config } from "./config.js";
import { apiRequest } from "./http.js";

export abstract class BaseCommand extends Command {
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

    let body: any;

    if (method === "api-key") {
      const apiKey = await input({ message: "API Key (sk-...):" });
      body = { apiKey };
    } else {
      const email = await input({ message: "Email:" });
      const pass = await password({ message: "Password:" });
      body = { email, password: pass };
    }

    try {
      const res = await apiRequest<{
        ok: boolean;
        method: string;
        credential: string;
        email?: string;
        message: string;
      }>("/auth/login", { method: "POST", body });

      saveCredential({
        credential: res.credential,
        method: res.method as "api-key" | "password",
        email: res.email,
      });

      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Login failed: ${error.message}`);
    }
  }
}
