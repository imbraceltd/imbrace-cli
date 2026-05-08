import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

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
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/${args.flowId}/publish`,
        { method: "POST", body: {} },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}\n  Run 'imbrace workflow enable ${args.flowId}' to start auto-triggering.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
