import { Hono } from "hono";
import { ImbraceClient } from "@imbrace/sdk";

const BASE_URL = "https://app-gatewayv2.imbrace.co";

const authRoutes = new Hono();

/**
 * POST /auth/login
 * Body: { email, password } or { apiKey }
 *
 * Returns a credential token for the CLI to store and reuse
 */
authRoutes.post("/login", async (c) => {
  const body = await c.req.json();

  // Method 1: API Key
  if (body.apiKey) {
    try {
      const client = new ImbraceClient({
        apiKey: body.apiKey,
        baseUrl: BASE_URL,
      });

      // Verify API key with a lightweight call
      const { data } = await client.boards.list();
      console.log("data", data);

      return c.json({
        ok: true,
        method: "api-key",
        message: "Authenticated with API key",
        credential: body.apiKey,
      });
    } catch (error: any) {
      return c.json(
        { ok: false, message: `Invalid API key: ${error?.message}` },
        401,
      );
    }
  }

  // Method 2: Email + Password
  if (body.email && body.password) {
    try {
      const client = new ImbraceClient({
        baseUrl: BASE_URL,
      });

      await client.login(body.email, body.password);

      // @ts-ignore - access internal tokenManager
      const token = client.tokenManager.getToken();

      return c.json({
        ok: true,
        method: "password",
        message: `Logged in as ${body.email}`,
        credential: token,
        email: body.email,
      });
    } catch (error: any) {
      return c.json(
        { ok: false, message: `Login failed: ${error?.message}` },
        401,
      );
    }
  }

  return c.json(
    { ok: false, message: "Provide { email, password } or { apiKey }" },
    400,
  );
});

export default authRoutes;
