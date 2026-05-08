import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class WorkflowPublish extends BaseCommand {
  static description = "Lock the current draft and publish it as the production version. Required before 'workflow enable'.";

  static examples = [
    "imbrace workflow publish <flowId>",
    "imbrace workflow publish <flowId> --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowPublish);

    try {
      const client = getClient();
      const data = await client.workflows.applyFlowOperation(args.flowId, {
        type: "LOCK_AND_PUBLISH",
        request: {},
      } as any);
      const message = "Workflow published";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n  Run 'imbrace workflow enable ${args.flowId}' to start auto-triggering.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
