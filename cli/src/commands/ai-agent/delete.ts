import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input, confirm } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class AiAgentDelete extends BaseCommand {
  static description = "Delete an AI agent";

  static examples = [
    "imbrace ai-agent delete <id> --yes --json",
  ];

  static args = {
    id: Args.string({ description: "Agent ID" }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(AiAgentDelete);

    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    if (!flags.yes) {
      const ok = await confirm({ message: `Delete agent ${id}?`, default: false });
      if (!ok) { this.log("Cancelled."); return; }
    }

    try {
      const client = getClient();
      await client.agent.delete(id);
      const message = "AI Agent deleted";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
