import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class DataBoardList extends BaseCommand {
  static description = "List all boards — use this to get Board IDs";

  static examples = [
    "imbrace data-board list",
    "imbrace data-board list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DataBoardList);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>("/data-board/list");

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} board(s):\n`);
      this.log("  ID                                    NAME");
      this.log("  ──────────────────────────────────────────────────────");
      for (const board of res.data || []) {
        this.log(`  ${(board._id || "").padEnd(38)}  ${board.name || ""}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
