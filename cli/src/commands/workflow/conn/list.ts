import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";

export default class WorkflowConnList extends BaseCommand {
  static description = "List all connections (saved credentials for external services)";

  static examples = [
    "imbrace workflow conn list",
    "imbrace workflow conn list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowConnList);

    try {
      const client = getClient();
      const res = await client.workflows.listConnections() as any;
      const data: any[] = res?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} connection(s):\n`);
      this.log("  ID                              DISPLAY NAME                  PIECE                       TYPE");
      this.log("  ─────────────────────────────────────────────────────────────────────────────────────────────");
      for (const c of data) {
        const id = (c.id || "").padEnd(31);
        const name = (c.displayName || "").padEnd(28);
        const piece = (c.pieceName || "").padEnd(28);
        const type = c.type || "";
        this.log(`  ${id} ${name} ${piece} ${type}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
