import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class GuardrailCreate extends BaseCommand {
  static description = "Create a Guardrail (content safety + compliance rules attached to AI agents)";

  static examples = [
    'imbrace guardrail create --name "PII Filter" --model gpt-4o-mini --instructions "Block any PII (SSN, credit card, email)" --json',
    'imbrace guardrail create --name "Brand Safety" --model gpt-4o --instructions "Refuse competitor mentions" --competitor-keywords "Competitor1,Competitor2" --json',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Guardrail name" }),
    model: Flags.string({ description: "LLM model used to evaluate (e.g. gpt-4o-mini)" }),
    instructions: Flags.string({ char: "i", description: "Safety / compliance rules to enforce" }),
    "guardrail-provider-id": Flags.string({ description: "Guardrail provider UUID (uses default if omitted)" }),
    description: Flags.string({ char: "d", description: "Human-readable description" }),
    "unsafe-categories": Flags.string({ description: "Comma-separated unsafe categories (e.g. 'violence,hate,sexual')" }),
    "custom-unsafe-patterns": Flags.string({ description: "Comma-separated custom regex patterns to block" }),
    "competitor-keywords": Flags.string({ description: "Comma-separated competitor names to flag" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new guardrail ID" }),
  };

  async run() {
    const { flags } = await this.parse(GuardrailCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Guardrail name:" }));
    const model = flags.model ?? (nonInteractive ? this.error("--model is required with --json or --id-only") : await input({ message: "Model (e.g. gpt-4o-mini):" }));
    const instructions = flags.instructions ?? (nonInteractive ? this.error("--instructions is required with --json or --id-only") : await input({ message: "Instructions:" }));

    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

    try {
      const client = getClient();
      const data: any = await client.ai.createGuardrail({
        name,
        model,
        instructions,
        ...(flags["guardrail-provider-id"] && { guardrail_provider_id: flags["guardrail-provider-id"] }),
        ...(flags.description && { description: flags.description }),
        ...(flags["unsafe-categories"] && { unsafe_categories: split(flags["unsafe-categories"]) }),
        ...(flags["custom-unsafe-patterns"] && { custom_unsafe_patterns: split(flags["custom-unsafe-patterns"]) }),
        ...(flags["competitor-keywords"] && { competitor_keywords: split(flags["competitor-keywords"]) }),
      });

      if (flags["id-only"]) {
        this.log(data?._id ?? "");
        return;
      }

      const message = `Guardrail "${name}" created`;
      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (data?._id) this.log(`   ID: ${data._id}`);
      this.log(`\n  Attach via 'imbrace ai-agent create --guardrail-id ${data?._id ?? "<id>"}'.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
