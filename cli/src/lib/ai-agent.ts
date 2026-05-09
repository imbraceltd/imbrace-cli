// AI Agent payload builders — mirror the legacy api/src/routes/ai-agent.ts
// behavior so command output stays consistent across the api→sdk migration.

import { getClient } from "./client.js";
import { fetchSystemModels, gatewayFetch, GW } from "./gateway.js";

export interface CreateAgentInput {
  name: string;
  description?: string;
  instructions?: string;
  model?: string;
  provider_id?: string;
  mode?: string;
  agent_type?: string;
  channel?: string;
  category?: string[] | string;
  // Behavior Settings
  personality_role?: string;
  core_task?: string;
  tone_and_style?: string;
  response_length?: string;
  banned_words?: string;
  preload_information?: string;
  guardrail_id?: string;
  show_thinking_process?: boolean;
  streaming?: boolean;
  use_memory?: boolean;
  temperature?: number;
  // Knowledge Support
  knowledge_hubs?: string[];
  folder_ids?: string[];
  default_folder_id?: string;
  board_ids?: string[];
  file_ids?: string[];
}

export async function createAgent(body: CreateAgentInput) {
  const client = getClient();
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const workflowName = `${slug}_v${Date.now()}`;

  const agentType = body.agent_type || "agent";

  const data = await client.agent.createUseCase({
    usecase: {
      title: body.name,
      short_description: body.description || "",
      agent_type: agentType,
      demo_url: "https://chat-widgetv2.imbrace.co",
      supported_channels: [{ title: "channel_", icon: "" }],
    },
    assistant: {
      name: body.name,
      description: body.description || "",
      instructions: body.instructions || "",
      workflow_name: workflowName,
      credential_name: `${body.mode || "standard"} | ${body.name}`,
      provider_id: body.provider_id || "system",
      model_id: body.model || "Default",
      agent_type: agentType,
      mode: body.mode || "standard",
      version: 2,
      channel: body.channel || "",
      category: body.category || ["Support"],
      personality_role: body.personality_role || "",
      core_task: body.core_task || "",
      tone_and_style: body.tone_and_style || "",
      response_length: body.response_length || "",
      banned_words: body.banned_words || "",
      preload_information: body.preload_information || "",
      guardrail_id: body.guardrail_id || "",
      show_thinking_process: body.show_thinking_process ?? false,
      streaming: body.streaming ?? true,
      use_memory: body.use_memory ?? true,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.1,
      knowledge_hubs: body.knowledge_hubs || [],
      folder_ids: body.folder_ids || [],
      default_folder_id: body.default_folder_id || "",
      board_ids: body.board_ids || [],
      file_ids: body.file_ids || [],
      workflow_function_call: [],
      sub_agents: [],
      team_leads: [],
      metadata: {
        other_requirements: [],
        channel_id: "",
        team_ids: [],
        tool_server: null,
        enable_echart: false,
        top_k_relevant_results: 3,
        top_k: 40,
        max_steps: 10,
      },
    },
  } as any) as any;

  return data?.data ?? data;
}

const ASSISTANT_FIELDS = [
  "instructions", "description", "provider_id",
  "personality_role", "core_task", "tone_and_style", "response_length",
  "banned_words", "category", "guardrail_id", "preload_information", "channel",
  "folder_ids", "default_folder_id", "knowledge_hubs", "board_ids", "file_ids",
];

export async function updateAgent(id: string, body: Record<string, any>) {
  const client = getClient();
  const tpl = (await client.agent.get(id) as any)?.data ?? {};
  const assistantId = tpl.assistant_id;

  const results: any = {};

  const hasAssistantUpdate =
    assistantId && (body.name || body.model || typeof body.temperature === "number" ||
      typeof body.streaming === "boolean" || typeof body.use_memory === "boolean" ||
      typeof body.show_thinking_process === "boolean" || body.mode ||
      ASSISTANT_FIELDS.some((f) => body[f] !== undefined));

  if (hasAssistantUpdate) {
    // chatAi.updateAiAgent uses PUT (full replace) — fetch+merge so unchanged
    // fields aren't reset to null.
    const currentAssistant = await gatewayFetch<any>(`/v3/ai/assistants/${assistantId}`);

    const aUpdate: Record<string, any> = {
      ...currentAssistant,
      name: body.name ?? currentAssistant.name,
      workflow_name: currentAssistant.workflow_name ||
        `${(body.name ?? currentAssistant.name).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_v${Date.now()}`,
    };
    if (body.model) aUpdate.model_id = body.model;
    if (body.mode) aUpdate.mode = body.mode;
    if (typeof body.temperature === "number") aUpdate.temperature = body.temperature;
    if (typeof body.streaming === "boolean") aUpdate.streaming = body.streaming;
    if (typeof body.use_memory === "boolean") aUpdate.use_memory = body.use_memory;
    if (typeof body.show_thinking_process === "boolean") aUpdate.show_thinking_process = body.show_thinking_process;
    for (const f of ASSISTANT_FIELDS) {
      if (body[f] !== undefined) aUpdate[f] = body[f];
    }
    results.assistant = await client.chatAi.updateAiAgent(assistantId, aUpdate);
  }

  if (body.name || body.description) {
    const tUpdate: Record<string, any> = {};
    if (body.name) tUpdate.title = body.name;
    if (body.description) tUpdate.short_description = body.description;
    results.template = await client.agent.updateUseCase(id, tUpdate);
  }

  if (Object.keys(results).length === 0) {
    throw new Error("No update fields provided");
  }
  return results;
}

export async function listProviders() {
  const client = getClient();
  const [r, systemModels] = await Promise.all([
    client.ai.listProviders() as Promise<any>,
    fetchSystemModels(),
  ]);
  const arr = (r?.data || r) as any[];
  return [
    { id: "system", _id: "system", provider_id: "system", name: "system", type: "system", is_default: true, models: systemModels },
    ...arr.map((p) => ({
      id: p.provider_id || p._id,
      _id: p._id,
      provider_id: p.provider_id || p._id,
      name: p.name,
      type: p.type,
      is_default: false,
      models: (p.models || []).map((m: any) => typeof m === "string" ? m : m.name),
    })),
  ];
}

export async function listProviderModels(providerId: string) {
  if (providerId === "system") return fetchSystemModels();
  const client = getClient();
  const r = await client.ai.listProviders() as any;
  const arr = (r?.data || r) as any[];
  const provider = arr.find((p) => p.provider_id === providerId || p._id === providerId);
  if (!provider) throw new Error(`Provider "${providerId}" not found`);
  return (provider.models || []).map((m: any) => typeof m === "string" ? m : m.name);
}

export { GW };
