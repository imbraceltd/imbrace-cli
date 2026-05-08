import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input, select } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

const FIELD_TYPES = [
  "ShortText", "LongText", "Number", "Date",
  "Email", "Phone", "Currency",
  "SingleSelection", "MultipleSelection", "Checkbox",
  "Assignee", "MultipleAssignee",
  "Link", "Notes", "Origin", "Priority",
];

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
      const client = getClient();
      const data: any = await client.boards.createField(boardId, { name, type } as any);
      const message = `Field "${name}" created`;

      if (flags.json) { this.log(JSON.stringify({ ok: true, message, data }, null, 2)); return; }
      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
