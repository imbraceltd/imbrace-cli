import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class DocumentAiSuggestSchema extends BaseCommand {
  static description = "Ask the LLM to inspect a sample document and suggest an extraction schema";

  static examples = [
    "imbrace document-ai suggest-schema --url https://example.com/sample.pdf --org-id org_xxx --json",
    "imbrace document-ai suggest-schema --url https://example.com/sample.pdf --org-id org_xxx --model gpt-4o --json",
  ];

  static flags = {
    url: Flags.string({ description: "URL of the sample document", required: true }),
    "org-id": Flags.string({ description: "Organization ID", required: true }),
    model: Flags.string({ description: "LLM model to use for inspection" }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DocumentAiSuggestSchema);

    try {
      const client = getClient();
      const data = await client.documentAi.suggestSchema({
        url: flags.url,
        organizationId: flags["org-id"],
        ...(flags.model && { modelName: flags.model }),
      });

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      this.log(`\n✅ Schema suggested`);
      this.log(JSON.stringify(data, null, 2));
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
