import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class WorkflowCreate extends BaseCommand {
  static description = "Create a new workflow (empty — add nodes via UI builder or `workflow node add`)";

  static examples = [
    'imbrace workflow create --name "My Flow" --json',
    'imbrace workflow create --name "Slack Bot" --id-only',
    'imbrace workflow create --name "Lead handler" --folder-id <folderId>',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Workflow display name (required)" }),
    "project-id": Flags.string({ description: "Project ID. Auto-discovered from existing flows if omitted." }),
    "folder-id": Flags.string({ description: "Place the flow in this folder (use 'imbrace workflow folder list' to discover)." }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new workflow ID (pipe-friendly)" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Workflow name:" }));

    try {
      const client = getClient();
      const projectId = flags["project-id"] || (await client.workflows.resolveProjectId());
      const createBody: Record<string, any> = { displayName: name, projectId };
      if (flags["folder-id"]) createBody.folderId = flags["folder-id"];
      const data: any = await client.workflows.createFlow(createBody as any);
      const message = `Workflow "${name}" created`;

      if (flags["id-only"]) {
        this.log(data?.id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if (data?.id) this.log(`   ID: ${data.id}`);
      if (data?.projectId) this.log(`   Project: ${data.projectId}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
