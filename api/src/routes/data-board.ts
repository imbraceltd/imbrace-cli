import { Hono } from "hono";
import { ImbraceClient } from "@imbrace/sdk";

type Variables = { imbraceClient: ImbraceClient; credential: string };

const boardRoutes = new Hono<{ Variables: Variables }>();

// ──── Boards ────

boardRoutes.get("/list", async (c) => {
  const client = c.get("imbraceClient");
  try {
    const { data: boards } = await client.boards.list();
    return c.json({ ok: true, count: boards?.length || 0, data: boards });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

boardRoutes.get("/:id", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    const board = await client.boards.get(id);
    return c.json({ ok: true, data: board });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

boardRoutes.post("/create", async (c) => {
  const client = c.get("imbraceClient");
  const body = await c.req.json();
  if (!body.name) return c.json({ ok: false, message: "name is required" }, 400);
  try {
    const board = await client.boards.create(body);
    return c.json({ ok: true, message: `Board "${body.name}" created`, data: board });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ──── Fields ────

// GET /data-board/:id/fields — list fields of a board
boardRoutes.get("/:id/fields", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    const board = await client.boards.get(id) as any;
    const fields = board?.fields || board?.data?.fields || [];
    console.log("[fields] board keys:", Object.keys(board || {}));
    return c.json({ ok: true, data: fields });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /data-board/:id/fields
// Body: { name, type }
boardRoutes.post("/:id/fields", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!body.name || !body.type) return c.json({ ok: false, message: "name and type are required" }, 400);
  try {
    const board = await client.boards.createField(id, { name: body.name, type: body.type });
    return c.json({ ok: true, message: `Field "${body.name}" created`, data: board });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// ──── Items ────

// GET /data-board/:id/items?limit=20&skip=0&q=Acme
boardRoutes.get("/:id/items", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const limit = Number(c.req.query("limit") || 20);
  const skip = Number(c.req.query("skip") || 0);
  const q = c.req.query("q");
  try {
    let items: any[];
    if (q) {
      const res = await client.boards.search(id, { q, limit }) as any;
      // Meilisearch returns { success, message: { hits, ... } } — not { data }
      items = res?.message?.hits || res?.data || [];
    } else {
      const res = await client.boards.listItems(id, { limit, skip });
      items = res.data || [];
    }
    return c.json({ ok: true, count: items.length, data: items });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// POST /data-board/:id/items
// Body: { fields: [{ board_field_id, value }] }
boardRoutes.post("/:id/items", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const body = await c.req.json();
  if (!body.fields) return c.json({ ok: false, message: "fields array is required" }, 400);
  try {
    const item = await client.boards.createItem(id, { fields: body.fields });
    return c.json({ ok: true, message: "Item created", data: item });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// PUT /data-board/:id/items/:itemId
// Body: { data: [{ key, value }] }
boardRoutes.put("/:id/items/:itemId", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await c.req.json();
  if (!body.data) return c.json({ ok: false, message: "data array is required" }, 400);
  try {
    const item = await client.boards.updateItem(id, itemId, { data: body.data });
    return c.json({ ok: true, message: "Item updated", data: item });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// DELETE /data-board/:id/items/:itemId
boardRoutes.delete("/:id/items/:itemId", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");
  try {
    await client.boards.deleteItem(id, itemId);
    return c.json({ ok: true, message: "Item deleted" });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /data-board/:id/search?q=Acme&limit=10
boardRoutes.get("/:id/search", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  const q = c.req.query("q") || "";
  const limit = Number(c.req.query("limit") || 10);
  try {
    const res = await client.boards.search(id, { q, limit }) as any;
    // Meilisearch returns { success, message: { hits, ... } } — not { data }
    const results = res?.message?.hits || res?.data || [];
    return c.json({ ok: true, count: results.length, data: results });
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

// GET /data-board/:id/export-csv
boardRoutes.get("/:id/export-csv", async (c) => {
  const client = c.get("imbraceClient");
  const id = c.req.param("id");
  try {
    const csv = await client.boards.exportCsv(id);
    return c.text(csv as string);
  } catch (error: any) {
    return c.json({ ok: false, message: error?.message }, 500);
  }
});

export default boardRoutes;
