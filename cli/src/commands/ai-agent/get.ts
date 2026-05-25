import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class AiAgentGet extends BaseCommand {
  static description = "Get details of an AI agent";

  static examples = [
    "imbrace ai-agent get <id>",
    "imbrace ai-agent get <id> --json",
  ];

  static args = {
    id: Args.string({ description: "Agent ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(AiAgentGet);

    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Agent ID:" }));

    try {
      const client = getClient();
      const data = await client.agent.getUseCase(id) as any;

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const a = data?.data || data || {};
      this.log(`\n  ID:           ${a._id || a.id || ""}`);
      this.log(`  Title:        ${a.title || a.name || ""}`);
      this.log(`  Type:         ${a.agent_type || ""}`);
      this.log(`  Version:      ${a.version || ""}`);
      this.log(`  Assistant ID: ${a.assistant_id || ""}`);
      this.log(`  Channel ID:   ${a.channel_id || ""}`);
      this.log(`  Demo URL:     ${a.demo_url || ""}`);
      this.log(`  Description:  ${(a.short_description || "").slice(0, 80)}${(a.short_description || "").length > 80 ? "..." : ""}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
