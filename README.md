# MDN Ludo Clone

[![Tests und Build](https://github.com/weltraumcowboy67/MDN-Ludo-Clone/actions/workflows/ci.yml/badge.svg)](https://github.com/weltraumcowboy67/MDN-Ludo-Clone/actions/workflows/ci.yml) [![MIT-Lizenz](https://img.shields.io/badge/Lizenz-MIT-315e49)](licence) [![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.12-315e49)](package.json)

Lokales Browser-Spiel nach dem Prinzip von „Mensch ärgere dich nicht“: React und Vite im Frontend, Colyseus und Express als Spielserver, gemeinsame TypeScript-Regeln. Spielen gegen Bots oder mit Freunden per Einladungslink. Kein Spielerkonto und keine Cloud-Datenbank nötig. Optionaler Adminzugang nur auf dem eigenen Rechner.

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

Öffne den ausgegebenen Link, erstelle eine **Multiplayer**-Partie und klicke **Einladen** und teile den kopierten Link. Der Link öffnet die Partie direkt. Alle klicken auf „Bereit“, dann startet der Host. Raumcodes unterscheiden Groß- und Kleinschreibung. Strg+C beendet Server und Tunnel gemeinsam. Mitspieler brauchen nur ihren Browser.

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

## Lokale Verwaltung

```bash
npm run admin:setup
npm start
```

Der Einrichtungsdialog fragt Benutzername und Passwort ab und speichert nur einen gesalzenen Passwort-Hash in der ignorierten `.env`. Zum Ändern erneut ausführen und den Server neu starten. Ohne Konfiguration bleibt die Anmeldung gesperrt. Keine Zugangsdaten sind im Repository enthalten.

Öffne **http://127.0.0.1:2567/login** direkt auf dem Server-PC. Anmeldung über öffentliche Tunnel, fremde Hosts oder weitergeleitete Anfragen ist gesperrt, auch wenn cloudflared selbst über localhost verbindet. Der normale Spielzugang bleibt öffentlich erreichbar. Eine Sitzung läuft nach acht Stunden ab und endet beim Serverneustart.

Die Verwaltung kann Meldungen annehmen oder ablehnen, die vollständige Filterliste durchsuchen und Begriffe hinzufügen, bearbeiten oder entfernen (eingebaute Regeln deaktivieren), Spieler entfernen sowie Partien pausieren, fortsetzen oder in die Lobby zurücksetzen. Erst eine Freigabe nimmt einen gemeldeten Begriff in den globalen Filter auf. Bei aktivem Filter werden bereits vorhandene Chattexte ebenfalls gefiltert; Entfernen eines Begriffs stellt zuvor zensierten Text nicht wieder her. Nach Anmeldung einem Spiel beitreten oder die bestehende Spielseite neu laden: Dann erscheint dort das Adminmenü. „Partie öffnen“ in der Verwaltung verbindet dich auch bei vollen oder laufenden Partien als Beobachter mit Spielsteuerung. Abmelden entzieht auch bestehenden Spielverbindungen die Rechte.

Für Freunde den Einladungslink **von der öffentlichen Tunnel-Adresse** kopieren. Ein über localhost kopierter Link ist nur auf deinem PC nutzbar. Wenn sich der Quick-Tunnel-Link ändert, ist auch der Browser-Ursprung neu: gespeicherte Zugänge der alten Tunnel-Adresse werden nicht automatisch übertragen. Eine feste Domain wird hier absichtlich nicht eingerichtet.

## Fehlerbehebung

- **Port belegt:** anderen Server mit Strg+C beenden oder `PORT` in `.env` ändern. `share` bricht bewusst ab, bevor ein bereits laufender fremder Dienst öffentlich geteilt wird.
- **Nur JSON statt Spiel:** `npm run build` ausführen und den Server neu starten, oder `npm run play` nutzen.
- **Server nicht erreichbar:** Terminal prüfen, `/health` öffnen, abgelaufenen Tunnel durch den neu ausgegebenen Link ersetzen. Bei `dev` müssen beide Prozesse laufen.
- **Raum nicht gefunden:** Codes exakt kopieren. Alle Partien ohne verbundene Menschen verschwinden nach 60 Sekunden, einschließlich Speicherstand. Begonnene Partien werden gespeichert und nach Neustart pausiert wiederhergestellt. Für deinen alten Platz brauchst du denselben Browser und Ursprung.
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
- `client/src/Board.tsx`, `client/src/styles.css`, `client/src/design.css`: Brett, Figuren und responsive Darstellung.
- `client/src/assets.ts`: lokale Bild- und optionale Audioquellen.
- `client/vite.config.ts`: Entwicklungsserver und WebSocket-Proxy.
- `server/src/index.ts`: HTTP, Healthcheck und statisches Frontend.
- `server/src/rooms/MenschRoom.ts`: autoritative Spielaktionen, Bots, Timer, Sessions und Moderation.
- `server/src/adminAuth.ts`, `adminRoutes.ts`, `moderation.ts`: lokaler Zugang, Rechte und Report-Freigabe.
- `server/src/persistence.ts`, `storage.ts`: atomare Speicherung und Wiederherstellung, optional `DATA_DIR`.
- `client/src/AdminPage.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`: Verwaltung und Dialoge.
- `server/src/schema.ts`, `shared/src`: synchronisierter Zustand und Spiellogik.
- `scripts/share.mjs`: Cloudflare-Download, Prüfung, Start und gemeinsames Beenden.
- `tests/rooms.test.ts`: Integrationstests mit echtem Server und mehreren WebSocket-Clients.
- `VERBESSERUNGEN.md`: behobene Probleme, Prüfergebnisse und priorisierte nächste Schritte.

## Grenzen und Daten

- Begonnene und beendete Partien einschließlich Chat und privater Wiederbeitritts-Schlüssel werden nach jeder Änderung atomar unter `.data/games/` gespeichert. Offene Lobbys sind flüchtig. Reports und freigegebene Begriffe liegen ebenfalls in `.data/`. Keine dieser Dateien ins Git aufnehmen.
- Nach Neustart oder dem Weggang des letzten Menschen bleibt die Partie pausiert, bis Host oder lokaler Admin fortsetzt. Nach einem Reset wird die gespeicherte Partie entfernt. Ohne verbundene Menschen wird jede Partie nach 60 Sekunden automatisch gelöscht. Nach einem Serverneustart beginnt diese Frist neu. Admins können Partien auch sofort löschen.
- Browser speichern Einstellungen und Wiederbeitritts-Schlüssel lokal. Beim Neuladen kehrst du automatisch in die aktuelle Partie zurück. Alternativ gibt es „Letzten Raum wieder betreten“, jeweils mit demselben Browser und derselben Adresse innerhalb der 60-Sekunden-Frist. Hostrechte gehen beim Verlassen an einen verbundenen Mitspieler.
- Classic/Singleplayer sind in der Oberfläche freigeschaltet. Der Party-Modus hat bereits Server- und Brettcode für acht Farben, bleibt in der Modusauswahl aber wie bisher deaktiviert.
- Frühere Appwrite-Räume werden nicht migriert. Der unbenutzte Appwrite-Transport samt fest eingetragener Cloud-Projektkennung wurde zugunsten des vorhandenen lokalen Servers entfernt.
- Adminrechte entstehen ausschließlich durch eine lokale Anmeldung, nicht durch einen Chatcode oder eine Debug-Umgebungsvariable. Kein öffentlicher Accountservice und kein dauerhaftes Hosting.
- Keine Tracker, externen Fonts oder CDNs im Spiel. Beim Setup werden npm-Pakete geladen, beim Teilen kommuniziert cloudflared mit GitHub/Cloudflare.

## Lizenz und Arbeit am Code

Unabhängiges, inoffizielles Spielprojekt. Siehe `Notice.md` und die MIT-Lizenz in `licence`.

Vor Änderungen README, `package.json`, gemeinsame Regeln und betroffene Module lesen. Bestehende Assets und Spielregeln erhalten. Neue Regeln zuerst gemeinsam definieren und serverseitig validieren. Keine Secrets, `.env`, `.data/`, `.tools/`, Audiodateien, Build-Ergebnisse oder `node_modules` committen. Nach Änderungen müssen Typprüfung, Build und relevante Tests bestehen; bei UI-Änderungen Desktop/Mobil sowie beide Farbmodi prüfen.

### Bedienung

Solo: Farbe und Zugzeit wählen, dann direkt „Spiel starten“. Kein Bereit-Schritt und kein Chat. Alle acht Farben sind auswählbar; Computer geben belegte Farben durch einen Tausch frei. Multiplayer behält Bereit-Status und Chat. Einstellungen öffnen als Dialog. Jede Würfelzahl hat im normalen Spiel bei jedem Wurf 1/6 Chance; Admin-Eingriffe sind davon ausgenommen.
