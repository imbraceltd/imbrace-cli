import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowNodeList extends BaseCommand {
  static description = "List nodes (trigger + actions) of a workflow";

  static examples = [
    "imbrace workflow node list <flowId>",
    "imbrace workflow node list <flowId> --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowNodeList);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(`/workflow/${args.flowId}/nodes`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} node(s):\n`);
      this.log("  NAME       TYPE             PIECE                                  ACTION/TRIGGER");
      this.log("  ─────────────────────────────────────────────────────────────────────────────────");
      for (const n of res.data || []) {
        const name = (n.name || "").padEnd(10);
        const type = (n.type || "").padEnd(16);
        const piece = (n.pieceName || "-").padEnd(38);
        const at = n.actionName || n.triggerName || "-";
        this.log(`  ${name} ${type} ${piece} ${at}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
