import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { input } from "@inquirer/prompts";
import { createAgent } from "../../lib/ai-agent.js";

export default class OrchestratorCreate extends BaseCommand {
  static description = "Create an Orchestrator agent (coordinates multiple sub-agents toward a shared goal)";

  static examples = [
    'imbrace orchestrator create --name "Sales Orchestrator" --instructions "Route requests to the right sub-agent" --sub-agents uc_xxx,uc_yyy --json',
    'imbrace orchestrator create --name "Support Lead" --team-leads uc_zzz --id-only',
  ];

  static flags = {
    name: Flags.string({ char: "n", description: "Orchestrator name" }),
    description: Flags.string({ char: "d", description: "Description" }),
    instructions: Flags.string({ char: "i", description: "Routing / coordination instructions" }),
    model: Flags.string({ description: "LLM model (e.g. gpt-4o)" }),
    "provider-id": Flags.string({ description: "LLM provider ID. Default 'system'." }),
    "sub-agents": Flags.string({ description: "Comma-separated sub-agent IDs (the agents this orchestrator delegates to)" }),
    "team-leads": Flags.string({ description: "Comma-separated team-lead IDs" }),
    temperature: Flags.string({ description: "Model temperature 0.0-2.0 (default: 0.1)" }),
    json: Flags.boolean({ description: "Output as JSON" }),
    "id-only": Flags.boolean({ description: "Print only the new orchestrator ID" }),
  };

  async run() {
    const { flags } = await this.parse(OrchestratorCreate);

    const nonInteractive = flags.json || flags["id-only"];
    const name = flags.name ?? (nonInteractive ? this.error("--name is required with --json or --id-only") : await input({ message: "Orchestrator name:" }));
    const instructions = flags.instructions ?? (nonInteractive ? undefined : await input({ message: "Instructions (optional):", default: "" }));

    const body: Record<string, any> = {
      name,
      ...(instructions && { instructions }),
      ...(flags.description && { description: flags.description }),
      ...(flags.model && { model: flags.model }),
      ...(flags["provider-id"] && { provider_id: flags["provider-id"] }),
      ...(flags.temperature && { temperature: parseFloat(flags.temperature) }),
      is_orchestrator: true,
      sub_agents: flags["sub-agents"] ? flags["sub-agents"].split(",").map(s => s.trim()).filter(Boolean) : [],
      team_leads: flags["team-leads"] ? flags["team-leads"].split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    try {
      const data = await createAgent(body as any);
      const message = `Orchestrator "${name}" created`;

      if (flags["id-only"]) {
        this.log((data as any)?._id ?? "");
        return;
      }

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, message, data }, null, 2));
        return;
      }

      this.log(`\n✅ ${message}`);
      if ((data as any)?._id) this.log(`   ID: ${(data as any)._id}`);
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
