import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

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
      const client = getClient();
      const res = await client.boards.list() as any;
      const data: any[] = res?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} board(s):\n`);
      this.log("  ID                                    NAME");
      this.log("  ──────────────────────────────────────────────────────");
      for (const board of data) {
        this.log(`  ${(board._id || "").padEnd(38)}  ${board.name || ""}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
