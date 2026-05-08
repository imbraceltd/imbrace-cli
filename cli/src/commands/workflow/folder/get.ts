import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

export default class WorkflowFolderGet extends BaseCommand {
  static description = "Get details of a single folder";

  static examples = [
    "imbrace workflow folder get <folderId>",
    "imbrace workflow folder get <folderId> --json",
  ];

  static args = {
    folderId: Args.string({ description: "Folder ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowFolderGet);
    const folderId = args.folderId ?? (flags.json ? this.error("Folder ID is required") : await input({ message: "Folder ID:" }));

    try {
      const client = getClient();
      const data = await client.workflows.getFolder(folderId);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const f: any = data || {};
      this.log(`\n  ID:           ${f.id || ""}`);
      this.log(`  Name:         ${f.displayName || ""}`);
      this.log(`  Project ID:   ${f.projectId || ""}`);
      this.log(`  Created:      ${f.created || ""}`);
      this.log(`  Updated:      ${f.updated || ""}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
