import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class GuardrailUpdate extends BaseCommand {
  static description = "Update a Guardrail. Pass any subset of flags — the command fetches the current guardrail and merges your changes on top (backend PUT is a full replace).";

  static examples = [
    'imbrace guardrail update <id> --instructions "Updated rules" --json',
    'imbrace guardrail update <id> --name "X" --unsafe-categories "violence,hate"',
  ];

  static args = {
    id: Args.string({ description: "Guardrail ID", required: true }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "Name (defaults to current)" }),
    model: Flags.string({ description: "LLM model (defaults to current)" }),
    instructions: Flags.string({ char: "i", description: "Rules (defaults to current)" }),
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
      // Backend PUT is a full replace and rejects partial bodies missing
      // required fields (e.g. unsafe_categories). Fetch the current guardrail
      // and merge the provided flags on top so callers can pass any subset.
      const current: any = await client.ai.getGuardrail(args.id);

      // Spread the full current guardrail (keeps required fields the PUT needs —
      // e.g. org_id, model — that the backend silently no-ops without), then
      // override only the flags the caller provided.
      const body: Record<string, any> = { ...current };
      if (flags.name) body.name = flags.name;
      if (flags.model) body.model = flags.model;
      if (flags.instructions) body.instructions = flags.instructions;
      if (flags["guardrail-provider-id"]) body.guardrail_provider_id = flags["guardrail-provider-id"];
      if (flags.description) body.description = flags.description;
      if (flags["unsafe-categories"]) body.unsafe_categories = split(flags["unsafe-categories"]);
      if (flags["custom-unsafe-patterns"]) body.custom_unsafe_patterns = split(flags["custom-unsafe-patterns"]);
      if (flags["competitor-keywords"]) body.competitor_keywords = split(flags["competitor-keywords"]);

      // name/model/instructions are always populated above (flag ?? current),
      // but the merged shape is dynamic — cast past the strict input type.
      const data = await client.ai.updateGuardrail(args.id, body as any);
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
