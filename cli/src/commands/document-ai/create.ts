import { Flags } from "@oclif/core";
import { readFileSync } from "node:fs";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class DocumentAiCreate extends BaseCommand {
  static description = "Create a Document AI agent (extracts structured JSON from PDFs/images)";

  static examples = [
    'imbrace document-ai create --name "Invoice Extractor" --instructions "Extract invoice fields. Dates as YYYY-MM-DD." --model gpt-4o --schema \'{"invoice_number":{"type":"string"},"total":{"type":"number"}}\' --json',
    'imbrace document-ai create --name "Receipt" --instructions "Extract receipt." --model gpt-4o --schema-file ./schema.json --id-only',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Agent display name" }),
    instructions: Flags.string({ char: "i", description: "System prompt governing extraction logic" }),
    model: Flags.string({ description: "LLM model ID (e.g. gpt-4o, qwen3.5-27b)" }),
    "provider-id": Flags.string({ description: "Provider UUID (use 'system' for org default)" }),
    schema: Flags.string({ description: "JSON schema for fields (inline). Either this or --schema-file." }),
    "schema-file": Flags.string({ description: "Path to JSON schema file" }),
    description: Flags.string({ char: "d", description: "Agent description" }),
    "workflow-name": Flags.string({ description: "Internal workflow name (default: 'document_extraction')" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new agent ID (pipe-friendly)" }),
  };

  async run() {
    const { flags } = await this.parse(DocumentAiCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Agent name:" }));
    const instructions = flags.instructions ?? (nonInteractive ? this.error("--instructions is required with --json or --id-only") : await input({ message: "Instructions:" }));
    const model = flags.model ?? (nonInteractive ? this.error("--model is required with --json or --id-only") : await input({ message: "Model (e.g. gpt-4o):" }));

    let schema: Record<string, unknown> | undefined;
    if (flags.schema) {
      try { schema = JSON.parse(flags.schema); }
      catch (e: any) { this.error(`--schema is not valid JSON: ${e.message}`); }
    } else if (flags["schema-file"]) {
      try { schema = JSON.parse(readFileSync(flags["schema-file"], "utf8")); }
      catch (e: any) { this.error(`--schema-file is not valid JSON: ${e.message}`); }
    }

    try {
      const client = getClient();
      const data: any = await client.documentAi.createAgent({
        name,
        instructions,
        model_id: model,
        ...(flags["provider-id"] && { provider_id: flags["provider-id"] }),
        ...(schema && { schema }),
        ...(flags.description && { description: flags.description }),
        ...(flags["workflow-name"] && { workflow_name: flags["workflow-name"] }),
      });

      if (flags["id-only"]) {
        this.log(data?._id ?? data?.id ?? "");
        return;
      }

      const message = `Document AI Agent "${name}" created`;
      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (data?._id || data?.id) this.log(`   ID: ${data._id || data.id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
