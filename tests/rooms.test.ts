import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { createServer } from 'node:http';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { MenschRoom } from '../server/src/rooms/MenschRoom';
import { schemaToSnapshot, snapshotToSchema } from '../server/src/schema';

const http = createServer();
const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false });
server.define('mensch', MenschRoom);
const rooms: Room[] = [];
let client: Client;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(condition: () => boolean, message = 'state update', timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (!condition() && Date.now() < deadline) await pause(20);
  assert.ok(condition(), message);
}
function track(room: Room) {
  rooms.push(room);
  room.reconnection.enabled = false;
  room.onMessage('sessionInfo', () => {});
  room.onMessage('errorMessage', () => {});
  room.onMessage('kicked', () => {});
  return room;
}
async function create(options = {}) {
  const room = track(await client.create('mensch', { name: 'Testspieler', botCount: 0, ...options }));
  await until(() => Boolean(room.state?.roomId));
  return room;
}
const local = (room: Room) => matchMaker.getLocalRoomById(room.roomId) as MenschRoom;
before(async () => {
  delete process.env.ENABLE_DEBUG_ADMIN;
  await server.listen(0, '127.0.0.1');
  const address = http.address();
  assert.ok(address && typeof address === 'object');
  client = new Client(`http://127.0.0.1:${address.port}`);
});
afterEach(async () => {
  const ids = new Set(rooms.map((room) => room.roomId));
  for (const room of rooms.splice(0)) if (room.connection.isOpen) await room.leave();
  for (const id of ids) await matchMaker.getLocalRoomById(id)?.disconnect();
});
after(() => server.gracefullyShutdown(false));

test('two clients join, chat and synchronize ready state over WebSocket', async () => {
  const host = await create();
  const guest = track(await client.joinById(host.roomId, { name: 'Gast' }));
  await until(() => host.state.players.length === 2 && guest.state?.players?.length === 2);
  guest.send('toggleReady', { ready: true });
  await until(() => host.state.players.find((p: any) => p.id === guest.sessionId)?.ready);
  guest.send('sendChat', { text: 'Hallo zusammen' });
  await until(() => host.state.chat.some((m: any) => m.text === 'Hallo zusammen'));
});

test('ADMIN! cannot unlock debug privileges by default', async () => {
  const host = await create();
  host.send('sendChat', { text: 'ADMIN!' });
  let error = '';
  host.onMessage('errorMessage', (message) => { error = message.message; });
  host.send('adminForceDice', { value: 6 });
  await until(() => error.includes('nicht freigeschaltet'));
});

test('omitted and null message payloads leave the room usable', async () => {
  const host = await create();
  for (const type of ['toggleReady', 'setStrikeRequired', 'setChatFilter', 'setTurnTimeLimit', 'setCustomColor', 'setPlayerColor', 'movePiece', 'sendChat', 'reportChatWord', 'adminForceDice']) {
    host.send(type);
    host.send(type, null);
  }
  host.send('toggleReady', { ready: true });
  await until(() => host.state.players[0].ready);
});

test('host departure transfers control; successor can remove the offline seat', async () => {
  const host = await create();
  const guest = track(await client.joinById(host.roomId, { name: 'Gast' }));
  await until(() => guest.state?.players?.length === 2);
  await host.leave();
  await until(() => guest.state.hostId === guest.sessionId);
  guest.send('kickPlayer', { playerId: host.sessionId });
  await until(() => guest.state.players.length === 1);
});

test('last player can rejoin the same seat and game after a reload', async () => {
  const host = await create({ gameMode: 'singleplayer', botCount: 1 });
  let token = '';
  host.onMessage('sessionInfo', (message) => { token = message.reconnectToken; });
  await until(() => Boolean(token));
  host.send('toggleReady', { ready: true });
  await until(() => host.state.players.find((p: any) => p.id === host.sessionId).ready);
  host.send('startGame');
  await until(() => host.state.status === 'playing');
  const color = host.state.players.find((p: any) => p.id === host.sessionId).color;
  await host.leave();
  await pause(100);
  const rejoined = track(await client.joinById(host.roomId, { reconnectToken: token }));
  await until(() => rejoined.state?.status === 'playing');
  assert.equal(rejoined.state.players.find((p: any) => p.id === rejoined.sessionId).color, color);
  assert.equal(rejoined.state.hostId, rejoined.sessionId);
});

test('rematch rejects active games, but resets a finished game', async () => {
  const host = await create({ botCount: 1 });
  host.send('toggleReady', { ready: true });
  await until(() => host.state.players.find((p: any) => p.id === host.sessionId).ready);
  host.send('startGame');
  await until(() => host.state.status === 'playing');
  let error = '';
  host.onMessage('errorMessage', (message) => { error = message.message; });
  host.send('requestRematch');
  await until(() => error.includes('erst nach Spielende'));
  assert.equal(host.state.status, 'playing');
  const room = local(host);
  const state = schemaToSnapshot(room.state);
  state.status = 'finished';
  state.winnerColor = state.players[0].color;
  snapshotToSchema(state, room.state);
  host.send('requestRematch');
  await until(() => host.state.status === 'lobby');
  assert.equal(host.state.winnerColor, '');
  assert.ok(host.state.players.every((p: any) => p.pieces.every((piece: any) => piece.position === -1)));
});

test('bot takes its turn on the server without host browser automation', async () => {
  const host = await create({ color: 'blue', botCount: 1 });
  host.send('toggleReady', { ready: true });
  await until(() => host.state.players.find((p: any) => p.id === host.sessionId).ready);
  host.send('startGame');
  await until(() => host.state.status === 'playing');
  await until(() => host.state.diceValue > 0 || host.state.currentPlayerIndex !== 0 || host.state.rollAttempts > 0 || host.state.players.some((p: any) => p.isBot && p.pieces.some((piece: any) => piece.position >= 0)), 'bot must act', 6000);
});

test('out-of-turn rolls are rejected and party rooms support eight colors', async () => {
  const host = await create({ gameMode: 'party', botCount: 6 });
  const guest = track(await client.joinById(host.roomId, { name: 'Gast' }));
  await until(() => guest.state?.players?.length === 8);
  host.send('toggleReady', { ready: true });
  guest.send('toggleReady', { ready: true });
  await until(() => host.state.players.every((p: any) => p.ready));
  host.send('startGame');
  await until(() => guest.state.status === 'playing');
  let error = '';
  guest.onMessage('errorMessage', (message) => { error = message.message; });
  guest.send('rollDice');
  await until(() => error.includes('nicht am Zug'));
  assert.equal(new Set(guest.state.players.map((p: any) => p.color)).size, 8);
});

test('a new guest receives host control when all previous humans are offline', async () => {
  const host = await create();
  await host.leave();
  await pause(100);
  const guest = track(await client.joinById(host.roomId, { name: 'Nachfolger' }));
  await until(() => guest.state?.hostId === guest.sessionId);
});

test('even with debug enabled a guest cannot unlock admin controls', async () => {
  process.env.ENABLE_DEBUG_ADMIN = '1';
  try {
    const host = await create();
    const guest = track(await client.joinById(host.roomId, { name: 'Gast' }));
    let error = '';
    guest.onMessage('errorMessage', (message) => { error = message.message; });
    guest.send('sendChat', { text: 'ADMIN!' });
    guest.send('adminForceDice', { value: 6 });
    await until(() => error.includes('nicht freigeschaltet'));
  } finally {
    delete process.env.ENABLE_DEBUG_ADMIN;
  }
});
