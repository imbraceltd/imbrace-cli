import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class GuardrailList extends BaseCommand {
  static description = "List Guardrails (safety rules + compliance constraints attached to AI agents via --guardrail-id)";

  static examples = [
    "imbrace guardrail list",
    "imbrace guardrail list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(GuardrailList);

    try {
      const client = getClient();
      const res = await client.ai.listGuardrails() as any;
      const data: any[] = res?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, total: res?.total ?? data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} guardrail(s):\n`);
      this.log("  ID                                    NAME                          MODEL");
      this.log("  ──────────────────────────────────────────────────────────────────────────────");
      for (const g of data) {
        const id = (g._id || "").padEnd(38);
        const name = (g.name || "").padEnd(28);
        const model = g.model || "";
        this.log(`  ${id}  ${name}  ${model}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
