import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class WorkflowDisable extends BaseCommand {
  static description = "Stop auto-trigger on a workflow (keeps published version intact)";

  static examples = [
    "imbrace workflow disable <flowId>",
    "imbrace workflow disable <flowId> --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowDisable);

    try {
      const client = getClient();
      const data = await client.workflows.applyFlowOperation(args.flowId, {
        type: "CHANGE_STATUS",
        request: { status: "DISABLED" },
      } as any);
      const message = "Workflow disabled";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
