import { Hono } from "hono";
import { ImbraceClient } from "@imbrace/sdk";

// Defaults to the prod gateway; override with IMBRACE_GATEWAY_URL for
// sandbox/develop or self-hosted setups.
const BASE_URL = process.env.IMBRACE_GATEWAY_URL || "https://app-gatewayv2.imbrace.co";

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

      // SDK 1.1.x: login() yields a short-lived `login_acc_` token plus the
      // user's orgs; selectOrganization() swaps it for a usable org-scoped
      // `acc_` token. Returning the login_acc_ token directly makes every
      // later call 401, so we must complete both phases here.
      const res: any = await client.login(body.email, body.password);
      // Normalize org shape across SDK versions: ≥1.2 returns
      // { organization_id, display_name }; earlier returned { id, name }.
      const orgs = (Array.isArray(res?.organizations) ? res.organizations : [])
        .map((o: any) => ({ id: o.organization_id ?? o.id, name: o.display_name ?? o.name }))
        .filter((o: any) => o.id) as Array<{ id: string; name: string }>;

      let orgId: string | undefined = body.orgId || body.organizationId;
      if (!orgId) {
        if (orgs.length === 1) {
          orgId = orgs[0].id;
        } else if (orgs.length > 1) {
          // Caller must choose — return the list and ask them to re-POST with orgId.
          return c.json(
            {
              ok: false,
              needsOrg: true,
              message: "Account belongs to multiple organizations — re-POST with { orgId }",
              organizations: orgs,
            },
            409,
          );
        } else {
          return c.json(
            { ok: false, message: "Login succeeded but no organizations were returned. Provide { orgId }." },
            422,
          );
        }
      }

      await client.selectOrganization(orgId);

      // @ts-ignore - access internal tokenManager
      const token = client.tokenManager.getToken();

      return c.json({
        ok: true,
        method: "password",
        message: `Logged in as ${body.email}`,
        credential: token,
        email: body.email,
        orgId,
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
