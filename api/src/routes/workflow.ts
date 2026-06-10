import { Hono } from "hono";
import { ImbraceClient } from "@imbrace/sdk";

type Variables = { imbraceClient: ImbraceClient; credential: string };

const workflowRoutes = new Hono<{ Variables: Variables }>();

const GW = process.env.IMBRACE_GATEWAY_URL || "https://app-gatewayv2.imbrace.co";

// Resolve a projectId by reusing the project of any existing flow.
async function resolveProjectId(client: ImbraceClient): Promise<string> {
  const flows = await client.workflows.listFlows();
  const first = (flows as any)?.data?.[0];
  if (!first?.projectId) {
    throw new Error(
      "Cannot resolve projectId — no existing flows to derive from. " +
      "Create your first flow via the UI (cloud.imbrace.co/workflow-v2) once.",
    );
  }
  return first.projectId;
}

// Normalize piece name: "slack" → "@activepieces/piece-slack"
function normalizePieceName(input: string): string {
  if (input.startsWith("@activepieces/")) return input;
  return `@activepieces/piece-${input.toLowerCase()}`;
}

// Fetch piece version + auth shape from public piece registry.
// Backend rejects ops without correct pieceVersion + propertySettings.
async function fetchPieceMeta(pieceName: string, credential: string): Promise<{ version: string }> {
  const authHeader = credential.startsWith("api_")
    ? { "x-api-key": credential }
    : { authorization: `Bearer ${credential}` };
  const res = await fetch(`${GW}/activepieces/v1/pieces/${pieceName}`, { headers: authHeader as any });
  if (!res.ok) throw new Error(`Cannot fetch piece "${pieceName}" — HTTP ${res.status}`);
  const data = await res.json() as any;
  return { version: data.version };
}

// Build propertySettings { fieldA: {type:"MANUAL"}, ... } from input object keys.
function buildPropertySettings(input: Record<string, any>): Record<string, any> {
  const ps: Record<string, any> = {};
  for (const k of Object.keys(input || {})) {
    // authFields convention: object → use schema:{}, scalars → simple MANUAL
    ps[k] = (k === "authFields" && typeof input[k] === "object")
      ? { type: "MANUAL", schema: {} }
      : { type: "MANUAL" };
  }
  return ps;
}

// Walk the trigger.nextAction chain into a flat array of nodes.
// Also traverses ROUTER.children[] and LOOP.firstLoopAction so update/delete
// can target nodes nested inside branches or loop bodies.
function flattenNodes(trigger: any): any[] {
  const nodes: any[] = [];
  function visit(node: any) {
    if (!node) return;
    nodes.push({
      name: node.name,
      type: node.type,
      displayName: node.displayName,
      pieceName: node.settings?.pieceName,
      actionName: node.settings?.actionName,
      triggerName: node.settings?.triggerName,
      input: node.settings?.input,
      valid: node.valid,
    });
    if (node.nextAction) visit(node.nextAction);
    for (const ch of (node.children || [])) {
      if (ch) visit(ch);
    }
    if (node.firstLoopAction) visit(node.firstLoopAction);
  }
  visit(trigger);
  return nodes;
}

// Generate next available step_N name given existing nodes.
function nextStepName(trigger: any): string {
  const nodes = flattenNodes(trigger);
  const used = new Set(nodes.map((n) => n.name));
  let i = 1;
  while (used.has(`step_${i}`)) i++;
  return `step_${i}`;
}

// GET /workflow/runs — must be before /:id so "runs" isn't matched as an ID
workflowRoutes.get("/runs", async (c) => {
  const client = c.get("imbraceClient");
  const limit = Number(c.req.query("limit") || 10);
  try {
    const res = await client.workflows.listRuns({ limit } as any);
    const data = (res as any)?.data ?? [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/runs/:runId
workflowRoutes.get("/runs/:runId", async (c) => {
  const client = c.get("imbraceClient");
  const runId = c.req.param("runId");
  try {
    const data = await client.workflows.getRun(runId);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/list?folderId=<id|NULL>
//   folderId omitted → all flows
//   folderId=NULL    → only flows not in any folder (unfiled)
//   folderId=<id>    → only flows in that folder
workflowRoutes.get("/list", async (c) => {
  const client = c.get("imbraceClient");
  const folderId = c.req.query("folderId");
  try {
    const params: Record<string, string> = {};
    if (folderId) params.folderId = folderId;
    const res = await client.workflows.listFlows(params as any);
    const data = (res as any)?.data ?? [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/:id
workflowRoutes.get("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    const data = await client.workflows.getFlow(id);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/create
// Body: { name: string, projectId?: string, folderId?: string }
workflowRoutes.post("/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);

  try {
    const projectId = body.projectId || (await resolveProjectId(client));
    const createBody: Record<string, any> = {
      displayName: body.name,
      projectId,
    };
    if (body.folderId) createBody.folderId = body.folderId;
    // createFlow's typed surface only accepts { displayName, projectId }; we
    // also forward folderId (accepted by the engine), so cast past the narrow type.
    const data = await client.workflows.createFlow(createBody as any);
    return c.json({ ok: true, message: `Workflow "${body.name}" created`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/:id/move — move flow to a folder (or unfile with folderId=null)
// Body: { folderId: string | null }
workflowRoutes.post("/:id/move", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!("folderId" in body)) {
    return c.json({ ok: false, message: "folderId is required (string or null)" }, 400);
  }

  try {
    const op = {
      type: "CHANGE_FOLDER",
      request: { folderId: body.folderId },
    };
    const data = await client.workflows.applyFlowOperation(id, op as any);
    const target = body.folderId ?? "(unfiled)";
    return c.json({ ok: true, message: `Workflow moved to ${target}`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /workflow/:id
workflowRoutes.delete("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    await client.workflows.deleteFlow(id);
    return c.json({ ok: true, message: "Workflow deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// PIECES — discover available integrations
// ───────────────────────────────────────────────

// GET /workflow/piece/list?search=slack
workflowRoutes.get("/piece/list", async (c) => {
  const client = c.get("imbraceClient");
  const search = c.req.query("search");
  try {
    const res = await client.workflows.listPieces();
    let arr = (Array.isArray(res) ? res : (res as any)?.data) || [];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.displayName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    const data = arr.map((p: any) => ({
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      categories: p.categories,
      actions: p.actions,
      triggers: p.triggers,
      version: p.version,
    }));
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/piece/:name (raw fetch — SDK listPieces only returns counts)
// :name may contain @ and / so we accept the rest of the path as wildcard via query.
// Using ?name= avoids path-encoding headaches with "@activepieces/piece-slack".
workflowRoutes.get("/piece/detail", async (c) => {
  const credential = c.get("credential");
  const nameRaw = c.req.query("name");
  if (!nameRaw) return c.json({ ok: false, message: "name query param is required" }, 400);
  const name = normalizePieceName(nameRaw);

  const authHeader = credential.startsWith("api_")
    ? { "x-api-key": credential }
    : { authorization: `Bearer ${credential}` };

  try {
    const res = await fetch(`${GW}/activepieces/v1/pieces/${name}`, { headers: authHeader as any });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// NODES — manage trigger + actions on a flow
// ───────────────────────────────────────────────

// GET /workflow/:flowId/nodes — flat list of trigger + actions
workflowRoutes.get("/:flowId/nodes", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  try {
    const flow = await client.workflows.getFlow(flowId) as any;
    const nodes = flattenNodes(flow?.version?.trigger);
    return c.json({ ok: true, count: nodes.length, data: nodes });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/:flowId/nodes
// Body: {
//   type: "trigger" | "action",
//   piece: string,                 // e.g. "slack" or "@activepieces/piece-slack"
//   triggerName?: string,          // when type=trigger
//   actionName?: string,           // when type=action
//   input?: Record<string, any>,
//   after?: string,                // parent step name (default: end of chain)
//   name?: string,                 // override auto-generated step_N
//   displayName?: string,
// }
workflowRoutes.post("/:flowId/nodes", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  const body = await c.req.json();

  if (!body.type || !body.piece) {
    return c.json({ ok: false, message: "type and piece are required" }, 400);
  }
  if (body.type === "trigger" && !body.triggerName) {
    return c.json({ ok: false, message: "triggerName is required when type=trigger" }, 400);
  }
  if (body.type === "action" && !body.actionName) {
    return c.json({ ok: false, message: "actionName is required when type=action" }, 400);
  }

  const credential = c.get("credential");
  const pieceName = normalizePieceName(body.piece);
  const input = body.input || {};

  try {
    const pieceVersion = body.pieceVersion || (await fetchPieceMeta(pieceName, credential)).version;
    const propertySettings = buildPropertySettings(input);

    if (body.type === "trigger") {
      const op = {
        type: "UPDATE_TRIGGER",
        request: {
          name: "trigger",
          type: "PIECE_TRIGGER",
          displayName: body.displayName || body.triggerName,
          settings: {
            pieceName,
            pieceVersion,
            triggerName: body.triggerName,
            input,
            propertySettings,
            sampleData: {},
          },
          valid: true,
        },
      };
      const data = await client.workflows.applyFlowOperation(flowId, op as any);
      return c.json({ ok: true, message: "Trigger set", data });
    }

    // type === "action"
    const flow = await client.workflows.getFlow(flowId) as any;
    const trigger = flow?.version?.trigger;
    const parentStep = body.after || (() => {
      const nodes = flattenNodes(trigger);
      return nodes.length > 0 ? nodes[nodes.length - 1].name : "trigger";
    })();
    const stepName = body.name || nextStepName(trigger);

    const op = {
      type: "ADD_ACTION",
      request: {
        parentStep,
        action: {
          name: stepName,
          type: "PIECE",
          displayName: body.displayName || body.actionName,
          settings: {
            pieceName,
            pieceVersion,
            actionName: body.actionName,
            input,
            propertySettings,
            sampleData: {},
            errorHandlingOptions: {
              retryOnFailure: { value: false },
              continueOnFailure: { value: false },
            },
          },
          valid: true,
        },
      },
    };
    const data = await client.workflows.applyFlowOperation(flowId, op as any);
    return c.json({ ok: true, message: `Action "${stepName}" added after ${parentStep}`, data: { stepName, parentStep, flow: data } });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// PUT /workflow/:flowId/nodes/:nodeName — update node input/displayName
// Body: { displayName?, input? }
workflowRoutes.put("/:flowId/nodes/:nodeName", async (c) => {
  const client = c.get("imbraceClient");
  const credential = c.get("credential");
  const flowId = c.req.param("flowId");
  const nodeName = c.req.param("nodeName");
  const body = await c.req.json();

  try {
    const flow = await client.workflows.getFlow(flowId) as any;
    const nodes = flattenNodes(flow?.version?.trigger);
    const cur = nodes.find((n: any) => n.name === nodeName);
    if (!cur) return c.json({ ok: false, message: `Node "${nodeName}" not found` }, 404);

    const isTrigger = nodeName === "trigger";
    const opType = isTrigger ? "UPDATE_TRIGGER" : "UPDATE_ACTION";
    const newInput = body.input ?? cur.input ?? {};
    const pieceVersion = (await fetchPieceMeta(cur.pieceName, credential)).version;

    const baseSettings: Record<string, any> = {
      pieceName: cur.pieceName,
      pieceVersion,
      input: newInput,
      propertySettings: buildPropertySettings(newInput),
      sampleData: {},
    };
    if (isTrigger) baseSettings.triggerName = cur.triggerName;
    else {
      baseSettings.actionName = cur.actionName;
      baseSettings.errorHandlingOptions = {
        retryOnFailure: { value: false },
        continueOnFailure: { value: false },
      };
    }

    const op = {
      type: opType,
      request: {
        name: nodeName,
        type: cur.type,
        displayName: body.displayName ?? cur.displayName,
        settings: baseSettings,
        valid: true,
      },
    };
    const data = await client.workflows.applyFlowOperation(flowId, op as any);
    return c.json({ ok: true, message: `Node "${nodeName}" updated`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/:flowId/nodes/raw
// Body: full applyFlowOperation request (passthrough). Use when --type trigger/action
// is not enough, e.g. ADD_ACTION with type=BRANCH | ROUTER | LOOP_ON_ITEMS | CODE.
//   Body: { type: "ADD_ACTION" | "UPDATE_ACTION" | "UPDATE_TRIGGER" | "DELETE_ACTION", request: {...} }
// Caller is responsible for the full payload shape (no auto propertySettings/pieceVersion).
workflowRoutes.post("/:flowId/nodes/raw", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  const body = await c.req.json();

  if (!body.type || !body.request) {
    return c.json({ ok: false, message: "Body must be { type, request } — see Activepieces applyFlowOperation schema." }, 400);
  }

  try {
    const data = await client.workflows.applyFlowOperation(flowId, body as any);
    return c.json({ ok: true, message: `Operation "${body.type}" applied`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /workflow/:flowId/nodes/:nodeName
workflowRoutes.delete("/:flowId/nodes/:nodeName", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  const nodeName = c.req.param("nodeName");

  if (nodeName === "trigger") {
    return c.json({ ok: false, message: "Cannot delete trigger node — replace it with `node add --type trigger ...` instead" }, 400);
  }

  try {
    // DELETE_ACTION expects request.names (plural array)
    const op = {
      type: "DELETE_ACTION",
      request: { names: [nodeName] },
    };
    const data = await client.workflows.applyFlowOperation(flowId, op as any);
    return c.json({ ok: true, message: `Node "${nodeName}" deleted`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// MCP SERVERS — Model Context Protocol servers (let AI agents call piece tools)
// ───────────────────────────────────────────────

// GET /workflow/mcp/list — list all MCP servers for the project
workflowRoutes.get("/mcp/list", async (c) => {
  const client = c.get("imbraceClient");
  try {
    const projectId = await resolveProjectId(client);
    const res = await client.workflows.listMcpServers(projectId);
    const data = (res as any)?.data ?? [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/mcp/:mcpId
workflowRoutes.get("/mcp/:mcpId", async (c) => {
  const client = c.get("imbraceClient");
  const mcpId = c.req.param("mcpId");
  try {
    const data = await client.workflows.getMcpServer(mcpId);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/mcp/create
// Body: { name: string, projectId?: string }
workflowRoutes.post("/mcp/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);

  try {
    const projectId = body.projectId || (await resolveProjectId(client));
    const data = await client.workflows.createMcpServer({
      name: body.name,
      projectId,
    } as any);
    return c.json({ ok: true, message: `MCP server "${body.name}" created`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/mcp/:mcpId/rotate-token
workflowRoutes.post("/mcp/:mcpId/rotate-token", async (c) => {
  const client = c.get("imbraceClient");
  const mcpId = c.req.param("mcpId");
  try {
    const data = await client.workflows.rotateMcpToken(mcpId);
    return c.json({
      ok: true,
      message: "Token rotated. Save the new token now — it won't be shown again.",
      data,
    });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /workflow/mcp/:mcpId
workflowRoutes.delete("/mcp/:mcpId", async (c) => {
  const client = c.get("imbraceClient");
  const mcpId = c.req.param("mcpId");
  try {
    await client.workflows.deleteMcpServer(mcpId);
    return c.json({ ok: true, message: "MCP server deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// FOLDERS — organize flows into folders
// ───────────────────────────────────────────────

// GET /workflow/folder/list
workflowRoutes.get("/folder/list", async (c) => {
  const client = c.get("imbraceClient");
  try {
    const res = await client.workflows.listFolders();
    const data = (res as any)?.data ?? [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/folder/:folderId
workflowRoutes.get("/folder/:folderId", async (c) => {
  const client = c.get("imbraceClient");
  const folderId = c.req.param("folderId");
  try {
    const data = await client.workflows.getFolder(folderId);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/folder/create
// Body: { name: string, projectId?: string }
workflowRoutes.post("/folder/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);

  try {
    const projectId = body.projectId || (await resolveProjectId(client));
    const data = await client.workflows.createFolder({
      displayName: body.name,
      projectId,
    });
    return c.json({ ok: true, message: `Folder "${body.name}" created`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// PUT /workflow/folder/:folderId — rename
// Body: { name: string }
workflowRoutes.put("/folder/:folderId", async (c) => {
  const client = c.get("imbraceClient");
  const folderId = c.req.param("folderId");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);

  try {
    const data = await client.workflows.updateFolder(folderId, {
      displayName: body.name,
    });
    return c.json({ ok: true, message: "Folder renamed", data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /workflow/folder/:folderId
workflowRoutes.delete("/folder/:folderId", async (c) => {
  const client = c.get("imbraceClient");
  const folderId = c.req.param("folderId");
  try {
    await client.workflows.deleteFolder(folderId);
    return c.json({ ok: true, message: "Folder deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// CONNECTIONS — credentials for external services
// ───────────────────────────────────────────────

// GET /workflow/conn/list
workflowRoutes.get("/conn/list", async (c) => {
  const client = c.get("imbraceClient");
  try {
    const res = await client.workflows.listConnections();
    const data = (res as any)?.data ?? [];
    return c.json({ ok: true, count: data.length, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/conn/create
// Body: { piece, displayName, type, value }
//   piece: "slack" or "@activepieces/piece-slack"
//   type: "SECRET_TEXT" | "OAUTH2" | "BASIC_AUTH" | "CUSTOM_AUTH" | "CLOUD_OAUTH2"
//   value: token string (for SECRET_TEXT) or JSON object for richer auth types
workflowRoutes.post("/conn/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.piece || !body.type || body.value === undefined) {
    return c.json({ ok: false, message: "piece, type, value are required" }, 400);
  }

  const pieceName = normalizePieceName(body.piece);
  const projectId = await resolveProjectId(client);
  const externalId = body.externalId || `cli_${Date.now()}`;

  // Activepieces requires `value.type` to match the connection type. Build the
  // structured value from raw string for the simple cases.
  let apValue: any;
  if (body.type === "SECRET_TEXT" && typeof body.value === "string") {
    apValue = { type: "SECRET_TEXT", secret_text: body.value };
  } else if (body.type === "BASIC_AUTH" && typeof body.value === "object") {
    apValue = { type: "BASIC_AUTH", username: body.value.username, password: body.value.password };
  } else {
    // OAUTH2/CLOUD_OAUTH2/CUSTOM_AUTH or pre-structured object → caller supplies the full value.
    apValue = typeof body.value === "object" && body.value.type
      ? body.value
      : { type: body.type, ...(typeof body.value === "object" ? body.value : {}) };
  }

  try {
    const data = await client.workflows.upsertConnection({
      pieceName,
      projectId,
      externalId,
      displayName: body.displayName || `${pieceName.split("/").pop()} (${externalId})`,
      type: body.type,
      value: apValue,
    } as any);
    return c.json({ ok: true, message: `Connection created`, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /workflow/conn/:connId — get details of a single connection
workflowRoutes.get("/conn/:connId", async (c) => {
  const client = c.get("imbraceClient");
  const connId = c.req.param("connId");
  try {
    const data = await client.workflows.getConnection(connId);
    return c.json({ ok: true, data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /workflow/conn/:connId
workflowRoutes.delete("/conn/:connId", async (c) => {
  const client = c.get("imbraceClient");
  const connId = c.req.param("connId");
  try {
    await client.workflows.deleteConnection(connId);
    return c.json({ ok: true, message: "Connection deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// LIFECYCLE — publish, enable, disable
// ───────────────────────────────────────────────

// POST /workflow/:flowId/publish — lock current draft as published version
workflowRoutes.post("/:flowId/publish", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  try {
    const data = await client.workflows.applyFlowOperation(flowId, {
      type: "LOCK_AND_PUBLISH",
      request: {},
    } as any);
    return c.json({ ok: true, message: "Workflow published", data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/:flowId/enable
workflowRoutes.post("/:flowId/enable", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  try {
    const data = await client.workflows.applyFlowOperation(flowId, {
      type: "CHANGE_STATUS",
      request: { status: "ENABLED" },
    } as any);
    return c.json({ ok: true, message: "Workflow enabled", data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /workflow/:flowId/disable
workflowRoutes.post("/:flowId/disable", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  try {
    const data = await client.workflows.applyFlowOperation(flowId, {
      type: "CHANGE_STATUS",
      request: { status: "DISABLED" },
    } as any);
    return c.json({ ok: true, message: "Workflow disabled", data });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ───────────────────────────────────────────────
// RUN — manually trigger a flow with payload
// ───────────────────────────────────────────────

// POST /workflow/:flowId/run?sync=true
// Body: { payload?: object }
workflowRoutes.post("/:flowId/run", async (c) => {
  const client = c.get("imbraceClient");
  const flowId = c.req.param("flowId");
  const sync = c.req.query("sync") === "true";
  const body = await c.req.json().catch(() => ({}));
  const payload = body.payload || {};

  try {
    const fn = sync
      ? client.workflows.triggerFlowSync.bind(client.workflows)
      : client.workflows.triggerFlow.bind(client.workflows);
    const data = await fn(flowId, payload);
    return c.json({
      ok: true,
      message: sync ? "Workflow triggered (sync)" : "Workflow triggered (async)",
      mode: sync ? "sync" : "async",
      data,
    });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

export default workflowRoutes;
