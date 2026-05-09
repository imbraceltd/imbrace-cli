import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class DocumentAiGet extends BaseCommand {
  static description = "Get details of a Document AI agent (including extraction schema)";

  static examples = [
    "imbrace document-ai get <agentId>",
    "imbrace document-ai get <agentId> --json",
  ];

  static args = {
    id: Args.string({ description: "Document AI agent ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DocumentAiGet);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    try {
      const client = getClient();
      const data = await client.documentAi.getAgent(id);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const a: any = data || {};
      this.log(`\n  ID:           ${a._id || a.id || ""}`);
      this.log(`  Name:         ${a.name || ""}`);
      this.log(`  Model:        ${a.model_id || ""}`);
      this.log(`  Provider ID:  ${a.provider_id || ""}`);
      this.log(`  Workflow:     ${a.workflow_name || ""}`);
      if (a.data_schema) {
        this.log(`  Schema fields: ${Object.keys(a.data_schema).join(", ")}`);
      }
      if (a.instructions) {
        this.log(`  Instructions: ${String(a.instructions).slice(0, 80)}${a.instructions.length > 80 ? "..." : ""}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
