import { ImbraceClient } from "@imbrace/sdk";
import { getCredential } from "../config.js";

let cachedClient: ImbraceClient | null = null;

/**
 * Build an authenticated ImbraceClient from the saved credential.
 * Caches per-process — re-call to refresh after login.
 */
export function getClient(): ImbraceClient {
  if (cachedClient) return cachedClient;

  const credential = getCredential();
  if (!credential) {
    throw new Error("Not logged in. Run: imbrace login --api-key api_xxx...");
  }

  const isApiKey = credential.startsWith("sk-") || credential.startsWith("api_");
  cachedClient = new ImbraceClient(
    isApiKey ? { apiKey: credential } : { accessToken: credential },
  );
  return cachedClient;
}

export function resetClient() {
  cachedClient = null;
}
