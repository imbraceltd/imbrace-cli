import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/data-board";

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

// ──── Auth routes (public - không cần middleware) ────
app.route("/auth", authRoutes);

// ──── Protected routes (cần auth) ────
app.use("/data-board/*", authMiddleware);
app.route("/data-board", boardRoutes);

// ──── 404 ────
app.notFound((c) =>
  c.json({ ok: false, message: "Route not found. Try: imbrace --help" }, 404)
);

// ──── Error handler ────
app.onError((err, c) =>
  c.json({ ok: false, message: err.message }, err.status || 500)
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
