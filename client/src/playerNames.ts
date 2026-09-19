import { filterChatText } from "../../shared/src/chatFilter";

const RANDOM_NAME_PREFIXES = [
  "LouiBär",
  "FreddyFazbear",
  "KeksKaiser",
  "WürfelWilly",
  "TurboTina",
  "PöppelPaul",
  "MemeMaja",
  "RundenRudi",
  "LudoLena",
  "KäseKönig",
  "KaroKalle",
  "MashaToll",
  "RosaRakete",
  "FlinkerFuchs",
];
const RANDOM_NAME_SUFFIXES = ["83", "17", "404", "7", "21", "99", "11", "42", "58", "2077"];
// Generated names must pass the same built-in filter as manually entered names.
export const suggestedNames = RANDOM_NAME_PREFIXES.flatMap(prefix =>
  RANDOM_NAME_SUFFIXES.map(suffix => `${prefix}${suffix}`.slice(0,24))
).filter(name => filterChatText(name) === name);
export function createRandomPlayerName(): string {
  return suggestedNames[Math.floor(Math.random() * suggestedNames.length)] || "Spieler";
}
