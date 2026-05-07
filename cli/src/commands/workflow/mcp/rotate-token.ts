import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { confirm } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowMcpRotateToken extends BaseCommand {
  static description = "Rotate the access token of an MCP server. Old token stops working immediately.";

  static examples = [
    "imbrace workflow mcp rotate-token <mcpId> --yes",
    "imbrace workflow mcp rotate-token <mcpId> --yes --json",
  ];

  static args = {
    mcpId: Args.string({ description: "MCP server ID", required: true }),
  };

  static flags = {
    yes: Flags.boolean({ char: "y", description: "Skip confirmation" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowMcpRotateToken);

    if (!flags.yes && !flags.json) {
      const ok = await confirm({
        message: `Rotate token for MCP ${args.mcpId}? Old token stops working immediately.`,
        default: false,
      });
      if (!ok) {
        this.log("Cancelled.");
        return;
      }
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/workflow/mcp/${args.mcpId}/rotate-token`,
        { method: "POST", body: {} },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      const m = res.data || {};
      this.log(`\n✅ ${res.message}`);
      this.log(`   ID:        ${m.id}`);
      this.log(`   New token: ${m.token}`);
      this.log(`\n  ⚠️  Update any clients using the old token.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
