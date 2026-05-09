import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class GuardrailGet extends BaseCommand {
  static description = "Get details of a single guardrail";

  static examples = [
    "imbrace guardrail get <guardrailId>",
    "imbrace guardrail get <guardrailId> --json",
  ];

  static args = {
    id: Args.string({ description: "Guardrail ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(GuardrailGet);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Guardrail ID:" }));

    try {
      const client = getClient();
      const data: any = await client.ai.getGuardrail(id);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      this.log(`\n  ID:                ${data.guardrails_config_id || data._id || ""}`);
      this.log(`  Name:              ${data.name || ""}`);
      this.log(`  Model:             ${data.model || ""}`);
      this.log(`  Provider ID:       ${data.guardrail_provider_id || ""}`);
      this.log(`  Description:       ${(data.description || "").slice(0, 80)}`);
      if (data.unsafe_categories) this.log(`  Unsafe categories: ${(data.unsafe_categories || []).join(", ") || "(none)"}`);
      if (data.competitor_keywords) this.log(`  Competitors:       ${(data.competitor_keywords || []).join(", ") || "(none)"}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
