import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { apiRequest } from "../../http.js";

export default class AiAgentCreate extends BaseCommand {
  static description = "Create a new AI agent";

  static examples = [
    'imbrace ai-agent create --name "Sales Bot" --json',
    'imbrace ai-agent create --name "Support Bot" --instructions "You are a support agent" --json',
    'imbrace ai-agent create --name "Custom" --provider-id <id> --model qwen3.5-27b --temperature 0.7 --json',
  ];

  static flags = {
    // Identity
    name: Flags.string({ char: "n", description: "Agent name" }),
    description: Flags.string({ char: "d", description: "Agent description" }),
    instructions: Flags.string({ char: "i", description: "Agent instructions/prompt" }),
    // Model — discover via list-providers / list-models
    model: Flags.string({ description: "LLM model (e.g. gpt-4o, qwen3.5-27b). Default: gpt-4o" }),
    "provider-id": Flags.string({ description: "LLM provider ID. Default 'system'. Use 'imbrace ai-agent list-providers' to discover." }),
    mode: Flags.string({ description: "Agent mode (default: standard)", options: ["standard", "advanced"] }),
    temperature: Flags.string({ description: "Model temperature 0.0-2.0 (default: 0.1). Lower = deterministic, higher = creative." }),
    // Behavior Settings (UI tab)
    personality: Flags.string({ description: "Agent personality / role (e.g. 'You are a friendly support rep')" }),
    "core-task": Flags.string({ description: "Core task description" }),
    tone: Flags.string({ description: "Tone and style (e.g. 'Polite, professional')" }),
    "response-length": Flags.string({ description: "Response length", options: ["short", "medium", "long"] }),
    "banned-words": Flags.string({ description: "Comma-separated banned words. Word-level filter on outputs (for topic refusal use --instructions)." }),
    category: Flags.string({
      description: "Agent category (default: Support).",
      options: ["Support", "Sales", "Marketing", "Team", "Other"],
    }),
    "guardrail-id": Flags.string({ description: "Attach a guardrail by ID" }),
    "preload-information": Flags.string({ description: "Static info auto-injected into context every chat" }),
    // Knowledge Support (UI tab) — comma-separated IDs
    "folder-ids": Flags.string({ description: "Comma-separated Knowledge Hub folder IDs (RAG sources)" }),
    "default-folder-id": Flags.string({ description: "Default folder ID for new files" }),
    "knowledge-hubs": Flags.string({ description: "Comma-separated Knowledge Hub IDs" }),
    "board-ids": Flags.string({ description: "Comma-separated Document Model (data board) IDs" }),
    "file-ids": Flags.string({ description: "Comma-separated file IDs already uploaded to Knowledge Hub" }),
    // Behavior runtime toggles
    "show-thinking": Flags.boolean({ description: "Show model's thinking process (default: false)", allowNo: true }),
    streaming: Flags.boolean({ description: "Stream response token-by-token (default: true)", allowNo: true }),
    "use-memory": Flags.boolean({ description: "Remember conversation context across turns (default: true)", allowNo: true }),
    // Output
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new agent ID (for piping)" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Agent name:" }));
    const instructions = flags.instructions ?? (nonInteractive ? undefined : await input({ message: "Instructions (optional, press Enter to skip):", default: "" }));

    const body: Record<string, any> = {
      name,
      ...(instructions && { instructions }),
      ...(flags.description && { description: flags.description }),
      ...(flags.model && { model: flags.model }),
      ...(flags["provider-id"] && { provider_id: flags["provider-id"] }),
      ...(flags.mode && { mode: flags.mode }),
      ...(flags.temperature && { temperature: parseFloat(flags.temperature) }),
      ...(flags.personality && { personality_role: flags.personality }),
      ...(flags["core-task"] && { core_task: flags["core-task"] }),
      ...(flags.tone && { tone_and_style: flags.tone }),
      ...(flags["response-length"] && { response_length: flags["response-length"] }),
      ...(flags["banned-words"] && { banned_words: flags["banned-words"] }),
      ...(flags.category && { category: [flags.category] }),
      ...(flags["guardrail-id"] && { guardrail_id: flags["guardrail-id"] }),
      ...(flags["preload-information"] && { preload_information: flags["preload-information"] }),
      ...(flags["folder-ids"] && { folder_ids: flags["folder-ids"].split(",").map(s => s.trim()).filter(Boolean) }),
      ...(flags["default-folder-id"] && { default_folder_id: flags["default-folder-id"] }),
      ...(flags["knowledge-hubs"] && { knowledge_hubs: flags["knowledge-hubs"].split(",").map(s => s.trim()).filter(Boolean) }),
      ...(flags["board-ids"] && { board_ids: flags["board-ids"].split(",").map(s => s.trim()).filter(Boolean) }),
      ...(flags["file-ids"] && { file_ids: flags["file-ids"].split(",").map(s => s.trim()).filter(Boolean) }),
      ...(flags["show-thinking"] !== undefined && { show_thinking_process: flags["show-thinking"] }),
      ...(flags.streaming !== undefined && { streaming: flags.streaming }),
      ...(flags["use-memory"] !== undefined && { use_memory: flags["use-memory"] }),
    };

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        "/ai-agent/create",
        { method: "POST", body },
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
