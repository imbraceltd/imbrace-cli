import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowFolderDelete extends BaseCommand {
  static description = "Delete a folder. Flows inside the folder are NOT deleted — they become unfiled.";

  static examples = [
    "imbrace workflow folder delete <folderId> --yes",
    "imbrace workflow folder delete <folderId> --yes --json",
  ];

  static args = {
    folderId: Args.string({ description: "Folder ID", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowFolderDelete);

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete folder ${args.folderId}?`, default: false });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/folder/${args.folderId}`,
        { method: "DELETE" },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
