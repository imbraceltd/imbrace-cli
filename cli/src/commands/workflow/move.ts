import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class WorkflowMove extends BaseCommand {
  static description = "Move a workflow into a folder (category). Pass --folder-id NULL to make it unfiled.";

  static examples = [
    "imbrace workflow move <flowId> --folder-id <folderId>",
    "imbrace workflow move <flowId> --folder-id NULL  # remove from any folder",
  ];

  static args = {
    id: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    "folder-id": Flags.string({
      description:
        "Target folder ID. Use 'NULL' to unfile. Use 'imbrace workflow folder list' to discover folder IDs.",
      required: true,
    }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowMove);

    const folderId = flags["folder-id"] === "NULL" ? null : flags["folder-id"];

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/workflow/${encodeURIComponent(args.id)}/move`,
        { method: "POST", body: { folderId } },
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
