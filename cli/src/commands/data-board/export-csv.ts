import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { writeFileSync } from "fs";
import { getClient } from "../../lib/client.js";

export default class DataBoardExportCsv extends BaseCommand {
  static description = "Export a board to CSV";

  static examples = [
    "imbrace data-board export-csv",
    "imbrace data-board export-csv --board-id <id> --out ./board.csv",
  ];

  static flags = {
    "board-id": Flags.string({ description: "Board ID" }),
    out: Flags.string({ char: "o", description: "Save to file path (default: print to stdout)" }),
  };

  async run() {
    const { flags } = await this.parse(DataBoardExportCsv);

    const boardId = flags["board-id"] ?? await input({ message: "Board ID:" });
    const out = flags.out ?? await input({ message: "Save to file path (leave empty to print):", default: "" });

    try {
      const client = getClient();
      const csv = await client.boards.exportCsv(boardId);

      if (out) {
        writeFileSync(out, csv as any);
        this.log(`\n✅ Exported to ${out}\n`);
      } else {
        this.log(csv as any);
      }
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
