import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input, confirm } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class DataBoardDeleteItem extends BaseCommand {
  static description = "Delete an item from a board";

  static examples = [
    "imbrace data-board delete-item",
    "imbrace data-board delete-item <boardId> <itemId> --yes --json",
  ];

  static args = {
    boardId: Args.string({ description: "Board ID" }),
    itemId: Args.string({ description: "Item ID" }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DataBoardDeleteItem);

    const boardId = args.boardId ?? await input({ message: "Board ID:" });
    const itemId = args.itemId ?? await input({ message: "Item ID:" });

    if (!flags.yes) {
      const ok = await confirm({ message: `Delete item ${itemId}?`, default: false });
      if (!ok) { this.log("Cancelled."); return; }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/data-board/${boardId}/items/${itemId}`,
        { method: "DELETE" }
      );

      if (flags.json) { this.log(JSON.stringify(res, null, 2)); return; }
      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
