import { Flags } from "@oclif/core";
import { BaseCommand } from "../../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../../lib/client.js";

export default class WorkflowFolderCreate extends BaseCommand {
  static description = "Create a new folder for organizing workflows";

  static examples = [
    'imbrace workflow folder create --name "Sales Automations" --json',
    'imbrace workflow folder create --name "Internal Tools" --id-only',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Folder name (required)" }),
    "project-id": Flags.string({ description: "Project ID. Auto-discovered if omitted." }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new folder ID (pipe-friendly)" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowFolderCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Folder name:" }));

    try {
      const client = getClient();
      const projectId = flags["project-id"] || (await client.workflows.resolveProjectId());
      const data: any = await client.workflows.createFolder({ displayName: name, projectId } as any);
      const message = `Folder "${name}" created`;

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
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
