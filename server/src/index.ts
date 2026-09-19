import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MenschRoom } from "./rooms/MenschRoom";

const port = Number(process.env.PORT || 2567);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT muss zwischen 1 und 65535 liegen.");
}
const app = express();

// Browser clients use the same origin, including through a Quick Tunnel.
app.use(cors({ origin: false }));
app.use(express.json());
app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    game: "Mensch ärgere dich nicht",
    room: "mensch",
  });
});

const clientDistPath = process.env.CLIENT_DIST_PATH || path.resolve("dist", "client");
const clientIndexPath = path.join(clientDistPath, "index.html");

if (existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.use((request, response, next) => {
    if (request.path.startsWith("/matchmake") || request.method !== "GET" || path.extname(request.path)) {
      next();
      return;
    }

    response.sendFile(clientIndexPath);
  });
} else {
  app.get("/", (_request, response) => {
    response.json({
      ok: true,
      game: "Mensch ärgere dich nicht",
      room: "mensch",
      client: "not_built",
    });
  });
}

const server = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 10000,
    pingMaxRetries: 4,
  }),
});

gameServer.define("mensch", MenschRoom);

try {
  await gameServer.listen(port, "127.0.0.1");
  console.log(`Spiel: http://127.0.0.1:${port} | Healthcheck: http://127.0.0.1:${port}/health`);
} catch (error) {
  console.error((error as NodeJS.ErrnoException).code === "EADDRINUSE"
    ? `Port ${port} ist belegt. Beende den anderen Server oder ändere PORT in .env.`
    : error);
  process.exit(1);
}
