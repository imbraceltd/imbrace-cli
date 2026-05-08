import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";

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
      const client = getClient();
      const res = await client.workflows.listFolders();
      const data: any[] = (res as any)?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} folder(s):\n`);
      this.log("  ID                       NAME");
      this.log("  ─────────────────────────────────────────────────────");
      for (const f of data) {
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
