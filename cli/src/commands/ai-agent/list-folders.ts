import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class AiAgentListFolders extends BaseCommand {
  static description = "List Knowledge Hub folders (use IDs with --folder-ids on create/update)";

  static examples = [
    "imbrace ai-agent list-folders",
    "imbrace ai-agent list-folders --search support",
    "imbrace ai-agent list-folders --json",
  ];

  static flags = {
    search: Flags.string({ char: "s", description: "Filter by name (case-insensitive)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentListFolders);

    const qs = flags.search ? `?q=${encodeURIComponent(flags.search)}` : "";
    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(`/ai-agent/folders${qs}`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} folder(s):\n`);
      this.log("  ID                                       NAME                          FILES");
      this.log("  ──────────────────────────────────────────────────────────────────────────────");
      for (const f of res.data || []) {
        const id = (f._id || f.id || "").padEnd(40);
        const name = (f.name || "").padEnd(28);
        const files = String(f.file_count ?? 0).padStart(5);
        this.log(`  ${id} ${name} ${files}`);
      }
      this.log(`\n  Use 'imbrace ai-agent list-files --folder-id <id>' to see files.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
