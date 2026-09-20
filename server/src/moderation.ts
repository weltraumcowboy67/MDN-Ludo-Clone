import { randomUUID } from "node:crypto";
import {
  BUILTIN_CHAT_TERMS,
  CHAT_FILTER_RULES,
  normalizeReportedFilterTerm,
} from "../../shared/src/chatFilter";
import { dataPath, readJson, writeJson } from "./storage";
export interface Report {
  id: string;
  roomId: string;
  messageId: string;
  text: string;
  term: string;
  createdAt: number;
  status: "pending" | "accepted" | "rejected";
}
const reportFile = dataPath("reports.json");
const filterFile = dataPath("reported-chat-filter-terms.json");
const settingsFile = dataPath("filter-settings.json");
const settings = readJson(settingsFile, {
  terms: readJson<string[]>(filterFile, []),
  disabled: [] as string[],
});
export const approvedTerms = new Set(settings.terms);
export const disabledTerms = new Set(settings.disabled);
const builtinTerms = new Map(
  [...BUILTIN_CHAT_TERMS, ...CHAT_FILTER_RULES.map((r) => r.label)].map(
    (term) => [normalizeReportedFilterTerm(term), term],
  ),
);
export function filterTerms() {
  const terms = new Map(
    [...builtinTerms].map(([key, term]) => [
      key,
      { term, builtin: true, enabled: !disabledTerms.has(key) },
    ]),
  );
  for (const term of approvedTerms)
    terms.set(term, { term, builtin: false, enabled: true });
  return [...terms.values()].sort((a, b) => a.term.localeCompare(b.term, "de"));
}
function saveSettings(terms: Set<string>, disabled: Set<string>) {
  writeJson(settingsFile, {
    terms: [...terms].sort(),
    disabled: [...disabled].sort(),
  });
  approvedTerms.clear();
  terms.forEach((t) => approvedTerms.add(t));
  disabledTerms.clear();
  disabled.forEach((t) => disabledTerms.add(t));
}
export function saveTerm(value: string, previous = "") {
  const term = normalizeReportedFilterTerm(value);
  if (!term)
    throw new Error("Bitte einen Begriff mit 2 bis 32 Buchstaben eingeben.");
  const terms = new Set(approvedTerms),
    disabled = new Set(disabledTerms);
  const old = normalizeReportedFilterTerm(previous);
  if (old && old !== term) {
    terms.delete(old);
    if (builtinTerms.has(old)) disabled.add(old);
  }
  disabled.delete(term);
  if (!builtinTerms.has(term)) terms.add(term);
  saveSettings(terms, disabled);
}
let reports = readJson<Report[]>(reportFile, []);
export function listReports() {
  return [...reports].reverse();
}
export function submitReport(
  roomId: string,
  messageId: string,
  text: string,
  term: string,
) {
  if (
    reports.some(
      (r) =>
        r.roomId === roomId && r.messageId === messageId && r.term === term,
    )
  )
    return;
  if (reports.filter((r) => r.status === "pending").length >= 500)
    throw new Error("Report-Liste voll. Bitte später erneut versuchen.");
  reports = [
    ...reports.slice(-999),
    {
      id: randomUUID(),
      roomId,
      messageId,
      text,
      term,
      createdAt: Date.now(),
      status: "pending",
    },
  ];
  writeJson(reportFile, reports);
}
export function reviewReport(id: string, accept: boolean) {
  const report = reports.find((r) => r.id === id);
  if (!report) throw new Error("Report nicht gefunden.");
  if (report.status !== "pending") return;
  if (accept) {
    saveTerm(report.term);
  }
  report.status = accept ? "accepted" : "rejected";
  writeJson(reportFile, reports);
}
export function removeTerm(term: string) {
  const normalized = normalizeReportedFilterTerm(term);
  if (!normalized) throw new Error("Ungültiger Begriff.");
  const terms = new Set(approvedTerms),
    disabled = new Set(disabledTerms);
  terms.delete(normalized);
  if (builtinTerms.has(normalized)) disabled.add(normalized);
  saveSettings(terms, disabled);
}
