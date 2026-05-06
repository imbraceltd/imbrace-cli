import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowPieceDetail extends BaseCommand {
  static description = "Get full piece schema (actions + triggers + input fields)";

  static examples = [
    "imbrace workflow piece detail slack",
    'imbrace workflow piece detail "@activepieces/piece-slack" --json',
    "imbrace workflow piece detail slack --only actions",
  ];

  static args = {
    piece: Args.string({ description: "Piece name (e.g. 'slack' or '@activepieces/piece-slack')" }),
  };

  static flags = {
    only: Flags.string({ description: "Show only one section: actions | triggers", options: ["actions", "triggers"] }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowPieceDetail);
    const piece = args.piece ?? (flags.json ? this.error("piece is required") : await input({ message: "Piece name (e.g. slack):" }));

    try {
      const res = await apiRequest<{ ok: boolean; data: any }>(`/workflow/piece/detail?name=${encodeURIComponent(piece)}`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      const d = res.data || {};
      this.log(`\n  ${d.displayName} (${d.name})`);
      this.log(`  ${d.description || ""}`);
      this.log(`  Version: ${d.version}    Categories: ${(d.categories || []).join(", ")}`);

      const actions = d.actions || {};
      const triggers = d.triggers || {};

      if (flags.only !== "triggers") {
        this.log(`\n  ACTIONS (${Object.keys(actions).length}):`);
        for (const [name, a] of Object.entries(actions) as [string, any][]) {
          this.log(`    ${name}`);
          this.log(`      ${a.displayName} — ${(a.description || "").slice(0, 80)}`);
          const props = Object.keys(a.props || {}).slice(0, 6).join(", ");
          if (props) this.log(`      props: ${props}${Object.keys(a.props).length > 6 ? ", ..." : ""}`);
        }
      }

      if (flags.only !== "actions") {
        this.log(`\n  TRIGGERS (${Object.keys(triggers).length}):`);
        for (const [name, t] of Object.entries(triggers) as [string, any][]) {
          this.log(`    ${name}`);
          this.log(`      ${t.displayName} — ${(t.description || "").slice(0, 80)}`);
          const props = Object.keys(t.props || {}).slice(0, 6).join(", ");
          if (props) this.log(`      props: ${props}${Object.keys(t.props).length > 6 ? ", ..." : ""}`);
        }
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
