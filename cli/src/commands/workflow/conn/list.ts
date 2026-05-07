import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

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
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>("/workflow/conn/list");

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} connection(s):\n`);
      this.log("  ID                              DISPLAY NAME                  PIECE                       TYPE");
      this.log("  ─────────────────────────────────────────────────────────────────────────────────────────────");
      for (const c of res.data || []) {
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
