import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class WorkflowRunDetail extends BaseCommand {
  static description = "Get details of a single workflow run (status, failed step, timing)";

  static examples = [
    "imbrace workflow run-detail <runId>",
    "imbrace workflow run-detail <runId> --json",
  ];

  static args = {
    runId: Args.string({ description: "Run ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowRunDetail);
    const runId = args.runId ?? (flags.json ? this.error("Run ID is required") : await input({ message: "Run ID:" }));

    try {
      const client = getClient();
      const data = await client.workflows.getRun(runId);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const r: any = data || {};
      const dur = r.startTime && r.finishTime
        ? `${((new Date(r.finishTime).getTime() - new Date(r.startTime).getTime()) / 1000).toFixed(2)}s`
        : "—";

      this.log(`\n  Run ID:       ${r.id || ""}`);
      this.log(`  Flow ID:      ${r.flowId || ""}`);
      this.log(`  Flow name:    ${r.flowVersion?.displayName || ""}`);
      this.log(`  Status:       ${r.status || ""}`);
      this.log(`  Environment:  ${r.environment || ""}`);
      this.log(`  Started:      ${r.startTime || ""}`);
      this.log(`  Finished:     ${r.finishTime || ""}`);
      this.log(`  Duration:     ${dur}`);
      if (r.failedStep && Object.keys(r.failedStep).length > 0) {
        this.log(`  Failed step:  ${JSON.stringify(r.failedStep)}`);
      }
      if (r.logsFileId) {
        this.log(`  Logs file ID: ${r.logsFileId}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
