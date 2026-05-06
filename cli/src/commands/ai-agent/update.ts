import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class AiAgentUpdate extends BaseCommand {
  static description = "Update an AI agent";

  static examples = [
    'imbrace ai-agent update <id> --name "New Name" --json',
    'imbrace ai-agent update <id> --instructions "Updated prompt" --json',
  ];

  static args = {
    id: Args.string({ description: "Agent ID" }),
  };

  static flags = {
    name: Flags.string({ char: "n", description: "New name" }),
    instructions: Flags.string({ char: "i", description: "New instructions/prompt" }),
    model: Flags.string({ description: "LLM model (e.g. gpt-4o)" }),
    description: Flags.string({ char: "d", description: "New description" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(AiAgentUpdate);

    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    const body: Record<string, any> = {};
    if (flags.name) body.name = flags.name;
    if (flags.instructions) body.instructions = flags.instructions;
    if (flags.model) body.model = flags.model;
    if (flags.description) body.description = flags.description;

    if (Object.keys(body).length === 0) {
      this.error("Provide at least one field to update (--name, --instructions, --model, --description)");
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/ai-agent/${id}`,
        { method: "PUT", body }
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
