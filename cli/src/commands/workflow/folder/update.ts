import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowFolderUpdate extends BaseCommand {
  static description = "Rename a folder";

  static examples = [
    'imbrace workflow folder update <folderId> --name "New Name" --json',
  ];

  static args = {
    folderId: Args.string({ description: "Folder ID", required: true }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "New folder name", required: true }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowFolderUpdate);

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/folder/${args.folderId}`,
        { method: "PUT", body: { name: flags.name } },
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
