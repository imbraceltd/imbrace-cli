import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

export default class WorkflowMcpCreate extends BaseCommand {
  static description = "Create a new MCP (Model Context Protocol) server. The token is shown once at creation — save it.";

  static examples = [
    'imbrace workflow mcp create --name "My MCP" --json',
    'imbrace workflow mcp create --name "Claude MCP" --id-only',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "MCP server name (required)" }),
    "project-id": Flags.string({ description: "Project ID. Auto-discovered if omitted." }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new MCP ID (pipe-friendly)" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowMcpCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "MCP name:" }));

    try {
      const client = getClient();
      const projectId = flags["project-id"] || (await client.workflows.resolveProjectId());
      const data: any = await client.workflows.createMcpServer({ name, projectId } as any);
      const message = `MCP server "${name}" created`;

      if (flags["id-only"]) {
        this.log(data?.id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      const m: any = data || {};
      this.log(`\n✅ ${message}`);
      this.log(`   ID:    ${m.id}`);
      this.log(`   Token: ${m.token}`);
      this.log(`\n  ⚠️  Save the token now — it WON'T be shown again. Use 'mcp rotate-token <id>' to issue a new one.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
