import { select } from "@inquirer/prompts";
import { apiRequest } from "./http.js";

export async function selectBoard(): Promise<string> {
  const res = await apiRequest<{ ok: boolean; data: any[] }>("/data-board/list");
  const boards = res.data || [];

  if (!boards.length) throw new Error("No boards found. Create a board first.");

  return select({
    message: "Select a board:",
    choices: boards.map((b) => ({ name: `${b.name}  (${b._id})`, value: b._id })),
  });
}
