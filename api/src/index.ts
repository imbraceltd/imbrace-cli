import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/data-board";
import aiAgentRoutes from "./routes/ai-agent";
import workflowRoutes from "./routes/workflow";

const app = new Hono();

// ──── Global middleware ────
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());

// ──── Health check (public) ────
app.get("/", (c) =>
  c.json({
    name: "Imbrace API",
    version: "1.0.0",
    status: "running",
    docs: "imbrace --help",
  })
);

// ──── Auth routes (public - no middleware required) ────
app.route("/auth", authRoutes);

// ──── Protected routes (auth required) ────
app.use("/data-board/*", authMiddleware);
app.route("/data-board", boardRoutes);

app.use("/ai-agent/*", authMiddleware);
app.route("/ai-agent", aiAgentRoutes);

app.use("/workflow/*", authMiddleware);
app.route("/workflow", workflowRoutes);

// ──── 404 ────
app.notFound((c) =>
  c.json({ ok: false, message: "Route not found. Try: imbrace --help" }, 404)
);

// ──── Error handler ────
app.onError((err, c) =>
  c.json({ ok: false, message: err.message }, (err as any).status || 500)
);

// ──── Start ────
const port = Number(process.env.PORT) || 3456;
console.log(`
  ╔══════════════════════════════════════╗
  ║   🚀 Imbrace API running            ║
  ║   http://localhost:${port}             ║
  ║                                      ║
  ║   POST /auth/login                   ║
  ║   GET  /data-board/list              ║
  ║   GET  /data-board/:id               ║
  ║   POST /data-board/create            ║
  ╚══════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
