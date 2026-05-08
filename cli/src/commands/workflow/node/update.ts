import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";
import { buildPropertySettings, fetchPieceMeta, flattenNodes } from "../../../lib/workflow.js";

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

    let parsedInput: Record<string, any> | undefined;
    if (flags.input) {
      try {
        parsedInput = JSON.parse(flags.input);
      } catch (e: any) {
        this.error(`--input is not valid JSON: ${e.message}`);
      }
    }

    try {
      const client = getClient();
      const flow = await client.workflows.getFlow(args.flowId) as any;
      const nodes = flattenNodes(flow?.version?.trigger);
      const cur = nodes.find((n) => n.name === args.nodeName);
      if (!cur) this.error(`Node "${args.nodeName}" not found`);

      const isTrigger = args.nodeName === "trigger";
      const opType = isTrigger ? "UPDATE_TRIGGER" : "UPDATE_ACTION";
      const newInput = parsedInput ?? cur!.input ?? {};
      const pieceVersion = (await fetchPieceMeta(cur!.pieceName!)).version;

      const baseSettings: Record<string, any> = {
        pieceName: cur!.pieceName,
        pieceVersion,
        input: newInput,
        propertySettings: buildPropertySettings(newInput),
        sampleData: {},
      };
      if (isTrigger) baseSettings.triggerName = cur!.triggerName;
      else {
        baseSettings.actionName = cur!.actionName;
        baseSettings.errorHandlingOptions = {
          retryOnFailure: { value: false },
          continueOnFailure: { value: false },
        };
      }

      const op = {
        type: opType,
        request: {
          name: args.nodeName,
          type: cur!.type,
          displayName: flags["display-name"] ?? cur!.displayName,
          settings: baseSettings,
          valid: true,
        },
      };
      const data = await client.workflows.applyFlowOperation(args.flowId, op as any);
      const message = `Node "${args.nodeName}" updated`;

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
