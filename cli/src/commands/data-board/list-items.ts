import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class DataBoardListItems extends BaseCommand {
  static description = "List or search items (records) in a board";

  static examples = [
    "imbrace data-board list-items",
    "imbrace data-board list-items --board-id <id> --limit 20 --skip 0 --json",
    "imbrace data-board list-items --board-id <id> --q Acme --json",
  ];

  static flags = {
    "board-id": Flags.string({ description: "Board ID (brd_...)" }),
    q: Flags.string({ description: "Search query (optional)" }),
    limit: Flags.integer({ char: "l", description: "Number of items (default: 20)" }),
    skip: Flags.integer({ char: "s", description: "Items to skip (default: 0)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DataBoardListItems);

    const boardId = flags["board-id"] ?? (flags.json ? this.error("--board-id is required with --json") : await input({ message: "Board ID (brd_...):" }));
    const q = flags.q ?? (flags.json ? "" : await input({ message: "Search query (press Enter to list all):", default: "" }));
    const limit = flags.limit ?? (flags.json ? 20 : Number(await input({ message: "Limit (press Enter for 20):", default: "20" })));
    const skip = flags.skip ?? (flags.json || q ? 0 : Number(await input({ message: "Skip (press Enter for 0):", default: "0" })));

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("limit", String(limit));
    if (!q) params.set("skip", String(skip));

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(
        `/data-board/${boardId}/items?${params}`
      );

      if (flags.json) { this.log(JSON.stringify(res, null, 2)); return; }

      this.log(`\n  Found ${res.count} item(s):\n`);
      for (const item of res.data || []) {
        this.log(`  ${item._id}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
