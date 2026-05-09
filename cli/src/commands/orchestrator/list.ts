import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class OrchestratorList extends BaseCommand {
  static description = "List Orchestrator agents (filters AI Agents where is_orchestrator=true)";

  static examples = [
    "imbrace orchestrator list",
    "imbrace orchestrator list --json",
  ];

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(OrchestratorList);

    try {
      const client = getClient();
      const res = await client.agent.list() as any;
      const all: any[] = (res?.data ?? res ?? []) as any[];
      // SDK doesn't filter is_orchestrator server-side; do it client-side.
      const data = all.filter((a) => a.is_orchestrator === true || a.assistant?.is_orchestrator === true);

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} orchestrator(s):\n`);
      this.log("  ID                                    TITLE                 SUB-AGENTS");
      this.log("  ───────────────────────────────────────────────────────────────────────");
      for (const a of data) {
        const id = (a._id || a.id || "").padEnd(38);
        const title = (a.title || a.name || "").padEnd(22);
        const subs = (a.sub_agents || a.assistant?.sub_agents || []).length;
        this.log(`  ${id}  ${title}  ${subs}`);
      }
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
