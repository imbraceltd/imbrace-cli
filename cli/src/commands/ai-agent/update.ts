import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { updateAgent } from "../../lib/ai-agent.js";

export default class AiAgentUpdate extends BaseCommand {
  static description = "Update an AI agent. Pass any subset of flags — others stay unchanged.";

  static examples = [
    'imbrace ai-agent update <id> --name "New Name" --json',
    'imbrace ai-agent update <id> --instructions "Updated prompt" --json',
    'imbrace ai-agent update <id> --temperature 0.7 --tone "More casual" --json',
    'imbrace ai-agent update <id> --no-streaming --no-use-memory --json',
  ];

  static args = {
    id: Args.string({ description: "Agent ID" }),
  };

  static flags = {
    // Identity
    name: Flags.string({ char: "n", description: "New name" }),
    description: Flags.string({ char: "d", description: "New description" }),
    instructions: Flags.string({ char: "i", description: "New instructions/prompt" }),
    // Model
    model: Flags.string({ description: "LLM model (e.g. gpt-4o, qwen3.5-27b)" }),
    "provider-id": Flags.string({ description: "LLM provider ID" }),
    mode: Flags.string({ description: "Agent mode", options: ["standard", "advanced"] }),
    temperature: Flags.string({ description: "Model temperature 0.0-2.0" }),
    // Behavior
    personality: Flags.string({ description: "Personality / role" }),
    "core-task": Flags.string({ description: "Core task description" }),
    tone: Flags.string({ description: "Tone and style" }),
    "response-length": Flags.string({ description: "Response length", options: ["short", "medium", "long"] }),
    "banned-words": Flags.string({ description: "Comma-separated banned words" }),
    category: Flags.string({
      description: "Agent category",
      options: ["Support", "Sales", "Marketing", "Team", "Other"],
    }),
    "guardrail-id": Flags.string({ description: "Guardrail ID (set to empty string to remove)" }),
    "preload-information": Flags.string({ description: "Preload information" }),
    // Knowledge Support
    "folder-ids": Flags.string({ description: "Comma-separated Knowledge Hub folder IDs" }),
    "default-folder-id": Flags.string({ description: "Default folder ID" }),
    "knowledge-hubs": Flags.string({ description: "Comma-separated Knowledge Hub IDs" }),
    "board-ids": Flags.string({ description: "Comma-separated Document Model (data board) IDs" }),
    "file-ids": Flags.string({ description: "Comma-separated file IDs" }),
    // Runtime toggles
    "show-thinking": Flags.boolean({ description: "Show thinking process", allowNo: true }),
    streaming: Flags.boolean({ description: "Stream response", allowNo: true }),
    "use-memory": Flags.boolean({ description: "Use conversation memory", allowNo: true }),
    // Output
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(AiAgentUpdate);

    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    const body: Record<string, any> = {};
    if (flags.name) body.name = flags.name;
    if (flags.description) body.description = flags.description;
    if (flags.instructions) body.instructions = flags.instructions;
    if (flags.model) body.model = flags.model;
    if (flags["provider-id"]) body.provider_id = flags["provider-id"];
    if (flags.mode) body.mode = flags.mode;
    if (flags.temperature) body.temperature = parseFloat(flags.temperature);
    if (flags.personality !== undefined) body.personality_role = flags.personality;
    if (flags["core-task"] !== undefined) body.core_task = flags["core-task"];
    if (flags.tone !== undefined) body.tone_and_style = flags.tone;
    if (flags["response-length"]) body.response_length = flags["response-length"];
    if (flags["banned-words"] !== undefined) body.banned_words = flags["banned-words"];
    if (flags.category) body.category = [flags.category];
    if (flags["guardrail-id"] !== undefined) body.guardrail_id = flags["guardrail-id"];
    if (flags["preload-information"] !== undefined) body.preload_information = flags["preload-information"];
    if (flags["folder-ids"] !== undefined) body.folder_ids = flags["folder-ids"].split(",").map(s => s.trim()).filter(Boolean);
    if (flags["default-folder-id"] !== undefined) body.default_folder_id = flags["default-folder-id"];
    if (flags["knowledge-hubs"] !== undefined) body.knowledge_hubs = flags["knowledge-hubs"].split(",").map(s => s.trim()).filter(Boolean);
    if (flags["board-ids"] !== undefined) body.board_ids = flags["board-ids"].split(",").map(s => s.trim()).filter(Boolean);
    if (flags["file-ids"] !== undefined) body.file_ids = flags["file-ids"].split(",").map(s => s.trim()).filter(Boolean);
    if (flags["show-thinking"] !== undefined) body.show_thinking_process = flags["show-thinking"];
    if (flags.streaming !== undefined) body.streaming = flags.streaming;
    if (flags["use-memory"] !== undefined) body.use_memory = flags["use-memory"];

    if (Object.keys(body).length === 0) {
      this.error("Provide at least one field to update. See: imbrace ai-agent update -h");
    }

    try {
      const data = await updateAgent(id, body);
      const message = "AI Agent updated";

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
