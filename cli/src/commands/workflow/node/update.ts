import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowNodeUpdate extends BaseCommand {
  static description = "Update a node's input or display name (preserves piece + action/trigger)";

  static examples = [
    'imbrace workflow node update <flowId> step_1 --input \'{"prompt":"new prompt"}\' --json',
    'imbrace workflow node update <flowId> step_1 --display-name "Ask AI" --json',
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
    nodeName: Args.string({ description: "Node name (e.g. 'trigger', 'step_1')", required: true }),
  };

  static flags = {
    input: Flags.string({ description: "New JSON input (replaces current)" }),
    "display-name": Flags.string({ description: "New display name" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowNodeUpdate);

    if (!flags.input && !flags["display-name"]) {
      this.error("Provide at least --input or --display-name to update");
    }

    const body: Record<string, any> = {};
    if (flags.input) {
      try {
        body.input = JSON.parse(flags.input);
      } catch (e: any) {
        this.error(`--input is not valid JSON: ${e.message}`);
      }
    }
    if (flags["display-name"]) body.displayName = flags["display-name"];

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/${args.flowId}/nodes/${args.nodeName}`,
        { method: "PUT", body },
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
