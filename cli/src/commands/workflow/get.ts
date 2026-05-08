import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class WorkflowGet extends BaseCommand {
  static description = "Get details of a workflow (including node tree)";

  static examples = [
    "imbrace workflow get <flowId>",
    "imbrace workflow get <flowId> --json",
  ];

  static args = {
    id: Args.string({ description: "Workflow ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowGet);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Workflow ID:" }));

    try {
      const client = getClient();
      const data = await client.workflows.getFlow(id);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const f: any = data || {};
      const v: any = f.version || {};
      this.log(`\n  ID:           ${f.id || ""}`);
      this.log(`  Name:         ${v.displayName || ""}`);
      this.log(`  Status:       ${f.status || ""}`);
      this.log(`  Project ID:   ${f.projectId || ""}`);
      this.log(`  Created:      ${f.created || ""}`);
      this.log(`  Updated:      ${f.updated || ""}`);

      // Print node tree
      this.log(`\n  Node tree:`);
      let cur: any = v.trigger;
      let depth = 0;
      while (cur && depth < 20) {
        const indent = "    ".repeat(depth);
        const piece = cur.settings?.pieceName || "";
        const action = cur.settings?.actionName || cur.settings?.triggerName || "";
        this.log(`  ${indent}${cur.name || "(unnamed)"} [${cur.type}] ${piece}${action ? ` :: ${action}` : ""}`);
        cur = cur.nextAction;
        depth++;
      }
      if (!v.trigger) this.log("    (empty — no trigger set)");
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
