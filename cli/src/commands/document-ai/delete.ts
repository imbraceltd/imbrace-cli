import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { confirm, input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class DocumentAiDelete extends BaseCommand {
  static description = "Delete a Document AI agent";

  static examples = [
    "imbrace document-ai delete <agentId> --yes --json",
  ];

  static args = {
    id: Args.string({ description: "Document AI agent ID" }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DocumentAiDelete);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete Document AI agent ${id}?`, default: false });
      if (!ok) { this.log("Cancelled."); return; }
    }

    try {
      const client = getClient();
      await client.documentAi.deleteAgent(id);
      const message = "Document AI Agent deleted";

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
