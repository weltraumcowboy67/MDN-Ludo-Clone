import { Router } from "express";
import {
  adminSession,
  isLocalAdminRequest,
  login,
  logout,
  requestContext,
} from "./adminAuth";
import {
  filterTerms,
  saveTerm,
  listReports,
  removeTerm,
  reviewReport,
} from "./moderation";
import { activeRooms } from "./roomRegistry";
export const adminRoutes = Router();
const attempts = new Map<string, { count: number; until: number }>();
adminRoutes.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  const { address, headers } = requestContext(req);
  if (!isLocalAdminRequest(address, headers)) {
    res
      .status(403)
      .json({
        error:
          "Administration ist nur direkt auf diesem PC über localhost erlaubt.",
      });
    return;
  }
  next();
});
adminRoutes.post("/login", (req, res) => {
  if (!req.is("application/json")) {
    res.status(415).json({ error: "JSON erwartet." });
    return;
  }
  const key = req.socket.remoteAddress || "";
  const rate = attempts.get(key);
  if (rate && rate.until > Date.now() && rate.count >= 5) {
    res
      .status(429)
      .json({
        error: "Zu viele Versuche. Bitte in 15 Minuten erneut anmelden.",
      });
    return;
  }
  const session = login(req.body?.username, req.body?.password);
  if (!session) {
    attempts.set(key, {
      count: rate && rate.until > Date.now() ? rate.count + 1 : 1,
      until:
        rate && rate.until > Date.now() ? rate.until : Date.now() + 900_000,
    });
    res
      .status(401)
      .json({ error: "Anmeldung fehlgeschlagen. Zugangsdaten prüfen." });
    return;
  }
  attempts.delete(key);
  res.cookie("ludo_admin", session.id, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600_000,
  });
  res.json({ username: process.env.ADMIN_USERNAME, csrf: session.csrf });
});
adminRoutes.use((req, res, next) => {
  const session = adminSession(req);
  if (!session) {
    res.status(401).json({ error: "Bitte anmelden." });
    return;
  }
  if (req.method !== "GET" && req.get("x-csrf-token") !== session.csrf) {
    res.status(403).json({ error: "Sitzung bitte neu laden." });
    return;
  }
  res.locals.session = session;
  next();
});
adminRoutes.get("/session", (_req, res) =>
  res.json({
    username: process.env.ADMIN_USERNAME,
    csrf: res.locals.session.csrf,
  }),
);
adminRoutes.post("/logout", (_req, res) => {
  logout(res.locals.session.id);
  res.clearCookie("ludo_admin", { path: "/" });
  res.json({ ok: true });
});
adminRoutes.get("/overview", (_req, res) =>
  res.json({
    reports: listReports(),
    terms: filterTerms(),
    rooms: [...activeRooms.values()].map((r) => r.adminOverview()),
  }),
);
adminRoutes.post("/reports/:id", (req, res) => {
  if (!["accept", "reject"].includes(req.body?.action)) {
    res.status(400).json({ error: "Ungültige Aktion." });
    return;
  }
  reviewReport(String(req.params.id), req.body.action === "accept");
  for (const room of activeRooms.values()) room.refreshFilter();
  res.json({ ok: true });
});
adminRoutes.post("/terms/save", (req, res) => {
  saveTerm(String(req.body?.term || ""), String(req.body?.previous || ""));
  for (const room of activeRooms.values()) room.refreshFilter();
  res.json({ok:true});
});
adminRoutes.post("/terms/remove", (req, res) => {
  removeTerm(String(req.body?.term || ""));
  res.json({ ok: true });
});
adminRoutes.post("/rooms/:id", (req, res) => {
  const room = activeRooms.get(String(req.params.id));
  if (!room) {
    res.status(404).json({ error: "Partie nicht gefunden." });
    return;
  }
  room.adminAction(req.body?.action, String(req.body?.playerId || ""));
  res.json({ ok: true });
});
adminRoutes.use((error: Error, _req: unknown, res: any, _next: unknown) =>
  res.status(400).json({ error: error.message || "Aktion fehlgeschlagen." }),
);
