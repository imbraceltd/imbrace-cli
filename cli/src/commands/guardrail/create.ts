import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class GuardrailCreate extends BaseCommand {
  static description = "Create a Guardrail (content safety + compliance rules attached to AI agents)";

  static examples = [
    'imbrace guardrail create --name "PII Filter" --instructions "Block any PII (SSN, credit card, email)" --json',
    'imbrace guardrail create --name "Brand Safety" --model model-armor --instructions "Refuse competitor mentions" --competitor-keywords "Competitor1,Competitor2" --json',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Guardrail name" }),
    model: Flags.string({
      description: "Guardrail model. Default: nim-nemo (NVIDIA NIM). Other supported: 'model-armor' (Google) or a custom guardrail-provider model.",
    }),
    instructions: Flags.string({ char: "i", description: "Safety / compliance rules to enforce" }),
    "guardrail-provider-id": Flags.string({ description: "Guardrail provider UUID (only when using a custom guardrail provider)" }),
    "org-id": Flags.string({ description: "Organization ID. Auto-fetched from account if omitted." }),
    description: Flags.string({ char: "d", description: "Human-readable description" }),
    "unsafe-categories": Flags.string({ description: "Comma-separated unsafe categories (e.g. 'violence,hate,sexual')" }),
    "custom-unsafe-patterns": Flags.string({ description: "Comma-separated custom regex patterns to block (nim-nemo only)" }),
    "competitor-keywords": Flags.string({ description: "Comma-separated competitor names to flag (nim-nemo only)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new guardrail ID" }),
  };

  async run() {
    const { flags } = await this.parse(GuardrailCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Guardrail name:" }));
    const instructions = flags.instructions ?? (nonInteractive ? this.error("--instructions is required with --json or --id-only") : await input({ message: "Instructions:" }));
    const model = flags.model ?? "nim-nemo";

    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

    try {
      const client = getClient();
      const orgId = flags["org-id"] || (await client.account.getAccount() as any).organization_id;

      const isModelArmor = model === "model-armor";

      const data: any = await client.ai.createGuardrail({
        name,
        model,
        instructions: isModelArmor ? "" : instructions,
        org_id: orgId,
        ...(flags.description && { description: flags.description }),
        ...(flags["guardrail-provider-id"] && { guardrail_provider_id: flags["guardrail-provider-id"] }),
        ...(flags["unsafe-categories"] && { unsafe_categories: split(flags["unsafe-categories"]) }),
        // Patterns + competitor lists only valid for nim-nemo.
        ...(!isModelArmor && flags["custom-unsafe-patterns"] && { custom_unsafe_patterns: split(flags["custom-unsafe-patterns"]) }),
        ...(!isModelArmor && flags["competitor-keywords"] && { competitor_keywords: split(flags["competitor-keywords"]) }),
      } as any);

      // Backend returns `guardrails_config_id`, not `_id`.
      const id = data?.guardrails_config_id ?? data?._id ?? "";

      if (flags["id-only"]) {
        this.log(id);
        return;
      }

      const message = `Guardrail "${name}" created`;
      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data: { ...data, _id: id } }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (id) this.log(`   ID: ${id}`);
      this.log(`\n  Attach via 'imbrace ai-agent create --guardrail-id ${id || "<id>"}'.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
