import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class AiAgentListModels extends BaseCommand {
  static description = "List LLM models available for a specific provider";

  static examples = [
    "imbrace ai-agent list-models --provider-id system",
    "imbrace ai-agent list-models --provider-id 69e84cde835c54bda1234567",
    "imbrace ai-agent list-models --provider-id system --json",
  ];

  static flags = {
    "provider-id": Flags.string({
      description: "Provider ID. Use 'imbrace ai-agent list-providers' to discover. Use 'system' for the default provider.",
      required: true,
    }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentListModels);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: string[] }>(
        `/ai-agent/providers/${encodeURIComponent(flags["provider-id"])}/models`,
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} model(s) for provider "${flags["provider-id"]}":\n`);
      for (const m of res.data || []) {
        this.log(`    ${m}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
