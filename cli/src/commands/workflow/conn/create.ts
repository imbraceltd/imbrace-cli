import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

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

    const body: Record<string, any> = {
      piece: flags.piece,
      type: flags.type,
      value,
    };
    if (flags["display-name"]) body.displayName = flags["display-name"];
    if (flags["external-id"]) body.externalId = flags["external-id"];

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        "/workflow/conn/create",
        { method: "POST", body },
      );

      if (flags["id-only"]) {
        this.log(res.data?.id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}`);
      if (res.data?.id) this.log(`   ID: ${res.data.id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
