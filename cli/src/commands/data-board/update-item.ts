import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class DataBoardUpdateItem extends BaseCommand {
  static description = "Update an item in a board. Fetches fields and prompts per field.";

  static examples = [
    "imbrace data-board update-item",
    `imbrace data-board update-item <boardId> <itemId> --data '[{"key":"<fieldId>","value":"New"}]' --json`,
  ];

  static args = {
    boardId: Args.string({ description: "Board ID" }),
    itemId: Args.string({ description: "Item ID" }),
  };

  static flags = {
    data: Flags.string({ char: "d", description: 'JSON: [{"key":"<fieldId>","value":"<val>"}]' }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DataBoardUpdateItem);

    const boardId = args.boardId ?? await input({ message: "Board ID:" });
    const itemId = args.itemId ?? await input({ message: "Item ID:" });

    const client = getClient();

    let data: any[];
    if (flags.data) {
      try { data = JSON.parse(flags.data); }
      catch { this.error("--data must be valid JSON array"); }
    } else {
      const board: any = await client.boards.get(boardId);
      const boardFields: any[] = board?.fields || board?.data?.fields || [];
      if (!boardFields.length) this.error("Board has no fields.");

      this.log("\n  Update fields (leave empty to skip):\n");
      data = [];
      for (const field of boardFields) {
        const value = await input({ message: `  ${field.name} (${field.type}):`, default: "" });
        if (value) data.push({ key: field._id, value });
      }
    }

    try {
      const item: any = await client.boards.updateItem(boardId, itemId, { data } as any);
      const message = "Item updated";

      if (flags.json) { this.log(JSON.stringify({ ok: true, message, data: item }, null, 2)); return; }
      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
