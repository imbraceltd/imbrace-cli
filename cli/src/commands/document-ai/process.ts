import { Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";
import { getClient } from "../../lib/client.js";

export default class DocumentAiProcess extends BaseCommand {
  static description = "Run a Document AI agent on a PDF/image URL — returns the extracted JSON";

  static examples = [
    "imbrace document-ai process --agent-id <id> --url https://example.com/invoice.pdf --org-id org_xxx --json",
    "imbrace document-ai process --url https://example.com/doc.pdf --org-id org_xxx --model gpt-4o --instructions 'Extract X' --json",
  ];

  static flags = {
    "agent-id": Flags.string({ description: "Agent ID. If provided, uses agent's model + instructions (overridden by --model/--instructions)." }),
    url: Flags.string({ description: "URL of the document to extract", required: true }),
    "org-id": Flags.string({ description: "Organization ID (sent in body and header)", required: true }),
    model: Flags.string({ description: "Override agent's model. Required if --agent-id not provided." }),
    instructions: Flags.string({ char: "i", description: "Override agent's instructions" }),
    "board-id": Flags.string({ description: "Board ID to write extracted records into" }),
    language: Flags.string({ description: "Document language hint" }),
    "additional-instructions": Flags.string({ description: "Extra per-call instructions appended to agent's prompt" }),
    "chunk-size": Flags.integer({ description: "Chunk size for large documents" }),
    "max-concurrent": Flags.integer({ description: "Max concurrent chunks" }),
    "max-retries": Flags.integer({ description: "Max retries on failure" }),
    "enhanced-processing": Flags.boolean({ description: "Use enhanced processing pipeline", allowNo: true }),
    json: Flags.boolean({ description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(DocumentAiProcess);

    if (!flags["agent-id"] && !flags.model) {
      this.error("Either --agent-id or --model is required");
    }

    try {
      const client = getClient();
      const data = await client.documentAi.process({
        url: flags.url,
        organizationId: flags["org-id"],
        ...(flags["agent-id"] && { agentId: flags["agent-id"] }),
        ...(flags.model && { modelName: flags.model }),
        ...(flags.instructions && { instructions: flags.instructions }),
        ...(flags["board-id"] && { boardId: flags["board-id"] }),
        ...(flags.language && { language: flags.language }),
        ...(flags["additional-instructions"] && { additionalDocumentInstructions: flags["additional-instructions"] }),
        ...(flags["chunk-size"] !== undefined && { chunkSize: flags["chunk-size"] }),
        ...(flags["max-concurrent"] !== undefined && { maxConcurrent: flags["max-concurrent"] }),
        ...(flags["max-retries"] !== undefined && { maxRetries: flags["max-retries"] }),
        ...(flags["enhanced-processing"] !== undefined && { useEnhancedProcessing: flags["enhanced-processing"] }),
      });

      if (flags.json) {
        this.log(JSON.stringify({ ok: true, data }, null, 2));
        return;
      }

      this.log(`\n✅ Document processed`);
      this.log(JSON.stringify(data, null, 2));
      this.log("");
    } catch (error: any) {
      this.error(`Failed: ${error.message}`);
    }
  }
}
