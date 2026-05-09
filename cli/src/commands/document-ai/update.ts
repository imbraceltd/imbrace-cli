import { Args, Flags } from "@oclif/core";
import { readFileSync } from "node:fs";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class DocumentAiUpdate extends BaseCommand {
  static description = "Update a Document AI agent (partial — pass any subset of flags)";

  static examples = [
    'imbrace document-ai update <agentId> --instructions "Updated rules" --json',
    'imbrace document-ai update <agentId> --schema-file ./new-schema.json',
  ];

  static args = {
    id: Args.string({ description: "Document AI agent ID", required: true }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "New display name" }),
    instructions: Flags.string({ char: "i", description: "New system prompt" }),
    model: Flags.string({ description: "New LLM model ID" }),
    "provider-id": Flags.string({ description: "New provider UUID" }),
    schema: Flags.string({ description: "New JSON schema (inline)" }),
    "schema-file": Flags.string({ description: "Path to new JSON schema file" }),
    description: Flags.string({ char: "d", description: "New description" }),
    "workflow-name": Flags.string({ description: "New workflow name" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DocumentAiUpdate);

    let schema: Record<string, unknown> | undefined;
    if (flags.schema) {
      try { schema = JSON.parse(flags.schema); }
      catch (e: any) { this.error(`--schema is not valid JSON: ${e.message}`); }
    } else if (flags["schema-file"]) {
      try { schema = JSON.parse(readFileSync(flags["schema-file"], "utf8")); }
      catch (e: any) { this.error(`--schema-file is not valid JSON: ${e.message}`); }
    }

    const body: Record<string, any> = {};
    if (flags.name) body.name = flags.name;
    if (flags.instructions) body.instructions = flags.instructions;
    if (flags.model) body.model_id = flags.model;
    if (flags["provider-id"]) body.provider_id = flags["provider-id"];
    if (flags.description) body.description = flags.description;
    if (flags["workflow-name"]) body.workflow_name = flags["workflow-name"];
    if (schema) body.schema = schema;

    if (Object.keys(body).length === 0) {
      this.error("Provide at least one field to update. See: imbrace document-ai update -h");
    }

    try {
      const client = getClient();
      const data = await client.documentAi.updateAgent(args.id, body);
      const message = "Document AI Agent updated";

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
