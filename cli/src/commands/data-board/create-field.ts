import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input, select } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

const FIELD_TYPES = ["ShortText", "LongText", "Number", "Dropdown", "Date", "Checkbox"];

export default class DataBoardCreateField extends BaseCommand {
  static description = "Add a custom field to a board";

  static examples = [
    "imbrace data-board create-field",
    'imbrace data-board create-field <boardId> --name "Company" --type ShortText --json',
  ];

  static args = {
    boardId: Args.string({ description: "Board ID" }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "Field name" }),
    type: Flags.string({ char: "t", description: `Field type: ${FIELD_TYPES.join(", ")}` }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(DataBoardCreateField);

    const boardId = args.boardId ?? await input({ message: "Board ID:" });
    const name = flags.name ?? await input({ message: "Field name:" });
    const type = flags.type ?? await select({
      message: "Field type:",
      choices: FIELD_TYPES.map((t) => ({ name: t, value: t })),
    });

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/data-board/${boardId}/fields`,
        { method: "POST", body: { name, type } }
      );

      if (flags.json) { this.log(JSON.stringify(res, null, 2)); return; }
      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
