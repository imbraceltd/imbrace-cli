import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class DataBoardCreateItem extends BaseCommand {
  static description =
    "Create board items (records). Format: { fields: [{ board_field_id, value }, ...] }";

  static examples = [
    "imbrace data-board create-item",
    `imbrace data-board create-item <boardId> --fields '[{"board_field_id":"<id>","value":"Acme"}]' --json`,
  ];

  static args = {
    boardId: Args.string({ description: "Board ID" }),
  };

  static flags = {
    fields: Flags.string({
      char: "f",
      description: 'JSON: [{"board_field_id":"<id>","value":"<val>"}]',
    }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DataBoardCreateItem);

    const boardId = args.boardId ?? (await input({ message: "Board ID:" }));

    let fields: any[];
    if (flags.fields) {
      try {
        fields = JSON.parse(flags.fields);
      } catch {
        this.error("--fields must be valid JSON array");
      }
    } else {
      const boardRes = await apiRequest<{ ok: boolean; data: any[] }>(
        `/data-board/${boardId}/fields`,
      );
      const boardFields: any[] = boardRes.data || [];
      if (!boardFields.length)
        this.error("Board has no fields. Run: imbrace data-board create-field");

      this.log("\n  Fill in the fields:\n");
      fields = [];
      for (const field of boardFields) {
        const value = await input({
          message: `  ${field.name} (${field.type}):`,
          default: "",
        });
        if (value) fields.push({ board_field_id: field._id, value });
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/data-board/${boardId}/items`,
        { method: "POST", body: { fields } },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }
      this.log(`\n✅ ${res.message}`);
      if (res.data?._id) this.log(`   ID: ${res.data._id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}

// Create board items (records)

// Items use { fields: [{ board_field_id, value }] } format:

// const item = await client.boards.createItem(board._id, {
//   fields: [
//     { board_field_id: identifierField._id, value: "Acme Corp", board_field_id: identifierField._id, value: "Acme Corp" },

//   ],   { board_field_id: identifierField._id, value: "Acme Corp" },
// })
// console.log("Item ID:", item._id)
