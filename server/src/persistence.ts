import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { matchMaker } from "@colyseus/core";
import type { GameStateSnapshot, PlayerColor } from "../../shared/src/types";
import { dataPath, readJson, writeJson } from "./storage";
export interface SavedGame {
  version: 1;
  snapshot: GameStateSnapshot;
  tokens: Array<[string, PlayerColor]>;
  playerTokens: Array<[string, string]>;
}
const pendingRestore = new Map<string, SavedGame>();
const validId = (id: string) => /^[A-Za-z0-9_-]{1,64}$/.test(id);
export function deleteGame(id: string): void {
  if (!validId(id)) throw new Error("Ungültige Raumkennung.");
  const file = dataPath("games", `${id}.json`);
  if (existsSync(file)) unlinkSync(file);
}
export function saveGame(game: SavedGame) {
  const id = game.snapshot.roomId;
  if (!validId(id)) throw new Error("Ungültige Raumkennung.");
  const file = dataPath("games", `${id}.json`);
  if (game.snapshot.status === "lobby") {
    if (existsSync(file)) unlinkSync(file);
    return;
  }
  writeJson(file, game);
}
export function takeRestore(key?: string) {
  const game = key ? pendingRestore.get(key) : undefined;
  if (key) pendingRestore.delete(key);
  return game;
}
export async function restoreGames() {
  const directory = dataPath("games");
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory).filter((n) =>
    n.endsWith(".json"),
  )) {
    const game = readJson<SavedGame | null>(dataPath("games", name), null);
    if (
      !game ||
      game.version !== 1 ||
      !validId(game.snapshot?.roomId || "") ||
      !Array.isArray(game.tokens) ||
      !Array.isArray(game.playerTokens)
    )
      continue;
    const key = randomUUID();
    pendingRestore.set(key, game);
    try {
      await matchMaker.createRoom("mensch", { restoreKey: key });
    } catch (error) {
      console.error(
        `Partie ${name} konnte nicht wiederhergestellt werden.`,
        error,
      );
    } finally {
      pendingRestore.delete(key);
    }
  }
}
