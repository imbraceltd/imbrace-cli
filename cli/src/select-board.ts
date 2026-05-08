import { select } from "@inquirer/prompts";
import { getClient } from "./lib/client.js";

export async function selectBoard(): Promise<string> {
  const client = getClient();
  const res = await client.boards.list() as any;
  const boards: any[] = res?.data ?? [];

  if (!boards.length) throw new Error("No boards found. Create a board first.");

  return select({
    message: "Select a board:",
    choices: boards.map((b) => ({ name: `${b.name}  (${b._id})`, value: b._id })),
  });
}
