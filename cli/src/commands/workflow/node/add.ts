import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";
import {
  buildPropertySettings,
  fetchPieceMeta,
  flattenNodes,
  nextStepName,
  normalizePieceName,
} from "../../../lib/workflow.js";

export default class WorkflowNodeAdd extends BaseCommand {
  static description = "Add a trigger or action node to a workflow";

  static examples = [
    'imbrace workflow node add <flowId> --type trigger --piece webhook --trigger-name catch_webhook --json',
    'imbrace workflow node add <flowId> --type action --piece slack --action-name send_channel_message --input \'{"channel":"C1","text":"hi"}\' --json',
    'imbrace workflow node add <flowId> --type action --piece ai-connector --action-name ask --after step_1 --input \'{"prompt":"hello","modelName":"gpt-4o"}\' --json',
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    type: Flags.string({ description: "Node type", options: ["trigger", "action"], required: true }),
    piece: Flags.string({ description: "Piece name (e.g. 'slack' or '@activepieces/piece-slack')", required: true }),
    "trigger-name": Flags.string({ description: "Trigger identifier (when --type trigger)" }),
    "action-name": Flags.string({ description: "Action identifier (when --type action)" }),
    after: Flags.string({ description: "Place new action after this step name (default: end of chain)" }),
    name: Flags.string({ description: "Override auto-generated step_N name" }),
    "display-name": Flags.string({ description: "UI display name" }),
    input: Flags.string({ description: "JSON string with field values (e.g. '{\"channel\":\"C1\",\"text\":\"hi\"}')" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowNodeAdd);

    if (flags.type === "trigger" && !flags["trigger-name"]) {
      this.error("--trigger-name is required when --type=trigger");
    }
    if (flags.type === "action" && !flags["action-name"]) {
      this.error("--action-name is required when --type=action");
    }

    let parsedInput: Record<string, any> = {};
    if (flags.input) {
      try {
        parsedInput = JSON.parse(flags.input);
      } catch (e: any) {
        this.error(`--input is not valid JSON: ${e.message}`);
      }
    }

    try {
      const client = getClient();
      const pieceName = normalizePieceName(flags.piece);
      const pieceVersion = (await fetchPieceMeta(pieceName)).version;
      const propertySettings = buildPropertySettings(parsedInput);

      if (flags.type === "trigger") {
        const op = {
          type: "UPDATE_TRIGGER",
          request: {
            name: "trigger",
            type: "PIECE_TRIGGER",
            displayName: flags["display-name"] || flags["trigger-name"],
            settings: {
              pieceName,
              pieceVersion,
              triggerName: flags["trigger-name"],
              input: parsedInput,
              propertySettings,
              sampleData: {},
            },
            valid: true,
          },
        };
        const data = await client.workflows.applyFlowOperation(args.flowId, op as any);
        const message = "Trigger set";

        if (flags.json) {
          this.log(JSON.stringify({ ok: true, message, data }, null, 2));
          return;
        }
        this.log(`\n✅ ${message}\n`);
        return;
      }

      // type === "action"
      const flow = await client.workflows.getFlow(args.flowId) as any;
      const trigger = flow?.version?.trigger;
      const parentStep = flags.after || (() => {
        const nodes = flattenNodes(trigger);
        return nodes.length > 0 ? nodes[nodes.length - 1].name : "trigger";
      })();
      const stepName = flags.name || nextStepName(trigger);

      const op = {
        type: "ADD_ACTION",
        request: {
          parentStep,
          action: {
            name: stepName,
            type: "PIECE",
            displayName: flags["display-name"] || flags["action-name"],
            settings: {
              pieceName,
              pieceVersion,
              actionName: flags["action-name"],
              input: parsedInput,
              propertySettings,
              sampleData: {},
              errorHandlingOptions: {
                retryOnFailure: { value: false },
                continueOnFailure: { value: false },
              },
            },
            valid: true,
          },
        },
      };
      const data = await client.workflows.applyFlowOperation(args.flowId, op as any);
      const message = `Action "${stepName}" added after ${parentStep}`;

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data: { stepName, parentStep, flow: data } }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      this.log(`   Step: ${stepName} (after ${parentStep})`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
