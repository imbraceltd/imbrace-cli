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
        credential_name: `standard | ${body.name}`,
        // Model
        provider_id: "system",
        model_id: body.model || "gpt-4o",
        // Agent / channel scope
        agent_type: "agent",
        mode: "standard",
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
        show_thinking_process: false,
        // Behavior runtime
        streaming: true,
        use_memory: true,
        temperature: 0.1,
        // Knowledge (UI: Knowledge Support tab) — empty by default
        knowledge_hubs: [],
        folder_ids: [],
        default_folder_id: "",
        board_ids: [],
        file_ids: [],
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
// Body: { name?, instructions?, description?, model? }
// Updates both the assistant and the use-case template via SDK methods
aiAgentRoutes.put("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    const tpl = (await client.agent.get(id) as any)?.data ?? {};
    const assistantId = tpl.assistant_id;

    const results: any = {};

    // Update assistant via SDK chatAi.updateAssistant
    if (assistantId && (body.name || body.instructions || body.description || body.model)) {
      const aUpdate: Record<string, any> = {
        // workflow_name is required by backend validation, even when unchanged
        name: body.name ?? tpl.title,
        workflow_name: tpl.workflow_name || `${(body.name ?? tpl.title).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_v${Date.now()}`,
      };
      if (body.instructions) aUpdate.instructions = body.instructions;
      if (body.description) aUpdate.description = body.description;
      if (body.model) aUpdate.model_id = body.model;

      results.assistant = await client.chatAi.updateAssistant(assistantId, aUpdate);
    }

    // Update template via SDK agent.updateUseCase (flat fields)
    if (body.name || body.description) {
      const tUpdate: Record<string, any> = {};
      if (body.name) tUpdate.title = body.name;
      if (body.description) tUpdate.short_description = body.description;

      results.template = await client.agent.updateUseCase(id, tUpdate);
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
