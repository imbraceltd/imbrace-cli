import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class AiAgentListProviders extends BaseCommand {
  static description = "List LLM providers (system + custom) configured for the org";

  static examples = [
    "imbrace ai-agent list-providers",
    "imbrace ai-agent list-providers --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentListProviders);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>("/ai-agent/providers");

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} provider(s):\n`);
      this.log("  ID                                       NAME             TYPE        MODELS");
      this.log("  ─────────────────────────────────────────────────────────────────────────────");
      for (const p of res.data || []) {
        const id = (p._id || "").padEnd(40);
        const name = (p.name || "").padEnd(16);
        const type = (p.type || "").padEnd(11);
        const models = (p.models || []).slice(0, 3).join(", ") + ((p.models || []).length > 3 ? `, +${p.models.length - 3} more` : "");
        this.log(`  ${id} ${name} ${type} ${models}`);
      }
      this.log(`\n  Use 'imbrace ai-agent list-models --provider-id <id>' for full model list.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
