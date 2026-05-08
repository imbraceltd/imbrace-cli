import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowConnDelete extends BaseCommand {
  static description = "Delete a connection";

  static examples = [
    "imbrace workflow conn delete <connId> --yes",
    "imbrace workflow conn delete <connId> --yes --json",
  ];

  static args = {
    connId: Args.string({ description: "Connection ID", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowConnDelete);

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete connection ${args.connId}?`, default: false });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        `/workflow/conn/${args.connId}`,
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
