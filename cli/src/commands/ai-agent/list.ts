import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class AiAgentList extends BaseCommand {
  static description = "List all AI agents";

  static examples = [
    "imbrace ai-agent list",
    "imbrace ai-agent list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(AiAgentList);

    try {
      const client = getClient();
      const res = await client.agent.list() as any;
      const data: any[] = (res?.data ?? res ?? []) as any[];

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} agent(s):\n`);
      this.log("  ID                                    TITLE                 TYPE");
      this.log("  ──────────────────────────────────────────────────────────────────");
      for (const agent of data) {
        const id = (agent._id || agent.id || "").padEnd(38);
        const title = (agent.title || agent.name || "").padEnd(22);
        const type = agent.agent_type || "";
        this.log(`  ${id}  ${title}  ${type}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
