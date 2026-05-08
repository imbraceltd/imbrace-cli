import { Args, Flags } from "@oclif/core";
import { readFileSync } from "node:fs";
import { BaseCommand } from "../../../base-command.js";
import { apiRequest } from "../../../http.js";

export default class WorkflowNodeAddRaw extends BaseCommand {
  static description = [
    "Add or update a node using a raw Activepieces flow-operation payload.",
    "Use this for advanced node types (BRANCH, ROUTER, LOOP_ON_ITEMS, CODE)",
    "that 'node add' doesn't expose. Caller is responsible for the full",
    "payload shape — no validation, no auto-defaults.",
  ].join(" ");

  static examples = [
    "imbrace workflow node add-raw <flowId> --op-file ./branch.json --json",
    "imbrace workflow node add-raw <flowId> --op '{\"type\":\"ADD_ACTION\",\"request\":{...}}' --json",
    "echo '{\"type\":\"ADD_ACTION\",...}' | imbrace workflow node add-raw <flowId> --stdin --json",
  ];

  static args = {
    flowId: Args.string({ description: "Workflow ID", required: true }),
  };

  static flags = {
    "op-file": Flags.string({ description: "Path to JSON file containing { type, request }" }),
    op: Flags.string({ description: "Inline JSON string of { type, request }" }),
    stdin: Flags.boolean({ description: "Read operation JSON from stdin" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { args, flags } = await this.parse(WorkflowNodeAddRaw);

    const sources = [flags["op-file"], flags.op, flags.stdin].filter(Boolean).length;
    if (sources === 0) this.error("Provide one of --op-file, --op, or --stdin");
    if (sources > 1) this.error("Use only one of --op-file, --op, --stdin");

    let raw: string;
    if (flags["op-file"]) {
      try { raw = readFileSync(flags["op-file"], "utf8"); }
      catch (e: any) { this.error(`Cannot read --op-file: ${e.message}`); }
    } else if (flags.op) {
      raw = flags.op;
    } else {
      raw = readFileSync(0, "utf8");
    }

    let body: any;
    try {
      body = JSON.parse(raw!);
    } catch (e: any) {
      this.error(`Invalid JSON: ${e.message}`);
    }

    if (!body.type || !body.request) {
      this.error("Operation JSON must have { type, request } — e.g. { type: \"ADD_ACTION\", request: { parentStep, action } }");
    }

    try {
      const res = await apiRequest<{ ok: boolean; message: string; data: any }>(
        `/workflow/${args.flowId}/nodes/raw`,
        { method: "POST", body },
      );

      if (flags.json) {
        this.log(JSON.stringify(res, null, 2));
        return;
      }

      this.log(`\n✅ ${res.message}\n`);
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
