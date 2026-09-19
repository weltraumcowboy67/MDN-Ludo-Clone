# MDN Ludo Clone

Lokales Browser-Spiel nach dem Prinzip von „Mensch ärgere dich nicht“: React und Vite im Frontend, Colyseus und Express als Spielserver, gemeinsame TypeScript-Regeln. Spielen gegen Bots oder mit Freunden per Raumcode. Keine Cloud-Datenbank, kein Account und keine API-Schlüssel nötig.

## Schnellstart

Voraussetzung: **Node.js ab 22.12** inklusive npm. Empfohlen: Node.js 24 LTS. Unter CachyOS/Arch bei Bedarf `sudo pacman -S nodejs npm` nutzen (alternativ eine vorhandene passende Node-Version).

```bash
git clone https://github.com/weltraumcowboy67/MDN-Ludo-Clone.git
cd MDN-Ludo-Clone
npm run setup
npm start
```

Öffne **http://127.0.0.1:2567**. `setup` installiert die festgeschriebenen Abhängigkeiten mit `npm ci` und baut das Spiel. Beim nächsten Start genügt `npm start`. Nach Code-Änderungen: `npm run play` baut neu und startet direkt.

Windows/PowerShell: Falls `npm.ps1` blockiert wird, in den Befehlen `npm` durch `npm.cmd` ersetzen. Kein Docker nötig.

## Mit Freunden über Cloudflare spielen

Beende zuerst einen laufenden `npm start`- oder `npm run dev`-Prozess mit **Strg+C**. Dann:

```bash
npm run share
```

Dieser eine Befehl:

1. Baut das Spiel.
2. Nutzt ein installiertes `cloudflared` oder lädt unter Linux x64/ARM64 und Windows x64 die offizielle Version 2026.9.1 nach `.tools/`. Der Download wird vor dem Start anhand einer festgeschriebenen SHA-256-Prüfsumme geprüft. Keine globale Installation nötig.
3. Startet den Spielserver und wartet auf dessen Healthcheck.
4. Erstellt einen temporären öffentlichen HTTPS-Link wie `https://….trycloudflare.com`. Frontend und WebSocket-Verbindung laufen beide über diesen Link.

Öffne den ausgegebenen Link, erstelle eine **Multiplayer**-Partie und teile **Link plus Raumcode**. Alle klicken auf „Bereit“, dann startet der Host. Raumcodes unterscheiden Groß- und Kleinschreibung. Strg+C beendet Server und Tunnel gemeinsam. Mitspieler brauchen nur ihren Browser.

Auf macOS bzw. anderen Architekturen zuerst [cloudflared installieren](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/), danach funktioniert derselbe Share-Befehl.

Der Link ist öffentlich und bei jedem Start neu. Rechner und Terminal müssen laufen. Quick Tunnels benötigen keinen Cloudflare-Account, sind für zeitweilige Tests gedacht, haben keine Verfügbarkeitsgarantie und erlauben derzeit höchstens 200 gleichzeitige laufende Anfragen. Sie unterstützen kein SSE; dieses Spiel verwendet WebSockets. Details: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

## Konfiguration und Ports

Eine `.env` ist optional. Kopiere bei Bedarf `.env.example` nach `.env` und ändere `PORT=2567`. Start und Share lesen diese Datei; explizite Umgebungsvariablen gehen vor. Der Server bindet nur an `127.0.0.1`. Ein Tunnel funktioniert ohne Router-Portfreigabe.

| Zweck | Standardadresse |
| --- | --- |
| Spiel, HTTP und WebSocket | `http://127.0.0.1:2567` |
| Healthcheck | `http://127.0.0.1:2567/health` |
| Vite bei Entwicklung | `http://127.0.0.1:5173` |

`npm run dev` startet beide Entwicklungsdienste. **Port 5173 im Browser öffnen**: Vite leitet Spielverbindungen an den konfigurierten Server-Port weiter. Beim normalen Start und Teilen braucht man nur den Spielserver-Port.

## Fehlerbehebung

- **Port belegt:** anderen Server mit Strg+C beenden oder `PORT` in `.env` ändern. `share` bricht bewusst ab, bevor ein bereits laufender fremder Dienst öffentlich geteilt wird.
- **Nur JSON statt Spiel:** `npm run build` ausführen und den Server neu starten, oder `npm run play` nutzen.
- **Server nicht erreichbar:** Terminal prüfen, `/health` öffnen, abgelaufenen Tunnel durch den neu ausgegebenen Link ersetzen. Bei `dev` müssen beide Prozesse laufen.
- **Raum nicht gefunden:** Codes exakt kopieren. Nach einem Serverneustart sind alte Räume weg. Ohne verbundene Menschen bleibt ein Raum 60 Sekunden für den Wiederbeitritt erhalten und wird danach gelöscht.
- **Tunnel startet nicht:** Internet/DNS und Firewall prüfen. Die heruntergeladene Datei liegt nur in `.tools/`. Eine explizite leere Tunnel-Konfiguration verhindert Konflikte mit vorhandenen benannten Cloudflare-Tunneln.
- **Kein Ton:** Audio-Dateien sind absichtlich nicht enthalten. Fehlende Quellen werden nicht abgespielt. Optional eigene, passend lizenzierte Dateien in `client/src/assets.ts` einbinden.

## Tests und wichtige Dateien

```bash
npm test
npm run typecheck
npm run build
npm audit
```

- `client/src/App.tsx`: Spielauswahl, Lobby, Spielsteuerung, Chat, Einstellungen und Verbindung.
- `client/src/Board.tsx`, `client/src/styles.css`: Brett, Figuren und responsive Darstellung.
- `client/src/assets.ts`: lokale Bild- und optionale Audioquellen.
- `client/vite.config.ts`: Entwicklungsserver und WebSocket-Proxy.
- `server/src/index.ts`: HTTP, Healthcheck und statisches Frontend.
- `server/src/rooms/MenschRoom.ts`: autoritative Spielaktionen, Bots, Timer, Sessions und Moderation.
- `server/src/schema.ts`, `shared/src`: synchronisierter Zustand und Spiellogik.
- `scripts/share.mjs`: Cloudflare-Download, Prüfung, Start und gemeinsames Beenden.
- `tests/rooms.test.ts`: Integrationstests mit echtem Server und mehreren WebSocket-Clients.
- `VERBESSERUNGEN.md`: behobene Probleme, Prüfergebnisse und priorisierte nächste Schritte.

## Grenzen und Daten

- Spielstände und Chats liegen im Server-Arbeitsspeicher. Serverneustarts löschen sie. Gemeldete Filterbegriffe werden separat unter `.data/` gespeichert.
- Browser speichern Einstellungen und Wiederbeitritts-Schlüssel lokal. Der Wiederbeitritt funktioniert über „Letzten Raum wieder betreten“ mit demselben Browser und derselben Adresse. Hostrechte gehen beim Verlassen an einen verbundenen Mitspieler.
- Classic/Singleplayer sind in der Oberfläche freigeschaltet. Der Party-Modus hat bereits Server- und Brettcode für acht Farben, bleibt in der Modusauswahl aber wie bisher deaktiviert.
- Frühere Appwrite-Räume werden nicht migriert. Der unbenutzte Appwrite-Transport samt fest eingetragener Cloud-Projektkennung wurde zugunsten des vorhandenen lokalen Servers entfernt.
- Debug-Adminfunktionen sind standardmäßig aus. Nur für lokale Tests kann `ENABLE_DEBUG_ADMIN=1` gesetzt werden; ausschließlich der Raumhost kann dann über `ADMIN!` im Chat Teststeuerungen öffnen. **`npm run share` deaktiviert diese Funktionen immer.**
- Kein dauerhaft betriebener öffentlicher Spielservice: Accounts, globale Missbrauchsbegrenzung und persistente Partien sind nicht implementiert.
- Keine Tracker, externen Fonts oder CDNs im Spiel. Beim Setup werden npm-Pakete geladen, beim Teilen kommuniziert cloudflared mit GitHub/Cloudflare.

## Lizenz und Arbeit am Code

Unabhängiges, inoffizielles Spielprojekt. Siehe `Notice.md` und die MIT-Lizenz in `licence`.

Vor Änderungen README, `package.json`, gemeinsame Regeln und betroffene Module lesen. Bestehende Assets und Spielregeln erhalten. Neue Regeln zuerst gemeinsam definieren und serverseitig validieren. Keine Secrets, `.env`, `.data/`, `.tools/`, Audiodateien, Build-Ergebnisse oder `node_modules` committen. Nach Änderungen müssen Typprüfung, Build und relevante Tests bestehen; bei UI-Änderungen Desktop/Mobil sowie beide Farbmodi prüfen.
