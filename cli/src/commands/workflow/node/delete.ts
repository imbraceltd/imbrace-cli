import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowNodeDelete extends BaseCommand {
  static description = "Delete an action node from a workflow (cannot delete trigger — replace it via `node add --type trigger`)";

  static examples = [
    "imbrace workflow node delete <flowId> step_1 --yes",
    "imbrace workflow node delete <flowId> step_2 --yes --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
    nodeName: Args.string({ description: "Node name (e.g. 'step_1')", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowNodeDelete);

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete node "${args.nodeName}" from flow ${args.flowId}?`, default: false });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/${args.flowId}/nodes/${args.nodeName}`,
        { method: "DELETE" },
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
