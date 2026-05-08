import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class AiAgentListFiles extends BaseCommand {
  static description = "List files inside a Knowledge Hub folder (use IDs with --file-ids on create/update)";

  static examples = [
    "imbrace ai-agent list-files --folder-id <folderId>",
    "imbrace ai-agent list-files --folder-id <folderId> --json",
  ];

  static flags = {
    "folder-id": Flags.string({
      description: "Knowledge Hub folder ID. Use 'imbrace ai-agent list-folders' to discover.",
      required: true,
    }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentListFiles);

    try {
      const client = getClient();
      const r = await client.boards.searchFiles({ folderId: flags["folder-id"] }) as any;
      const data: any[] = (Array.isArray(r) ? r : r?.data) || [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} file(s) in folder "${flags["folder-id"]}":\n`);
      this.log("  ID                                       NAME                                STATUS");
      this.log("  ─────────────────────────────────────────────────────────────────────────────────────");
      for (const f of data) {
        const id = (f._id || f.id || "").padEnd(40);
        const name = (f.original_name || f.name || "").padEnd(36);
        const status = f.embedding_status || f.status || "";
        this.log(`  ${id} ${name} ${status}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
