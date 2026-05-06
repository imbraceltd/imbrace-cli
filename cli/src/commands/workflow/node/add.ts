import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

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

    const body: Record<string, any> = {
      type: flags.type,
      piece: flags.piece,
      input: parsedInput,
    };
    if (flags["trigger-name"]) body.triggerName = flags["trigger-name"];
    if (flags["action-name"]) body.actionName = flags["action-name"];
    if (flags.after) body.after = flags.after;
    if (flags.name) body.name = flags.name;
    if (flags["display-name"]) body.displayName = flags["display-name"];

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/workflow/${args.flowId}/nodes`,
        { method: "POST", body },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}`);
      if (res.data?.stepName) this.log(`   Step: ${res.data.stepName} (after ${res.data.parentStep})`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
