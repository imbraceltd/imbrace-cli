import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class DocumentAiList extends BaseCommand {
  static description = "List Document AI agents (filter by name)";

  static examples = [
    "imbrace document-ai list",
    "imbrace document-ai list --search invoice --json",
  ];

  static flags = {
    search: Flags.string({ char: "s", description: "Filter by name (case-insensitive substring)" }),
    all: Flags.boolean({ description: "Include non-Document-AI agents (default: only document_ai type)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DocumentAiList);

    try {
      const client = getClient();
      const data = await client.documentAi.listAgents({
        documentAiOnly: !flags.all,
        ...(flags.search && { nameContains: flags.search }),
      });

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} Document AI agent(s):\n`);
      this.log("  ID                                    NAME                          MODEL");
      this.log("  ────────────────────────────────────────────────────────────────────────────");
      for (const a of data) {
        const id = ((a as any)._id || (a as any).id || "").padEnd(38);
        const name = ((a as any).name || "").padEnd(28);
        const model = (a as any).model_id || "";
        this.log(`  ${id}  ${name}  ${model}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
