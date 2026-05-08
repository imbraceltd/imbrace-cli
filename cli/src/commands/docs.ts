import { Command, Flags } from "@oclif/core";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export default class Docs extends Command {
  static description =
    "Print the bundled llms.txt — a comprehensive command reference designed to be fed into a coding agent's context (Claude, Cursor, ...). Pipe to a file: `imbrace docs > llms.txt`.";

  static examples = [
    "imbrace docs                          # print full llms.txt to stdout",
    "imbrace docs --path                   # print absolute path to bundled llms.txt",
    "imbrace docs > /tmp/imbrace-llms.txt  # save for an AI agent's context",
  ];

  static flags = {
    path: Flags.boolean({ description: "Print only the absolute path to llms.txt (don't print contents)" }),
    json: Flags.boolean({ description: "Output as JSON: { path, content }" }),
  };

  async run() {
    const { flags } = await this.parse(Docs);

    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(here, "../../llms.txt"),
      resolve(here, "../llms.txt"),
      resolve(here, "../../../llms.txt"),
    ];
    const llmsPath = candidates.find((p) => existsSync(p));

    if (!llmsPath) {
      this.error(
        `llms.txt not found. Looked in:\n${candidates.map((p) => `  - ${p}`).join("\n")}\n\nReinstall the package or fetch from https://github.com/imbraceltd/imbrace-cli/blob/main/llms.txt`,
      );
    }

    if (flags.path && !flags.json) {
      this.log(llmsPath);
      return;
    }

    const content = readFileSync(llmsPath, "utf8");

    if (flags.json) {
      this.log(JSON.stringify({ path: llmsPath, content }, null, 2));
      return;
    }

    this.log(content);
  }
}
