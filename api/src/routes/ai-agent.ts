import { Hono } from "hono";
import { ImbraceClient } from "@imbrace/sdk";

type Variables = { imbraceClient: ImbraceClient; credential: string };

const aiAgentRoutes = new Hono<{ Variables: Variables }>();

const GW = "https://app-gatewayv2.imbrace.co";

// GET /ai-agent/list
aiAgentRoutes.get("/list", async (c) => {
  const client = c.get("imbraceClient");
  try {
    const res = await client.agent.list();
    const data = (res as any)?.data ?? res ?? [];
    return c.json({ ok: true, count: Array.isArray(data) ? data.length : 0, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// Helper: fetch system provider models from the real backend endpoint.
async function fetchSystemModels(credential: string): Promise<string[]> {
  const authHeader = credential.startsWith("api_")
    ? { "x-api-key": credential }
    : { authorization: `Bearer ${credential}` };
  const res = await fetch(`${GW}/ai/v3/workflow-agent/models`, { headers: authHeader as any });
  if (!res.ok) return ["Default"];
  const j = await res.json() as any;
  const arr = j?.data || j?.message?.data || [];
  return arr.map((m: any) => typeof m === "string" ? m : m.name).filter(Boolean);
}

// GET /ai-agent/providers — list LLM providers (system + custom)
// Must come before /:id so "providers" doesn't get matched as an ID.
aiAgentRoutes.get("/providers", async (c) => {
  const client = c.get("imbraceClient");
  const credential = c.get("credential");
  try {
    const [r, systemModels] = await Promise.all([
      client.ai.listProviders() as Promise<any>,
      fetchSystemModels(credential),
    ]);
    const arr = (r?.data || r) as any[];
    // IMPORTANT: provider has TWO IDs — `_id` (MongoDB ObjectId) and
    // `provider_id` (UUID). The UI dropdown matches on `provider_id`. Always
    // expose `provider_id` as the canonical id so agents created via CLI
    // render correctly in the UI.
    const data = [
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
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /ai-agent/folders?q=search — list Knowledge Hub folders
aiAgentRoutes.get("/folders", async (c) => {
  const client = c.get("imbraceClient");
  const q = c.req.query("q");
  try {
    const r = await client.boards.searchFolders(q ? { q } : undefined) as any;
    const data = (Array.isArray(r) ? r : r?.data) || [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /ai-agent/folders/:folderId/files — list files in a Knowledge Hub folder
aiAgentRoutes.get("/folders/:folderId/files", async (c) => {
  const client = c.get("imbraceClient");
  const folderId = c.req.param("folderId");
  try {
    const r = await client.boards.searchFiles({ folderId }) as any;
    const data = (Array.isArray(r) ? r : r?.data) || [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /ai-agent/providers/:providerId/models — list models for a specific provider
aiAgentRoutes.get("/providers/:providerId/models", async (c) => {
  const client = c.get("imbraceClient");
  const providerId = c.req.param("providerId");
  const credential = c.get("credential");
  try {
    if (providerId === "system") {
      const models = await fetchSystemModels(credential);
      return c.json({ ok: true, count: models.length, data: models });
    }
    const r = await client.ai.listProviders() as any;
    const arr = (r?.data || r) as any[];
    // Match against either provider_id (UUID, preferred) or _id (legacy)
    const provider = arr.find((p) => p.provider_id === providerId || p._id === providerId);
    if (!provider) return c.json({ ok: false, message: `Provider "${providerId}" not found` }, 404);
    const models = (provider.models || []).map((m: any) => typeof m === "string" ? m : m.name);
    return c.json({ ok: true, count: models.length, data: models });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /ai-agent/:id
aiAgentRoutes.get("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    const data = await client.agent.get(id);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /ai-agent/create
// Body: { name, instructions?, description?, model? }
// Uses client.agent.createUseCase({ usecase, assistant }) — auto-creates assistant + channel + template
aiAgentRoutes.post("/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);

  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const workflowName = `${slug}_v${Date.now()}`;

  try {
    const data = await client.agent.createUseCase({
      usecase: {
        title: body.name,
        short_description: body.description || "",
        agent_type: "agent",
        demo_url: "https://chat-widgetv2.imbrace.co",
        supported_channels: [{ title: "channel_", icon: "" }],
      },
      // Mirror of frontend createCustomUseCase payload
      // (new-frontend/src/pages/AIAssistantManagement/useAIAssistantFormHook.tsx)
      assistant: {
        // Identity
        name: body.name,
        description: body.description || "",
        instructions: body.instructions || "",
        workflow_name: workflowName,
        credential_name: `${body.mode || "standard"} | ${body.name}`,
        // Model — system provider only has "Default" model on platform; custom
        // providers (openai, vllm, ...) have their own model lists. Caller can
        // override via --model.
        provider_id: body.provider_id || "system",
        model_id: body.model || "Default",
        // Agent / channel scope
        agent_type: "agent",
        mode: body.mode || "standard",
        version: 2,
        channel: body.channel || "",
        category: body.category || ["Support"],
        // Behavior (UI: Behavior Settings tab)
        personality_role: body.personality_role || "",
        core_task: body.core_task || "",
        tone_and_style: body.tone_and_style || "",
        response_length: body.response_length || "",
        banned_words: body.banned_words || "",
        preload_information: body.preload_information || "",
        guardrail_id: body.guardrail_id || "",
        show_thinking_process: body.show_thinking_process ?? false,
        // Behavior runtime
        streaming: body.streaming ?? true,
        use_memory: body.use_memory ?? true,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.1,
        // Knowledge (UI: Knowledge Support tab) — accept caller-provided arrays
        knowledge_hubs: body.knowledge_hubs || [],
        folder_ids: body.folder_ids || [],
        default_folder_id: body.default_folder_id || "",
        board_ids: body.board_ids || [],
        file_ids: body.file_ids || [],
        // Advanced (UI: Advanced Settings tab) — empty by default
        workflow_function_call: [],
        sub_agents: [],
        team_leads: [],
        // RAG / tooling metadata
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

    return c.json({ ok: true, message: `AI Agent "${body.name}" created`, data: data?.data ?? data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// PUT /ai-agent/:id
// Body: any subset of { name, description, instructions, model, provider_id,
//   mode, temperature, streaming, use_memory, show_thinking_process,
//   personality_role, core_task, tone_and_style, response_length,
//   banned_words, category, guardrail_id, preload_information, channel }
aiAgentRoutes.put("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    const tpl = (await client.agent.get(id) as any)?.data ?? {};
    const assistantId = tpl.assistant_id;

    const results: any = {};

    // Field group 1 — assistant fields (most settings live on the assistant)
    const assistantFields = [
      "instructions", "description", "provider_id",
      "personality_role", "core_task", "tone_and_style", "response_length",
      "banned_words", "category", "guardrail_id", "preload_information", "channel",
      // Knowledge Support
      "folder_ids", "default_folder_id", "knowledge_hubs", "board_ids", "file_ids",
    ];
    const hasAssistantUpdate =
      assistantId && (body.name || body.model || typeof body.temperature === "number" ||
        typeof body.streaming === "boolean" || typeof body.use_memory === "boolean" ||
        typeof body.show_thinking_process === "boolean" || body.mode ||
        assistantFields.some((f) => body[f] !== undefined));

    if (hasAssistantUpdate) {
      // SDK chatAi.updateAiAgent uses PUT (full replace) — fields not in the
      // body get reset to null. Fetch current assistant first and merge so that
      // unchanged fields are preserved.
      const credential = c.get("credential");
      const authHeader = credential.startsWith("api_")
        ? { "x-api-key": credential }
        : { authorization: `Bearer ${credential}` };
      const currentAssistant = await fetch(
        `${GW}/v3/ai/assistants/${assistantId}`,
        { headers: authHeader as any },
      ).then((r) => r.json()) as any;

      const aUpdate: Record<string, any> = {
        ...currentAssistant,
        name: body.name ?? currentAssistant.name,
        // workflow_name required by backend even on partial update
        workflow_name: currentAssistant.workflow_name || `${(body.name ?? currentAssistant.name).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_v${Date.now()}`,
      };
      if (body.model) aUpdate.model_id = body.model;
      if (body.mode) aUpdate.mode = body.mode;
      if (typeof body.temperature === "number") aUpdate.temperature = body.temperature;
      if (typeof body.streaming === "boolean") aUpdate.streaming = body.streaming;
      if (typeof body.use_memory === "boolean") aUpdate.use_memory = body.use_memory;
      if (typeof body.show_thinking_process === "boolean") aUpdate.show_thinking_process = body.show_thinking_process;
      for (const f of assistantFields) {
        if (body[f] !== undefined) aUpdate[f] = body[f];
      }
      results.assistant = await client.chatAi.updateAiAgent(assistantId, aUpdate);
    }

    // Field group 2 — template fields (title + short_description show on the UI card)
    if (body.name || body.description) {
      const tUpdate: Record<string, any> = {};
      if (body.name) tUpdate.title = body.name;
      if (body.description) tUpdate.short_description = body.description;
      results.template = await client.agent.updateUseCase(id, tUpdate);
    }

    if (Object.keys(results).length === 0) {
      return c.json({ ok: false, message: "No update fields provided" }, 400);
    }

    return c.json({ ok: true, message: "AI Agent updated", data: results });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});


// DELETE /ai-agent/:id
aiAgentRoutes.delete("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    await client.agent.delete(id);
    return c.json({ ok: true, message: "AI Agent deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

export default aiAgentRoutes;
