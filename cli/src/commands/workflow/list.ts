import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class WorkflowList extends BaseCommand {
  static description = "List all workflows (Activepieces flows)";

  static examples = [
    "imbrace workflow list",
    "imbrace workflow list --json",
    "imbrace workflow list --folder-id <folderId>",
    "imbrace workflow list --folder-id NULL  # only unfiled flows",
  ];

  static flags = {
    "folder-id": Flags.string({
      description:
        "Filter to flows in this folder. Use 'NULL' to show only unfiled flows. Use 'imbrace workflow folder list' to discover folder IDs.",
    }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowList);

    const qs = flags["folder-id"] ? `?folderId=${encodeURIComponent(flags["folder-id"])}` : "";
    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(`/workflow/list${qs}`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} workflow(s):\n`);
      this.log("  ID                       NAME                                 STATUS");
      this.log("  ────────────────────────────────────────────────────────────────────");
      for (const flow of res.data || []) {
        const id = (flow.id || "").padEnd(24);
        const name = (flow.version?.displayName || "").padEnd(36);
        const status = flow.status || "";
        this.log(`  ${id} ${name} ${status}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
