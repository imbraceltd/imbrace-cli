import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class WorkflowRuns extends BaseCommand {
  static description = "List recent workflow runs (execution history)";

  static examples = [
    "imbrace workflow runs",
    "imbrace workflow runs --limit 20 --json",
  ];

  static flags = {
    limit: Flags.integer({ description: "Max number of runs to return", default: 10 }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowRuns);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>(
        `/workflow/runs?limit=${flags.limit}`,
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} run(s):\n`);
      this.log("  RUN ID                   FLOW ID                  STATUS       DURATION");
      this.log("  ───────────────────────────────────────────────────────────────────────");
      for (const run of res.data || []) {
        const id = (run.id || "").padEnd(24);
        const flowId = (run.flowId || "").padEnd(24);
        const status = (run.status || "").padEnd(12);
        const dur = run.startTime && run.finishTime
          ? `${((new Date(run.finishTime).getTime() - new Date(run.startTime).getTime()) / 1000).toFixed(1)}s`
          : "—";
        this.log(`  ${id} ${flowId} ${status} ${dur}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
