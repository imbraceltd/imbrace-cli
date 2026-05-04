import { Command, Flags } from "@oclif/core";
import { saveCredential, config } from "../config.js";
import { apiRequest } from "../http.js";

export default class Login extends Command {
  static description = "Login to Imbrace platform";

  static examples = [
    "imbrace login --email user@example.com --password mypass",
    "imbrace login --api-key sk-xxx...",
  ];

  static flags = {
    email: Flags.string({
      char: "e",
      description: "Email address",
    }),
    password: Flags.string({
      char: "p",
      description: "Password",
    }),
    "api-key": Flags.string({
      char: "k",
      description: "API key (starts with sk-)",
    }),
    "api-url": Flags.string({
      description: "Custom API URL",
      default: "http://localhost:3456",
    }),
  };

  async run() {
    const { flags } = await this.parse(Login);

    // Set API URL
    if (flags["api-url"]) {
      config.set("apiUrl", flags["api-url"]);
    }

    let body: any;

    if (flags["api-key"]) {
      // Method 1: API Key
      body = { apiKey: flags["api-key"] };
      this.log("🔑 Logging in with API key...");
    } else if (flags.email && flags.password) {
      // Method 2: Email + Password
      body = { email: flags.email, password: flags.password };
      this.log(`📧 Logging in as ${flags.email}...`);
    } else {
      this.error(
        "Provide --email + --password, or --api-key\n" +
          "  imbrace login --api-key sk-xxx...\n" +
          "  imbrace login --email user@example.com --password mypass",
      );
    }

    console.log("[login] POST /auth/login →", JSON.stringify(body));

    try {
      const res = await apiRequest<{
        ok: boolean;
        method: string;
        credential: string;
        email?: string;
        message: string;
      }>("/auth/login", { method: "POST", body });

      console.log("[login] response →", JSON.stringify(res));

      saveCredential({
        credential: res.credential,
        method: res.method as "api-key" | "password",
        email: res.email,
      });

      this.log(`\n✅ ${res.message}`);
      this.log(`   Method:     ${res.method}`);
      // this.log(`   API URL:    ${config.get("apiUrl")}`);
      // this.log(`   Config:     ${config.path}\n`);
    } catch (error: any) {
      console.log("[login] error →", error);
      this.error(`Login failed: ${error.message}`);
    }
  }
}
// imbrace login --api-key api_108f337f-a4a8-445e-8e24-9c6bf96fb72b

// imbrace login --email user@example.com --password mypass
