# Reparaturen und nächste Schritte

Stand: 19. September 2026.

## In diesem Durchgang behoben

- **Lokaler Multiplayer war nicht lokal:** Der Client schrieb direkt in ein fest eingetragenes Appwrite-Projekt, während README und Startbefehle einen Colyseus-Server starteten. Client und Server sprechen jetzt über denselben HTTP/WebSocket-Ursprung. Der doppelte Appwrite-Spielcode und die Cloud-Abhängigkeit sind entfernt. Bestehende Cloud-Partien werden nicht übernommen.
- **Jeder konnte Admin werden:** Die Chat-Nachricht `ADMIN!` schaltete Würfelmanipulation, Kicks und IP-Sperren frei. Jetzt standardmäßig abgeschaltet, bei explizitem lokalem Debug-Modus nur für den aktuellen Host verfügbar. Teilen schaltet Debug-Funktionen immer ab.
- **Host-Ausstieg blockierte die Lobby:** Rechte werden an einen verbundenen Menschen übergeben. Dieser kann offline gebliebene Plätze entfernen und das Spiel starten.
- **Neuladen konnte das letzte Spiel löschen:** Leere Räume bleiben 60 Sekunden erhalten. Wiederbeitritts-Schlüssel sind jetzt kryptografisch zufällige UUIDs.
- **Revanche konnte laufende Partien zurücksetzen:** Der Server nimmt diese Aktion nur nach Spielende an.
- **Fehlende Nachrichtenfelder konnten Handler abstürzen lassen:** Leere und `null`-Nachrichten werden ohne entsprechende Ausnahme verarbeitet.
- **Setup war unvollständig:** `npm run setup`, `npm run play` und `npm run share` sind dokumentiert. Tunnel-Download mit Prüfsumme, Portkontrolle, Healthcheck und gemeinsamem Prozessende sind enthalten. Vite übernimmt den konfigurierten Server-Port und wechselt bei belegtem Client-Port nicht unbemerkt die Adresse.
- **Zwölf bekannte Paketprobleme:** Kompatible Paketupdates beseitigen die bei der Installation gemeldeten npm-Audit-Funde.
- **Audio-Warnungen:** Ungültige stille WAV-Platzhalter werden nicht mehr geladen. Fehlende Musik ist im Player als nicht verfügbar behandelt.
- **Externe Schriftanfragen:** Die gleichen Schriftfamilien Nunito und Baloo 2 werden lokal über Fontsource mitgeliefert.
- **Desktop-Overflow und Lesbarkeit:** Unnötiges vertikales Scrollen der Spielansicht beseitigt; Spielernamen im Zugpanel erhalten bessere Farbkontraste. Chat-Eingaben bekommen im Dark Mode einen erkennbaren Tastaturfokus.

## Prüfung

- Installation aus dem Lockfile, TypeScript-Prüfung, Produktionsbuild und zehn Integrationstests mit echtem Colyseus-Server/WebSocket-Clients.
- Getestete Abläufe: zwei Spieler, Chat, Bereit-Status, Hostwechsel, Entfernen eines Offline-Platzes, Wiederbeitritt des letzten Spielers, Revanche-Sperre und Reset nach Spielende, Bot-Automation, acht unterschiedliche Party-Farben, fremder Würfelzug, fehlende Nachrichtenfelder und Admin-Zugriffssperren.
- Echter Cloudflare Quick Tunnel: Healthcheck über HTTPS sowie Raumbeitritt und Chat mit zwei WSS-Verbindungen erfolgreich. Vites Entwicklungsproxy ebenfalls über HTTP und WebSocket geprüft.
- Firefox: Raum erstellen, Singleplayer mit Bots, Spielstart und Wiederbeitritt nach Neuladen. Desktop 1920×1080 und 1366×768 ohne Seitenscrollen; 390×844 und 360×640 ohne horizontales Scrollen. Beide Farbmodi betrachtet, Hover-Zustände und Tastaturbedienung geprüft.
- Nach dem erneuten Laden: keine Browserfehler oder Warnungen und keine externen Ressourcenanfragen im geprüften Spielablauf.
- `npm audit`: keine bekannten Schwachstellen zum Prüfzeitpunkt.

Kein Nachweis für fehlerfreie Software: Windows/macOS, echte Mobilgeräte, lange Partien bis zum natürlich erreichten Sieg, sämtliche Drag-and-drop-Varianten und Lasttests wurden nicht geprüft. Unter dem lokal installierten Node.js 26 erscheint eine Deprecation-Warnung aus der tsx-Ladekette; Build, Start und Tests laufen trotzdem.

## Priorisierte Ideen

### 1. Einladung mit einem Link

Raumcode direkt als URL-Parameter übernehmen und einen „Einladungslink kopieren“-Button anbieten. Das erspart Mitspielern das getrennte Kopieren von Tunnel-Link und Code. Der Server muss Codes weiterhin prüfen; Wiederbeitritts-Schlüssel gehören nicht in den Einladungslink.

### 2. Mobile Spielansicht kompakter machen

Auf kleinen Displays liegen Spieler und Chat unter dem Brett. Ein einklappbarer Chat und eine schmale Spielerleiste würden Scrollwege reduzieren. Die Würfelaktion ist bereits direkt auf dem Brett erreichbar. Zuerst auf echten Android-/iOS-Geräten bei 360 Pixel Breite und geöffneter Bildschirmtastatur prüfen.

### 3. Reports erst nach Freigabe global übernehmen

Aktuell kann ein gemeldeter Begriff direkt in die serverweite, persistente Filterliste gelangen. Ein einzelner Spieler kann dadurch harmlose Wörter für andere Räume sperren. Vorschlag: Meldungen pro Raum sammeln, global erst nach bewusster Freigabe übernehmen; auch Schreibzugriffe auf die Filterdatei serialisieren.

### 4. Spielstände nach Serverneustart fortsetzen

Falls längere Partien wichtig sind, den Zustand nach jedem bestätigten Zug speichern und Ablaufzeiten festlegen. Zuerst das Wiederherstellungsverhalten und den Umgang mit Wiederbeitritts-Schlüsseln definieren. Ein Accountsystem ist für private Testrunden nicht erforderlich.

### 5. Party-Modus kontrolliert freischalten

Server und Brett unterstützen acht Farben; die Auswahl ist bewusst noch deaktiviert. Vor Freischaltung acht echte Clients, Farbwechsel, Startfelder, Zielfelder, Capture-Animationen und Lesbarkeit auf kleinen Displays testen. Nicht allein aufgrund des vorhandenen Schalters als fertig deklarieren.

### 6. Regeltests und vollständige Spielsimulation ergänzen

Die neuen Tests decken Verbindungen und konkrete Regressionen ab. Nächster sinnvoller Testblock: Startfeldräumung, exakte Zielwürfe, Schlagzwang, drei Würfelversuche, Sechserketten und vollständige Partien in beiden Brettgrößen. Dafür erwartete Hausregeln zunächst eindeutig festhalten.

### 7. Assets verkleinern und Audio ehrlich anbieten

Die fünf großen SVG-Dateien und der Hintergrund machen einen erheblichen Teil des Downloads aus. Vor einer Optimierung echte Bildvergleiche machen. Für Audio lizenzierte Dateien ergänzen oder unbenutzte Sound-Einstellungen ausblenden; keine wirkungslosen Regler suggerieren.

### 8. Für dauerhaften öffentlichen Betrieb zusätzliche Grenzen setzen

Erst bei Bedarf Raumzahl-/Erstellungsraten begrenzen, Reports prüfen, Spielmetriken ergänzen und einen benannten Tunnel mit stabiler Adresse betreiben. Quick Tunnels bleiben die einfache Lösung für Freunde und zeitweilige Tests.
