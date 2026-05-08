import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";
import { normalizePieceName, resolveProjectId } from "../../../lib/workflow.js";

export default class WorkflowConnCreate extends BaseCommand {
  static description = "Create a connection (save credential for an external service)";

  static examples = [
    'imbrace workflow conn create --piece slack --type SECRET_TEXT --value "xoxb-..." --json',
    'imbrace workflow conn create --piece openai --type SECRET_TEXT --value "sk-..." --display-name "Production OpenAI" --json',
  ];

  static flags = {
    piece: Flags.string({
      description: "Piece name (e.g. 'slack' or '@activepieces/piece-slack')",
      required: true,
    }),
    type: Flags.string({
      description: "Auth type",
      options: ["SECRET_TEXT", "OAUTH2", "CLOUD_OAUTH2", "BASIC_AUTH", "CUSTOM_AUTH"],
      required: true,
    }),
    value: Flags.string({
      description: "Credential value. For SECRET_TEXT: the raw token. For other types: JSON string with type-specific fields.",
      required: true,
    }),
    "display-name": Flags.string({ description: "Human-readable name (default: auto-generated)" }),
    "external-id": Flags.string({ description: "Unique external ID (default: auto-generated cli_<timestamp>)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new connection ID" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowConnCreate);

    // For non-SECRET_TEXT types, parse value as JSON
    let value: any = flags.value;
    if (flags.type !== "SECRET_TEXT") {
      try {
        value = JSON.parse(flags.value);
      } catch (e: any) {
        this.error(`--value must be valid JSON for type ${flags.type}: ${e.message}`);
      }
    }

    try {
      const client = getClient();
      const pieceName = normalizePieceName(flags.piece);
      const projectId = await resolveProjectId(client);
      const externalId = flags["external-id"] || `cli_${Date.now()}`;

      // Activepieces requires `value.type` to match the connection type.
      let apValue: any;
      if (flags.type === "SECRET_TEXT" && typeof value === "string") {
        apValue = { type: "SECRET_TEXT", secret_text: value };
      } else if (flags.type === "BASIC_AUTH" && typeof value === "object") {
        apValue = { type: "BASIC_AUTH", username: (value as any).username, password: (value as any).password };
      } else {
        apValue = typeof value === "object" && value.type
          ? value
          : { type: flags.type, ...(typeof value === "object" ? value : {}) };
      }

      const data: any = await client.workflows.upsertConnection({
        pieceName,
        projectId,
        externalId,
        displayName: flags["display-name"] || `${pieceName.split("/").pop()} (${externalId})`,
        type: flags.type,
        value: apValue,
      } as any);
      const message = "Connection created";

      if (flags["id-only"]) {
        this.log(data?.id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (data?.id) this.log(`   ID: ${data.id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
