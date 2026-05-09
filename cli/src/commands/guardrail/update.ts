import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class GuardrailUpdate extends BaseCommand {
  static description = "Update a Guardrail (PUT — must pass name, model, instructions; other fields optional)";

  static examples = [
    'imbrace guardrail update <id> --name "X" --model gpt-4o --instructions "..." --json',
  ];

  static args = {
    id: Args.string({ description: "Guardrail ID", required: true }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "Name (required by SDK PUT)", required: true }),
    model: Flags.string({ description: "LLM model (required by SDK PUT)", required: true }),
    instructions: Flags.string({ char: "i", description: "Rules (required by SDK PUT)", required: true }),
    "guardrail-provider-id": Flags.string({ description: "Guardrail provider UUID" }),
    description: Flags.string({ char: "d", description: "Human-readable description" }),
    "unsafe-categories": Flags.string({ description: "Comma-separated unsafe categories" }),
    "custom-unsafe-patterns": Flags.string({ description: "Comma-separated custom regex patterns" }),
    "competitor-keywords": Flags.string({ description: "Comma-separated competitor names" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(GuardrailUpdate);
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

    try {
      const client = getClient();
      const data = await client.ai.updateGuardrail(args.id, {
        name: flags.name,
        model: flags.model,
        instructions: flags.instructions,
        ...(flags["guardrail-provider-id"] && { guardrail_provider_id: flags["guardrail-provider-id"] }),
        ...(flags.description && { description: flags.description }),
        ...(flags["unsafe-categories"] && { unsafe_categories: split(flags["unsafe-categories"]) }),
        ...(flags["custom-unsafe-patterns"] && { custom_unsafe_patterns: split(flags["custom-unsafe-patterns"]) }),
        ...(flags["competitor-keywords"] && { competitor_keywords: split(flags["competitor-keywords"]) }),
      });
      const message = "Guardrail updated";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
