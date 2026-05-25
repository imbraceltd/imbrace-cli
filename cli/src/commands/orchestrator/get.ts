import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { getClient } from "../../lib/client.js";
import { gatewayFetch } from "../../lib/gateway.js";

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
      const tpl = (await client.agent.getUseCase(id) as any) ?? {};
      // sub_agents / team_leads live on the assistant, not the use case.
      // Fetch the assistant directly to get the canonical state.
      const assistant = tpl.assistant_id
        ? await gatewayFetch<any>(`/v3/ai/assistants/${tpl.assistant_id}`).catch(() => null)
        : null;

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data: { ...tpl, assistant } }, null, 2));
        return;
      }

      const agentType = assistant?.agent_type ?? tpl.agent_type;
      this.log(`\n  ID:               ${tpl._id || tpl.id || ""}`);
      this.log(`  Title:            ${tpl.title || tpl.name || ""}`);
      this.log(`  Assistant ID:     ${tpl.assistant_id || ""}`);
      this.log(`  Agent type:       ${agentType || ""}`);
      this.log(`  Is orchestrator:  ${agentType === "team_lead"}`);
      const subs: any[] = assistant?.sub_agents || [];
      const leads: any[] = assistant?.team_leads || [];
      // Backend returns either a string id or an enriched object {assistant_id, name}.
      const fmt = (a: any) => typeof a === "string" ? a : (a?.name || a?.assistant_id || JSON.stringify(a));
      this.log(`  Sub-agents (${subs.length}): ${subs.map(fmt).join(", ") || "(none)"}`);
      this.log(`  Team-leads (${leads.length}): ${leads.map(fmt).join(", ") || "(none)"}`);
      this.log(`  Description:      ${(tpl.short_description || "").slice(0, 80)}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
