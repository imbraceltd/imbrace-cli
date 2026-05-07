import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowFolderList extends BaseCommand {
  static description = "List all folders (used to organize workflows)";

  static examples = [
    "imbrace workflow folder list",
    "imbrace workflow folder list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowFolderList);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>("/workflow/folder/list");

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} folder(s):\n`);
      this.log("  ID                       NAME");
      this.log("  ─────────────────────────────────────────────────────");
      for (const f of res.data || []) {
        const id = (f.id || "").padEnd(24);
        const name = f.displayName || "";
        this.log(`  ${id} ${name}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
