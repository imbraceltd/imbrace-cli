import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

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
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/${args.flowId}/disable`,
        { method: "POST", body: {} },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
