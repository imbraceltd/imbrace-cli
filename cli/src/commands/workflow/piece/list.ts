import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowPieceList extends BaseCommand {
  static description = "List available integrations (pieces) for use in workflow nodes";

  static examples = [
    "imbrace workflow piece list",
    'imbrace workflow piece list --search slack',
    "imbrace workflow piece list --json",
  ];

  static flags = {
    search: Flags.string({ char: "s", description: "Filter by name/displayName/description (case-insensitive)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowPieceList);

    const qs = flags.search ? `?search=${encodeURIComponent(flags.search)}` : "";
    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(`/workflow/piece/list${qs}`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} piece(s)${flags.search ? ` matching "${flags.search}"` : ""}:\n`);
      this.log("  NAME                                          DISPLAY                          A  T");
      this.log("  ──────────────────────────────────────────────────────────────────────────────────");
      for (const p of res.data || []) {
        const name = (p.name || "").padEnd(45);
        const display = (p.displayName || "").padEnd(32);
        const a = String(p.actions ?? 0).padStart(2);
        const t = String(p.triggers ?? 0).padStart(2);
        this.log(`  ${name} ${display} ${a} ${t}`);
      }
      this.log(`\n  A=actions, T=triggers. Run 'imbrace workflow piece detail --name <pieceName>' for full schema.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
