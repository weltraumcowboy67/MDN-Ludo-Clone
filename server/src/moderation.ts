import { randomUUID } from "node:crypto";
import { normalizeReportedFilterTerm } from "../../shared/src/chatFilter";
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
export const approvedTerms = new Set(readJson<string[]>(filterFile, []));
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
    approvedTerms.add(report.term);
    writeJson(filterFile, [...approvedTerms].sort());
  }
  report.status = accept ? "accepted" : "rejected";
  writeJson(reportFile, reports);
}
export function removeTerm(term: string) {
  const normalized = normalizeReportedFilterTerm(term);
  if (normalized) approvedTerms.delete(normalized);
  writeJson(filterFile, [...approvedTerms].sort());
}
