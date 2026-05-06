import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class WorkflowCreate extends BaseCommand {
  static description = "Create a new workflow (empty — add nodes via UI builder or `workflow node add`)";

  static examples = [
    'imbrace workflow create --name "My Flow" --json',
    'imbrace workflow create --name "Slack Bot" --id-only',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Workflow display name (required)" }),
    "project-id": Flags.string({ description: "Project ID. Auto-discovered from existing flows if omitted." }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new workflow ID (pipe-friendly)" }),
  };

  async run() {
    const { flags } = await this.parse(WorkflowCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Workflow name:" }));

    const body: Record<string, any> = { name };
    if (flags["project-id"]) body.projectId = flags["project-id"];

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        "/workflow/create",
        { method: "POST", body },
      );

      if (flags["id-only"]) {
        this.log(res.data?.id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}`);
      if (res.data?.id) this.log(`   ID: ${res.data.id}`);
      if (res.data?.projectId) this.log(`   Project: ${res.data.projectId}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
