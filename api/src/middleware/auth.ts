import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { ImbraceClient } from "@imbrace/sdk";

const BASE_URL = "https://app-gatewayv2.imbrace.co";

/**
 * Middleware xác thực request bằng @imbrace/sdk
 * Hỗ trợ 2 method:
 *   1. API Key:  Authorization: Bearer sk-xxx...
 *   2. Token:    Authorization: Bearer <token_from_login>
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Missing or invalid Authorization header. Use: Bearer <api-key|token>",
    });
  }

  const credential = authHeader.replace("Bearer ", "");

  try {
    let client: InstanceType<typeof ImbraceClient>;

    // API key: bắt đầu bằng "sk-" hoặc "api_"
    const isApiKey = credential.startsWith("sk-") || credential.startsWith("api_");

    if (isApiKey) {
      client = new ImbraceClient({
        apiKey: credential,
        baseUrl: BASE_URL,
      });
    } else {
      // Token từ password login
      client = new ImbraceClient({ baseUrl: BASE_URL });
      client.setAccessToken(credential);
    }

    // Verify bằng cách gọi 1 API nhẹ (ví dụ: list boards)
    await client.boards.list();

    // Attach client + user info vào context để routes dùng
    c.set("imbraceClient", client);
    c.set("credential", credential);

    await next();
  } catch (error: any) {
    throw new HTTPException(401, {
      message: `Authentication failed: ${error?.message || "Invalid credential"}`,
    });
  }
});
