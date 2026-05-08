import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { getClient } from "../../../lib/client.js";
import { resolveProjectId } from "../../../lib/workflow.js";

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
      const client = getClient();
      const projectId = await resolveProjectId(client);
      const res = await client.workflows.listMcpServers(projectId) as any;
      const data: any[] = res?.data ?? [];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} MCP server(s):\n`);
      this.log("  ID                       NAME                       TOOLS");
      this.log("  ──────────────────────────────────────────────────────────");
      for (const m of data) {
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
