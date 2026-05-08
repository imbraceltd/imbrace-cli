import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

export default class WorkflowConnGet extends BaseCommand {
  static description = "Get details of a single connection (credential metadata, status, piece info)";

  static examples = [
    "imbrace workflow conn get <connId>",
    "imbrace workflow conn get <connId> --json",
  ];

  static args = {
    connId: Args.string({ description: "Connection ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowConnGet);
    const connId = args.connId ?? (flags.json ? this.error("Connection ID is required") : await input({ message: "Connection ID:" }));

    try {
      const client = getClient();
      const data = await client.workflows.getConnection(connId);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const c: any = data || {};
      this.log(`\n  ID:            ${c.id || ""}`);
      this.log(`  Display name:  ${c.displayName || ""}`);
      this.log(`  External ID:   ${c.externalId || ""}`);
      this.log(`  Piece:         ${c.pieceName || ""}`);
      this.log(`  Type:          ${c.type || ""}`);
      this.log(`  Status:        ${c.status || ""}`);
      this.log(`  Project ID:    ${c.projectId || ""}`);
      this.log(`  Created:       ${c.created || ""}`);
      this.log(`  Updated:       ${c.updated || ""}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
