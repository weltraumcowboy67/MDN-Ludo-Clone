import assert from "node:assert/strict";
import { COLOR_META } from "../shared/src/constants";
import express from "express";
import { randomBytes, scryptSync } from "node:crypto";
import { adminRoutes } from "../server/src/adminRoutes";
import { isLocalAdminRequest } from "../server/src/adminAuth";
import { listReports, approvedTerms } from "../server/src/moderation";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "node:http";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Client, type Room } from "@colyseus/sdk";
import { MenschRoom } from "../server/src/rooms/MenschRoom";
import { schemaToSnapshot, snapshotToSchema } from "../server/src/schema";

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
const http = createServer(app);
let endpoint = "";
const testPassword = randomBytes(16).toString("hex");
const server = new Server({
  transport: new WebSocketTransport({ server: http }),
  greet: false,
});
server.define("mensch", MenschRoom);
const rooms: Room[] = [];
let client: Client;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(
  condition: () => boolean,
  message = "state update",
  timeout = 4000,
) {
  const deadline = Date.now() + timeout;
  while (!condition() && Date.now() < deadline) await pause(20);
  assert.ok(condition(), message);
}
function track(room: Room) {
  rooms.push(room);
  room.reconnection.enabled = false;
  room.onMessage("sessionInfo", () => {});
  room.onMessage("errorMessage", () => {});
  room.onMessage("kicked", () => {});
  return room;
}
async function create(options = {}) {
  const room = track(
    await client.create("mensch", {
      name: "Testspieler",
      botCount: 0,
      ...options,
    }),
  );
  await until(() => Boolean(room.state?.roomId));
  return room;
}
const local = (room: Room) =>
  matchMaker.getLocalRoomById(room.roomId) as MenschRoom;
before(async () => {
  delete process.env.ENABLE_DEBUG_ADMIN;
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address === "object");
  endpoint = `http://127.0.0.1:${address.port}`;
  client = new Client(endpoint);
  const salt = randomBytes(16).toString("hex");
  process.env.ADMIN_USERNAME = "test-admin";
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(testPassword, salt, 64).toString("hex")}`;
});
afterEach(async () => {
  const ids = new Set(rooms.map((room) => room.roomId));
  for (const room of rooms.splice(0))
    if (room.connection.isOpen) await room.leave();
  for (const id of ids) await matchMaker.getLocalRoomById(id)?.disconnect();
});
after(() => server.gracefullyShutdown(false));

test("two clients join, chat and synchronize ready state over WebSocket", async () => {
  const host = await create();
  const guest = track(await client.joinById(host.roomId, { name: "Gast" }));
  await until(
    () => host.state.players.length === 2 && guest.state?.players?.length === 2,
  );
  guest.send("toggleReady", { ready: true });
  await until(
    () => host.state.players.find((p: any) => p.id === guest.sessionId)?.ready,
  );
  guest.send("sendChat", { text: "Hallo zusammen" });
  await until(() =>
    host.state.chat.some((m: any) => m.text === "Hallo zusammen"),
  );
});

test("ADMIN! cannot unlock debug privileges by default", async () => {
  const host = await create();
  host.send("sendChat", { text: "ADMIN!" });
  let error = "";
  host.onMessage("errorMessage", (message) => {
    error = message.message;
  });
  host.send("adminForceDice", { value: 6 });
  await until(() => error.includes("nicht freigeschaltet"));
});

test("omitted and null message payloads leave the room usable", async () => {
  const host = await create();
  for (const type of [
    "toggleReady",
    "setStrikeRequired",
    "setChatFilter",
    "setTurnTimeLimit",
    "setCustomColor",
    "setPlayerColor",
    "movePiece",
    "sendChat",
    "reportChatWord",
    "adminForceDice",
  ]) {
    host.send(type);
    host.send(type, null);
  }
  host.send("toggleReady", { ready: true });
  await until(() => host.state.players[0].ready);
});

test("host departure transfers control; successor can remove the offline seat", async () => {
  const host = await create();
  const guest = track(await client.joinById(host.roomId, { name: "Gast" }));
  await until(() => guest.state?.players?.length === 2);
  await host.leave();
  await until(() => guest.state.hostId === guest.sessionId);
  guest.send("kickPlayer", { playerId: host.sessionId });
  await until(() => guest.state.players.length === 1);
});

test("last player can rejoin the same seat and game after a reload", async () => {
  const host = await create({ gameMode: "singleplayer", botCount: 1 });
  let token = "";
  host.onMessage("sessionInfo", (message) => {
    token = message.reconnectToken;
  });
  await until(() => Boolean(token));
  host.send("toggleReady", { ready: true });
  await until(
    () => host.state.players.find((p: any) => p.id === host.sessionId).ready,
  );
  host.send("startGame");
  await until(() => host.state.status === "playing");
  const color = host.state.players.find(
    (p: any) => p.id === host.sessionId,
  ).color;
  await host.leave();
  await pause(100);
  const rejoined = track(
    await client.joinById(host.roomId, { reconnectToken: token }),
  );
  await until(() => rejoined.state?.status === "paused");
  rejoined.send("resumeGame");
  await until(() => rejoined.state?.status === "playing");
  assert.equal(
    rejoined.state.players.find((p: any) => p.id === rejoined.sessionId).color,
    color,
  );
  assert.equal(rejoined.state.hostId, rejoined.sessionId);
});

test("rematch rejects active games, but resets a finished game", async () => {
  const host = await create({ botCount: 1 });
  host.send("toggleReady", { ready: true });
  await until(
    () => host.state.players.find((p: any) => p.id === host.sessionId).ready,
  );
  host.send("startGame");
  await until(() => host.state.status === "playing");
  let error = "";
  host.onMessage("errorMessage", (message) => {
    error = message.message;
  });
  host.send("requestRematch");
  await until(() => error.includes("erst nach Spielende"));
  assert.equal(host.state.status, "playing");
  const room = local(host);
  const state = schemaToSnapshot(room.state);
  state.status = "finished";
  state.winnerColor = state.players[0].color;
  snapshotToSchema(state, room.state);
  host.send("requestRematch");
  await until(() => host.state.status === "lobby");
  assert.equal(host.state.winnerColor, "");
  assert.ok(
    host.state.players.every((p: any) =>
      p.pieces.every((piece: any) => piece.position === -1),
    ),
  );
});

test("bot takes its turn on the server without host browser automation", async () => {
  const host = await create({ color: "blue", botCount: 1 });
  host.send("toggleReady", { ready: true });
  await until(
    () => host.state.players.find((p: any) => p.id === host.sessionId).ready,
  );
  host.send("startGame");
  await until(() => host.state.status === "playing");
  await until(
    () =>
      host.state.diceValue > 0 ||
      host.state.currentPlayerIndex !== 0 ||
      host.state.rollAttempts > 0 ||
      host.state.players.some(
        (p: any) =>
          p.isBot && p.pieces.some((piece: any) => piece.position >= 0),
      ),
    "bot must act",
    6000,
  );
});

test("out-of-turn rolls are rejected and party rooms support eight colors", async () => {
  const host = await create({ gameMode: "party", botCount: 6 });
  const guest = track(await client.joinById(host.roomId, { name: "Gast" }));
  await until(() => guest.state?.players?.length === 8);
  host.send("toggleReady", { ready: true });
  guest.send("toggleReady", { ready: true });
  await until(() => host.state.players.every((p: any) => p.ready));
  host.send("startGame");
  await until(() => guest.state.status === "playing");
  let error = "";
  guest.onMessage("errorMessage", (message) => {
    error = message.message;
  });
  guest.send("rollDice");
  await until(() => error.includes("nicht am Zug"));
  assert.equal(new Set(guest.state.players.map((p: any) => p.color)).size, 8);
});

test("a new guest receives host control when all previous humans are offline", async () => {
  const host = await create();
  await host.leave();
  await pause(100);
  const guest = track(
    await client.joinById(host.roomId, { name: "Nachfolger" }),
  );
  await until(() => guest.state?.hostId === guest.sessionId);
});

test("even with debug enabled a guest cannot unlock admin controls", async () => {
  process.env.ENABLE_DEBUG_ADMIN = "1";
  try {
    const host = await create();
    const guest = track(await client.joinById(host.roomId, { name: "Gast" }));
    let error = "";
    guest.onMessage("errorMessage", (message) => {
      error = message.message;
    });
    guest.send("sendChat", { text: "ADMIN!" });
    guest.send("adminForceDice", { value: 6 });
    await until(() => error.includes("nicht freigeschaltet"));
  } finally {
    delete process.env.ENABLE_DEBUG_ADMIN;
  }
});

test("admin boundary rejects public peers, tunnel headers and cross-origin requests", () => {
  assert.equal(
    isLocalAdminRequest("127.0.0.1", new Headers({ host: "localhost:2567" })),
    true,
  );
  for (const peer of ["192.168.1.2", "203.0.113.1", ""])
    assert.equal(
      isLocalAdminRequest(peer, new Headers({ host: "localhost:2567" })),
      false,
    );
  for (const headers of [
    { host: "public.trycloudflare.com" },
    { host: "localhost:2567", origin: "https://evil.example" },
    ...[
      "forwarded",
      "cf-connecting-ip",
      "cf-ray",
      "x-forwarded-for",
      "x-real-ip",
      "x-forwarded-host",
    ].map((h) => ({ host: "localhost:2567", [h]: "127.0.0.1" })),
  ]) {
    assert.equal(isLocalAdminRequest("127.0.0.1", new Headers(headers)), false);
  }
});

test("admin HTTP session, CSRF, WebSocket permissions and logout revocation", async () => {
  const post = (
    path: string,
    body: object,
    headers: Record<string, string> = {},
  ) =>
    fetch(`${endpoint}/api/admin/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(`${endpoint}/api/admin/overview`)).status, 401);
  assert.equal(
    (
      await post(
        "login",
        { username: "test-admin", password: testPassword },
        { "CF-Connecting-IP": "203.0.113.1" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("login", { username: "test-admin", password: "wrong" })).status,
    401,
  );
  const signedIn = await post("login", {
    username: "test-admin",
    password: testPassword,
  });
  assert.equal(signedIn.status, 200);
  const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];
  const { csrf } = (await signedIn.json()) as { csrf: string };
  assert.match(signedIn.headers.get("set-cookie")!, /HttpOnly/);
  const auth = { Cookie: cookie, "x-csrf-token": csrf };
  assert.equal(
    (await post("terms/remove", { term: "sample" }, { Cookie: cookie })).status,
    403,
  );
  const adminClient = new Client(endpoint, { headers: { Cookie: cookie } });
  const room = track(
    await adminClient.create("mensch", { name: "Spielleiter", botCount: 1 }),
  );
  let unlocked = false;
  room.onMessage("adminUnlocked", () => (unlocked = true));
  await until(
    () => unlocked,
    "local cookie should unlock in-game administration",
  );
  room.onMessage("adminActionAccepted", () => {});
  room.send("toggleReady", { ready: true });
  await until(() => room.state.players[0].ready);
  room.send("startGame");
  await until(() => room.state.status === "playing");
  assert.equal(
    (await post(`rooms/${room.roomId}`, { action: "pause" }, auth)).status,
    200,
  );
  await until(() => room.state.status === "paused");
  assert.equal(
    (await post(`rooms/${room.roomId}`, { action: "resume" }, auth)).status,
    200,
  );
  await until(() => room.state.status === "playing");
  const bot = room.state.players.find((p: any) => p.isBot);
  assert.equal(
    (
      await post(
        `rooms/${room.roomId}`,
        { action: "kick", playerId: bot.id },
        auth,
      )
    ).status,
    200,
  );
  await until(
    () => !room.state.players.find((p: any) => p.id === bot.id).isBot,
  );
  assert.equal(
    (await post(`rooms/${room.roomId}`, { action: "reset" }, auth)).status,
    200,
  );
  await until(() => room.state.status === "lobby");
  assert.equal((await post("logout", {}, auth)).status, 200);
  assert.equal(
    (
      await fetch(`${endpoint}/api/admin/overview`, {
        headers: { Cookie: cookie },
      })
    ).status,
    401,
  );
  let error = "";
  room.onMessage("errorMessage", (m) => (error = m.message));
  room.send("adminForceDice", { value: 6 });
  await until(() => error.includes("nicht freigeschaltet"));
});

test("reports only affect global filter after explicit admin approval", async () => {
  const room = await create();
  room.onMessage("reportAccepted", () => {});
  room.send("setChatFilter", { enabled: true });
  room.send("sendChat", { text: "Zitronenkeks Testwort" });
  await until(() =>
    room.state.chat.some((m: any) => m.text === "Zitronenkeks Testwort"),
  );
  const message = room.state.chat.find(
    (m: any) => m.text === "Zitronenkeks Testwort",
  );
  room.send("reportChatWord", { messageId: message.id, word: "Zitronenkeks" });
  await until(() => listReports().some((r) => r.messageId === message.id));
  assert.equal(approvedTerms.has("zitronenkeks"), false);
  assert.equal(
    room.state.chat.find((m: any) => m.id === message.id).text,
    "Zitronenkeks Testwort",
  );
  const signed = await fetch(`${endpoint}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: testPassword }),
  });
  const cookie = signed.headers.get("set-cookie")!.split(";")[0];
  const { csrf } = (await signed.json()) as { csrf: string };
  const report = listReports().find((r) => r.messageId === message.id)!;
  const result = await fetch(`${endpoint}/api/admin/reports/${report.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({ action: "accept" }),
  });
  assert.equal(result.status, 200);
  assert.equal(approvedTerms.has("zitronenkeks"), true);
  await until(
    () =>
      room.state.chat.find((m: any) => m.id === message.id).text !==
      "Zitronenkeks Testwort",
  );
});

test("singleplayer starts directly and all visual colors work without moving the seat", async () => {
  const host = await create({ gameMode: "singleplayer", botCount: 3 });
  const seat = host.state.players.find(
    (p: any) => p.id === host.sessionId,
  ).color;
  for (const { hex } of Object.values(COLOR_META)) {
    host.send("setCustomColor", { customColor: hex });
    await until(
      () =>
        host.state.players.find((p: any) => p.id === host.sessionId)
          .customColor === hex,
    );
    assert.equal(
      new Set(host.state.players.map((p: any) => p.customColor)).size,
      4,
    );
  }
  assert.equal(
    host.state.players.find((p: any) => p.id === host.sessionId).color,
    seat,
  );
  host.send("startGame");
  await until(() => host.state.status === "playing");
});

test("empty room timeout deletes its saved game; reconnect cancels the timeout", async () => {
  const { existsSync } = await import("node:fs");
  const { dataPath } = await import("../server/src/storage");
  const host = await create({ gameMode: "singleplayer", botCount: 1 });
  let token = "";
  host.onMessage("sessionInfo", (m) => (token = m.reconnectToken));
  await until(() => Boolean(token));
  host.send("startGame");
  await until(() => host.state.status === "playing");
  const serverRoom = local(host);
  const path = dataPath("games", `${host.roomId}.json`);
  assert.equal(existsSync(path), true);
  await host.leave();
  await pause(70);
  const resumed = track(
    await client.joinById(host.roomId, { reconnectToken: token }),
  );
  await until(() => resumed.state?.status === "paused");
  serverRoom.clock.currentTime -= 60_001;
  serverRoom.clock.tick();
  assert.equal(existsSync(path), true);
  await resumed.leave();
  await pause(70);
  serverRoom.clock.currentTime -= 60_001;
  serverRoom.clock.tick();
  await until(() => !existsSync(path));
});

test("admin can observe a full active game without taking a seat, anonymous clients cannot", async () => {
  const host = await create({ gameMode: "singleplayer", botCount: 3 });
  host.send("startGame");
  await until(() => host.state.status === "playing");
  const response = await fetch(`${endpoint}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: testPassword }),
  });
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const admin = new Client(endpoint, { headers: { Cookie: cookie } });
  const observer = track(
    await admin.joinById(host.roomId, { spectator: true }),
  );
  observer.onMessage("adminUnlocked", () => {});
  observer.onMessage("adminActionAccepted", () => {});
  await until(() => observer.state?.players?.length === 4);
  assert.equal(
    observer.state.players.some((p: any) => p.id === observer.sessionId),
    false,
  );
  let accepted = false;
  observer.onMessage("adminActionAccepted", () => (accepted = true));
  observer.send("adminForceDice", { value: 6, playerId: host.sessionId });
  await until(() => accepted);
  await assert.rejects(
    client.joinById(host.roomId, { spectator: true }),
    /lokale Admin/,
  );
});

test("filter list exposes built-ins and supports adding, editing and disabling terms", async () => {
  const { filterTerms, saveTerm, removeTerm, disabledTerms } =
    await import("../server/src/moderation");
  const { filterChatText } = await import("../shared/src/chatFilter");
  assert.ok(filterTerms().some((t) => t.builtin && t.term === "depp"));
  saveTerm("Sonnenprobe");
  saveTerm("Mondprobe", "Sonnenprobe");
  assert.equal(approvedTerms.has("sonnenprobe"), false);
  assert.equal(approvedTerms.has("mondprobe"), true);
  removeTerm("depp");
  assert.equal(
    filterChatText("depp", { disabledPhrases: [...disabledTerms] }),
    "depp",
  );
  saveTerm("depp");
  assert.notEqual(
    filterChatText("depp", { disabledPhrases: [...disabledTerms] }),
    "depp",
  );
  removeTerm("Mondprobe");
});
