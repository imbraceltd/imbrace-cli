import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input, confirm } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class DataBoardCreate extends BaseCommand {
  static description = "Create a new data board";

  static examples = [
    "imbrace data-board create",
    'imbrace data-board create --name "Sales Pipeline" --json',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Board name" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DataBoardCreate);

    const name = flags.name ?? await input({ message: "Board name:" });

    const body: Record<string, any> = { name };

    if (!flags.json) {
      this.log("\n  ℹ Board body is freestyle — you can add any field (e.g. description, email, type, owner...)\n");

      while (true) {
        const addMore = await confirm({ message: "Add another field?", default: true });
        if (!addMore) break;

        const fieldName = await input({ message: "Field name:" });
        const fieldValue = await input({ message: "Field value:" });

        body[fieldName] = fieldValue;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        "/data-board/create",
        { method: "POST", body }
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
