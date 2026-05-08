import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../../http.js";

export default class WorkflowMcpGet extends BaseCommand {
  static description = "Get details of a single MCP server (token is NOT shown — use rotate-token to get a new one)";

  static examples = [
    "imbrace workflow mcp get <mcpId>",
    "imbrace workflow mcp get <mcpId> --json",
  ];

  static args = {
    mcpId: Args.string({ description: "MCP server ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowMcpGet);
    const mcpId = args.mcpId ?? (flags.json ? this.error("MCP ID is required") : await input({ message: "MCP server ID:" }));

    try {
      const res = await apiRequest<{ ok: boolean; data: any }>(`/workflow/mcp/${mcpId}`);

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      const m = res.data || {};
      this.log(`\n  ID:           ${m.id || ""}`);
      this.log(`  Name:         ${m.name || ""}`);
      this.log(`  Project ID:   ${m.projectId || ""}`);
      this.log(`  External ID:  ${m.externalId || ""}`);
      this.log(`  Tools:        ${(m.tools || []).length}`);
      this.log(`  Created:      ${m.created || ""}`);
      this.log(`  Updated:      ${m.updated || ""}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
