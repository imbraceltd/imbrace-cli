import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";

export default class OrchestratorGet extends BaseCommand {
  static description = "Get details of an Orchestrator agent (sub_agents, team_leads, instructions)";

  static examples = [
    "imbrace orchestrator get <id>",
    "imbrace orchestrator get <id> --json",
  ];

  static args = {
    id: Args.string({ description: "Orchestrator ID" }),
  };

  static flags = {
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(OrchestratorGet);
    const id = args.id ?? (flags.json ? this.error("ID is required") : await input({ message: "Orchestrator ID:" }));

    try {
      const client = getClient();
      const data = await client.agent.get(id) as any;

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      const a = data?.data || data || {};
      this.log(`\n  ID:               ${a._id || a.id || ""}`);
      this.log(`  Title:            ${a.title || a.name || ""}`);
      this.log(`  Is orchestrator:  ${a.is_orchestrator ?? a.assistant?.is_orchestrator ?? false}`);
      const subs = a.sub_agents || a.assistant?.sub_agents || [];
      const leads = a.team_leads || a.assistant?.team_leads || [];
      this.log(`  Sub-agents (${subs.length}): ${subs.join(", ") || "(none)"}`);
      this.log(`  Team-leads (${leads.length}): ${leads.join(", ") || "(none)"}`);
      this.log(`  Description:      ${(a.short_description || "").slice(0, 80)}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
