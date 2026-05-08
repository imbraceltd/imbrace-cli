import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

export default class WorkflowMcpDelete extends BaseCommand {
  static description = "Delete an MCP server. Any client using its token will lose access.";

  static examples = [
    "imbrace workflow mcp delete <mcpId> --yes",
    "imbrace workflow mcp delete <mcpId> --yes --json",
  ];

  static args = {
    mcpId: Args.string({ description: "MCP server ID", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowMcpDelete);

    if (!flags.yes && !flags.json) {
      const ok = await confirm({ message: `Delete MCP server ${args.mcpId}?`, default: false });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const client = getClient();
      await client.workflows.deleteMcpServer(args.mcpId);
      const message = "MCP server deleted";

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
