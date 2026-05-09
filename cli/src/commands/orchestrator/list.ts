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
      // Webapp identifies orchestrators via agent_type === "team_lead"
      // (see new-frontend/.../useAIAssistantFormHook.tsx). Filter client-side.
      const data = all.filter((a) =>
        a.agent_type === "team_lead" ||
        a.assistant?.agent_type === "team_lead",
      );

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, count: data.length, data }, null, 2));
        return;
      }

      this.log(`\n  Found ${data.length} orchestrator(s):\n`);
      this.log("  ID                                    TITLE");
      this.log("  ────────────────────────────────────────────────────────────");
      for (const a of data) {
        const id = (a._id || a.id || "").padEnd(38);
        const title = a.title || a.name || "";
        this.log(`  ${id}  ${title}`);
      }
      this.log(`\n  Use 'imbrace orchestrator get <id>' to see sub_agents.\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
