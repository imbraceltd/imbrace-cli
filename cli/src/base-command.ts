import { Command, Flags } from "@oclif/core";
import { select, input, password } from "@inquirer/prompts";
import { ImbraceClient } from "@imbrace/sdk";
import { getProfile, resolveProfileName, setProfile } from "./config.js";
import { resetClient } from "./lib/client.js";

export abstract class BaseCommand extends Command {
  // Enable -h as alias for --help on every command, plus --profile so the
  // user can target any saved profile per-call (overrides IMBRACE_PROFILE
  // env var and the active_profile setting).
  static baseFlags = {
    help: Flags.help({ char: "h", description: "Show help for the command" }),
    profile: Flags.string({
      description: "Profile to use for this command. Overrides IMBRACE_PROFILE env + active_profile setting.",
      helpGroup: "GLOBAL",
    }),
  };

  // Pin the resolved profile name for the duration of `init()` so child
  // commands that read it later see the same value.
  protected profileName!: string;

  async init() {
    await super.init();
    // The base flag is parseable, but oclif only exposes parsed flags after
    // the subclass's own parse(). Read it from argv directly so init can act
    // before the command body.
    const pIdx = this.argv.findIndex((a) => a === "--profile");
    const explicit = pIdx >= 0 && this.argv[pIdx + 1] ? this.argv[pIdx + 1] : undefined;
    this.profileName = resolveProfileName(explicit);
    if (explicit) process.env.IMBRACE_PROFILE = explicit;
    await this.ensureLoggedIn();
  }

  private async ensureLoggedIn() {
    const p = getProfile(this.profileName);
    if (p.credential) return;

    this.log(`\n⚠️  Not logged in for profile "${this.profileName}". Please login first.\n`);

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
        setProfile(this.profileName, { credential: apiKey, method: "api-key" });
      } else {
        const email = await input({ message: "Email:" });
        const pass = await password({ message: "Password:" });
        const client = new ImbraceClient();
        await client.login(email, pass);
        const token = (client as any).tokenManager?.getToken();
        if (!token) throw new Error("No token issued");
        setProfile(this.profileName, { credential: token, method: "password", email });
      }
      resetClient();
      this.log(`\n✅ Logged in (profile: ${this.profileName})\n`);
    } catch (error: any) {
      this.error(`Login failed: ${error.message}`);
    }
  }
}
