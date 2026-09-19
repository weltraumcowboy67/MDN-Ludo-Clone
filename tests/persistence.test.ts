import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { Client, type Room } from "@colyseus/sdk";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, timeout = 6000) {
  const end = Date.now() + timeout;
  while (!check() && Date.now() < end) await pause(25);
  assert.ok(check());
}

test("a fresh server restores exact pieces, turn and reconnect identity, paused until host resumes", async () => {
  const data = mkdtempSync(join(tmpdir(), "ludo-restart-"));
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  let process: ChildProcess | undefined;
  let room: Room | undefined;
  let log = "";
  async function start() {
    log = "";
    process = spawn(
      globalThis.process.execPath,
      ["--import", "tsx", "server/src/index.ts"],
      {
        env: { ...globalThis.process.env, PORT: String(port), DATA_DIR: data },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    process.stdout?.on("data", (s) => (log += s));
    process.stderr?.on("data", (s) => (log += s));
    await until(() => log.includes("Spiel:"));
    assert.equal(process.exitCode, null, log);
  }
  async function stop() {
    if (process && process.exitCode === null) {
      const exited = once(process, "exit");
      process.kill("SIGTERM");
      await exited;
    }
  }
  try {
    await start();
    const client = new Client(`http://127.0.0.1:${port}`);
    room = await client.create("mensch", {
      name: "Wiederkehr",
      gameMode: "singleplayer",
      botCount: 1,
    });
    room.reconnection.enabled = false;
    let token = "";
    room.onMessage("sessionInfo", (m) => (token = m.reconnectToken));
    room.onMessage("errorMessage", () => {});
    await until(() => Boolean(token));
    room.send("toggleReady", { ready: true });
    await until(() => room!.state.players[0].ready);
    room.send("startGame");
    await until(() => room!.state.status === "playing");
    const id = room.roomId;
    const color = room.state.players.find(
      (p: any) => p.id === room!.sessionId,
    ).color;
    room.send("rollDice");
    await until(
      () => room!.state.diceValue > 0 || room!.state.rollAttempts > 0,
    );
    await stop();
    const saved = JSON.parse(
      readFileSync(join(data, "games", `${id}.json`), "utf8"),
    );
    assert.equal(saved.snapshot.status, "paused");
    await start();
    room = await client.joinById(id, { reconnectToken: token });
    room.reconnection.enabled = false;
    room.onMessage("sessionInfo", () => {});
    room.onMessage("errorMessage", () => {});
    await until(() => room!.state?.status === "paused");
    assert.equal(
      room.state.players.find((p: any) => p.id === room!.sessionId).color,
      color,
    );
    assert.equal(room.state.hostId, room.sessionId);
    assert.equal(room.state.diceValue, saved.snapshot.diceValue);
    assert.equal(room.state.diceRolled, saved.snapshot.diceRolled);
    assert.equal(
      room.state.currentPlayerIndex,
      saved.snapshot.currentPlayerIndex,
    );
    assert.deepEqual(
      room.state.players.map((p: any) => p.pieces.map((x: any) => x.position)),
      saved.snapshot.players.map((p: any) =>
        p.pieces.map((x: any) => x.position),
      ),
    );
    await pause(250);
    assert.equal(room.state.status, "paused");
    room.send("resumeGame");
    await until(() => room!.state.status === "playing");
  } finally {
    await stop();
    rmSync(data, { recursive: true, force: true });
  }
});
