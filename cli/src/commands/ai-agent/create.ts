import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class AiAgentCreate extends BaseCommand {
  static description = "Create a new AI agent";

  static examples = [
    'imbrace ai-agent create --name "Sales Bot" --json',
    'imbrace ai-agent create --name "Support Bot" --instructions "You are a support agent" --json',
    'imbrace ai-agent create --name "Customer Care" --description "..." --instructions "..." --personality "..." --tone "..." --json',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Agent name" }),
    instructions: Flags.string({ char: "i", description: "Agent instructions/prompt" }),
    model: Flags.string({ description: "LLM model (e.g. gpt-4o)" }),
    description: Flags.string({ char: "d", description: "Agent description" }),
    // Behavior Settings (UI tab)
    personality: Flags.string({ description: "Agent personality / role (e.g. 'You are a friendly support rep')" }),
    "core-task": Flags.string({ description: "Core task description" }),
    tone: Flags.string({ description: "Tone and style (e.g. 'Polite, professional')" }),
    "response-length": Flags.string({ description: "Response length preference (short/medium/long)" }),
    "banned-words": Flags.string({ description: "Comma-separated banned words. Word-level filter applied to the assistant's outputs (not topic-level — for topic refusal use --instructions)." }),
    category: Flags.string({
      description: "Agent category. UI valid values: Support, Sales, Marketing, Team, Other (default: Support). Backend accepts arbitrary strings.",
      options: ["Support", "Sales", "Marketing", "Team", "Other"],
    }),
    "guardrail-id": Flags.string({ description: "Attach a guardrail by ID" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new agent ID (for piping into other commands)" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Agent name:" }));
    const instructions = flags.instructions ?? (nonInteractive ? undefined : await input({ message: "Instructions (optional, press Enter to skip):", default: "" }));

    const body: Record<string, any> = {
      name,
      ...(instructions && { instructions }),
      ...(flags.model && { model: flags.model }),
      ...(flags.description && { description: flags.description }),
      ...(flags.personality && { personality_role: flags.personality }),
      ...(flags["core-task"] && { core_task: flags["core-task"] }),
      ...(flags.tone && { tone_and_style: flags.tone }),
      ...(flags["response-length"] && { response_length: flags["response-length"] }),
      ...(flags["banned-words"] && { banned_words: flags["banned-words"] }),
      ...(flags.category && { category: [flags.category] }),
      ...(flags["guardrail-id"] && { guardrail_id: flags["guardrail-id"] }),
    };

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        "/ai-agent/create",
        { method: "POST", body }
      );

      if (flags["id-only"]) {
        this.log(res.data?._id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}`);
      if (res.data?._id) this.log(`   ID: ${res.data._id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
