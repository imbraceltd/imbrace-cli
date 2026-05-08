import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

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
      const client = getClient();
      await client.workflows.deleteConnection(args.connId);
      const message = "Connection deleted";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
