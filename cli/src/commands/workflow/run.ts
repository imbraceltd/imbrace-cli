import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

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

    try {
      const client = getClient();
      const data = flags.sync
        ? await client.workflows.triggerFlowSync(args.flowId, payload)
        : await client.workflows.triggerFlow(args.flowId, payload);
      const message = flags.sync ? "Workflow run completed" : "Workflow run triggered";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, mode: flags.sync ? "sync" : "async", data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (flags.sync && data) {
        this.log(`\n  Result:\n${JSON.stringify(data, null, 2).split("\n").map(l => "    " + l).join("\n")}`);
      } else if (!flags.sync) {
        this.log(`\n  (async — use 'imbrace workflow runs' to check execution status)`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
