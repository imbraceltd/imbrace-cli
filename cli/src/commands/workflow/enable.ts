import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class WorkflowEnable extends BaseCommand {
  static description = "Enable auto-trigger on a workflow. Requires `workflow publish` first.";

  static examples = [
    "imbrace workflow enable <flowId>",
    "imbrace workflow enable <flowId> --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowEnable);

    try {
      const client = getClient();
      const data = await client.workflows.applyFlowOperation(args.flowId, {
        type: "CHANGE_STATUS",
        request: { status: "ENABLED" },
      } as any);
      const message = "Workflow enabled";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      // Common error: trying to enable before publish
      if (/publishedFlowVersionId/.test(error.message || "")) {
        this.error(`Cannot enable an unpublished workflow. Run 'imbrace workflow publish ${args.flowId}' first.`);
      }
      this.error(`Failed: ${error.message}`);
    }
  }
}
