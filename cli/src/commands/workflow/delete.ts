import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { confirm, input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class WorkflowDelete extends BaseCommand {
  static description = "Delete a workflow";

  static examples = [
    "imbrace workflow delete <flowId> --yes",
    "imbrace workflow delete <flowId> --yes --json",
  ];

  static args = {
    id: Args.string({ description: "Workflow ID" }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowDelete);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Workflow ID:" }));

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete workflow ${id}?`, default: false });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/${id}`,
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
