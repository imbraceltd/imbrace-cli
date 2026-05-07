import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { apiRequest } from "../../http.js";

export default class WorkflowRun extends BaseCommand {
  static description = "Manually trigger a workflow with a payload. Use --sync to wait for completion.";

  static examples = [
    'imbrace workflow run <flowId> --payload \'{"text":"hello"}\' --json',
    'imbrace workflow run <flowId> --payload \'{"text":"hello"}\' --sync --json',
    'imbrace workflow run <flowId>  # no payload (empty {})',
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    payload: Flags.string({ description: "JSON payload (becomes trigger.body in flow). Default: {}" }),
    sync: Flags.boolean({ description: "Wait for flow to finish (timeout ~60s). Without it, fire-and-forget." }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowRun);

    let payload: any = {};
    if (flags.payload) {
      try {
        payload = JSON.parse(flags.payload);
      } catch (e: any) {
        this.error(`--payload is not valid JSON: ${e.message}`);
      }
    }

    const qs = flags.sync ? "?sync=true" : "";

    try {
      const res = await apiRequest<{ ok: boolean; message: string; mode: string; data: any }>(
        `/workflow/${args.flowId}/run${qs}`,
        { method: "POST", body: { payload } },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}`);
      if (flags.sync && res.data) {
        this.log(`\n  Result:\n${JSON.stringify(res.data, null, 2).split("\n").map(l => "    " + l).join("\n")}`);
      } else if (!flags.sync) {
        this.log(`\n  (async — use 'imbrace workflow runs' to check execution status)`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
