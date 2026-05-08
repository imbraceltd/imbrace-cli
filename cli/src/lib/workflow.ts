// Workflow helpers — pure functions migrated from api/src/routes/workflow.ts.
import { ImbraceClient } from "@imbrace/sdk";
import { gatewayFetch } from "./gateway.js";

export const PIECE_PREFIX = "@activepieces/";

// "slack" → "@activepieces/piece-slack" (idempotent)
export function normalizePieceName(input: string): string {
  if (input.startsWith(PIECE_PREFIX)) return input;
  return `${PIECE_PREFIX}piece-${input.toLowerCase()}`;
}

// Resolve projectId by reusing the project of any existing flow.
export async function resolveProjectId(client: ImbraceClient): Promise<string> {
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

// Backend rejects ops without correct pieceVersion + propertySettings,
// so we fetch piece metadata directly from the gateway.
export async function fetchPieceMeta(pieceName: string): Promise<{ version: string }> {
  const data = await gatewayFetch<any>(`/activepieces/v1/pieces/${pieceName}`);
  return { version: data.version };
}

// Each input key gets a `propertySettings: { type: "MANUAL" }` entry.
// authFields is the only special case — its schema lives one level deeper.
export function buildPropertySettings(input: Record<string, any>): Record<string, any> {
  const ps: Record<string, any> = {};
  for (const k of Object.keys(input || {})) {
    ps[k] = (k === "authFields" && typeof input[k] === "object")
      ? { type: "MANUAL", schema: {} }
      : { type: "MANUAL" };
  }
  return ps;
}

// Walk the trigger.nextAction chain into a flat array.
// Also traverses ROUTER.children[] and LOOP.firstLoopAction so update/delete
// can target nodes nested inside branches or loop bodies.
export interface FlatNode {
  name: string;
  type: string;
  displayName?: string;
  pieceName?: string;
  actionName?: string;
  triggerName?: string;
  input?: any;
  valid?: boolean;
}

export function flattenNodes(trigger: any): FlatNode[] {
  const nodes: FlatNode[] = [];
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

// Generate next available step_N name given the existing tree.
export function nextStepName(trigger: any): string {
  const nodes = flattenNodes(trigger);
  const used = new Set(nodes.map((n) => n.name));
  let i = 1;
  while (used.has(`step_${i}`)) i++;
  return `step_${i}`;
}
