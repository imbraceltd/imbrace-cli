import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

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

    const params = flags["folder-id"] ? { folderId: flags["folder-id"] } : undefined;

    try {
      const client = getClient();
      const res = await client.workflows.listFlows(params as any);
      const data: any[] = (res as any)?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} workflow(s):\n`);
      this.log("  ID                       NAME                                 STATUS");
      this.log("  ────────────────────────────────────────────────────────────────────");
      for (const flow of data) {
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
