import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowMcpList extends BaseCommand {
  static description = "List MCP (Model Context Protocol) servers for the project";

  static examples = [
    "imbrace workflow mcp list",
    "imbrace workflow mcp list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowMcpList);

    try {
      const res = await apiRequest<{ ok: boolean; count: number; data: any[] }>("/workflow/mcp/list");

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n  Found ${res.count} MCP server(s):\n`);
      this.log("  ID                       NAME                       TOOLS");
      this.log("  ──────────────────────────────────────────────────────────");
      for (const m of res.data || []) {
        const id = (m.id || "").padEnd(24);
        const name = (m.name || "").padEnd(26);
        const tools = (m.tools || []).length;
        this.log(`  ${id} ${name} ${tools}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
