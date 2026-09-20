---
version: alpha
colors:
  canvas: "#f3f1eb"
  surface: "#fffefa"
  ink: "#25362f"
  muted: "#56645d"
  primary: "#315e49"
  line: "#c7cec4"
  darkCanvas: "#15161a"
  darkSurface: "#202126"
  darkInk: "#f2f3f5"
  darkAccent: "#b8c8ff"
typography:
  body:
    fontFamily: "Nunito Variable, sans-serif"
  display:
    fontFamily: "Baloo 2 Variable, sans-serif"
rounded:
  control: "7px"
  panel: "12px"
spacing:
  compact: "8px"
  standard: "16px"
  section: "32px"
components:
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  invitation:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
---
# MDN Ludo: am gemeinsamen Spieltisch

## Overview
Ein ruhiger Spieltisch für Freunde. Das Brett trägt die vier kräftigen Spielerfarben; die Oberfläche nimmt sich mit Papierflächen und neutralem Anthrazit zurück. Verwaltung gehört hinter /login und hat dieselbe visuelle Sprache. Vorhandene lokale Figuren-Assets bleiben erhalten.

## Colors
`client/src/design.css` ist die maßgebliche Token- und Oberflächenschicht nach dem älteren `styles.css`. Die Frontmatter-Farben entsprechen dort `--canvas`, `--surface`, `--ink`, `--muted`, `--accent`, `--line`; Dark-Werte stehen im `data-theme="dark"`-Block. Spielerfarben bleiben fachliche Werte in `shared/src/constants.ts`. Keine zusätzlichen Farbsysteme pro Bildschirm.

## Typography
Lokal gebündelte Nunito für lesbaren Spieltext, Baloo 2 für Überschriften und Aktionen. Raumcodes benutzen Monospace. Keine Font-CDNs. Überschriften bleiben kurz, deutsche Beschriftungen nennen konkrete Aktionen.

## Layout
Desktop: Spieler links, Brett zentral, Zug und Chat rechts. Bei mittlerer Breite wandern Spieler über das Brett. Mobil: kompakte Spielerzeilen, Brett, Würfel darunter, einklappbarer Multiplayer-Chat. Solo hat keinen Chat. Die Zuganzeige behält ihre Höhe. Lobby: offene Hauptspalte mit einer durch eine Linie getrennten Chatspalte. Verwaltung: lesbare Zeilen; die vollständige Filterliste mit Suche und Bearbeitung öffnet als Dialog. Kleine Displays dürfen für Lobby und Verwaltung vertikal scrollen.

## Elevation & Depth
Nur Brett, Haupteinstieg und Dialoge erhalten einen leichten Schatten. Keine verschachtelten dekorativen Karten. Dialoge nutzen einen abgedunkelten Hintergrund. Farbflächen und Typografie vermitteln die Hierarchie.

## Shapes
Kontrollen 7px, große Flächen 12px. Das SVG-Brett bekommt feinere Linien; Zielfelder und Figurenziele bleiben klar erkennbar. Keine Asset-Komprimierung in diesem Arbeitsschritt.

## Components
Modal.tsx besitzt den Dialogablauf. ConfirmDialog.tsx bestätigt Verwaltungseingriffe. Invitation.tsx besitzt Kopieren und den Textfallback. Native Selects sind absichtlich gewählt, ihre Betriebssystem-Popups sind akzeptiert. Chat startet mobil geschlossen. Fokus ist deutlich umrandet. Fehler sind Text, nicht nur Farbe. Reduzierte Bewegung schaltet dekorative Animationen ab.

## Do's and Don'ts
- Primäraktionen mit Akzent, Nebenaktionen mit neutraler Fläche.
- Light und Dark gleichwertig prüfen, einschließlich offener Dialoge.
- Adminrechte ausschließlich auf dem Server prüfen.
- Keine erfundenen Spiele oder GitHub-Auszeichnungen als fertig bewerben.
- Keine Tracker, externen Laufzeitfonts oder versteckten Netzwerkanfragen.
