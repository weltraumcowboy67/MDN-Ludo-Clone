# Bedienvertrag

- Sprache Deutsch. Datum/Uhrzeit im Adminbereich de-DE, lokale Browser-Zeitzone.
- Spielkonten sind nicht nötig. `/login` ist nur die lokale Verwaltung.
- Anmeldung bleibt maskiert; Passwortmanager und Einfügen funktionieren. Fehler verraten keine gültigen Benutzernamen. Abmelden entzieht auch bereits verbundenen Spielen die Rechte.
- Meldungen sind zunächst offen. Nur eine ausdrückliche Freigabe erweitert die Filterliste. Ablehnen verändert den Filter nicht.
- Bestätigungsdialoge nennen Ziel und Folge. Fokus beginnt bei Abbrechen; Escape und Fokus-Rückgabe funktionieren.
- Einladungen enthalten ausschließlich die Raumkennung, niemals den privaten Wiederbeitritts-Schlüssel. Kopierfehler zeigen ein auswählbares Textfeld.
- Nach Neustart bleiben gespeicherte Partien pausiert. Der verbundene Host oder lokale Admin setzt fort. Ohne Wiederbeitritts-Schlüssel gibt es keine Übernahme fremder Plätze.
- Mobile Spielansicht priorisiert Brett und Würfel. Chat ist einklappbar. Bei 360px Breite darf die Seite nicht horizontal scrollen.
- Native Dropdowns sind vorgesehen. Globale Scrollbars, Fokusmarkierung und Reduced Motion sind in design.css definiert.
- Prüfen: npm run typecheck, npm test, npm run build; Firefox Desktop/Mobil, beide Themes, Anmeldung, Lobby, Spielmodusdialog, aktive Partie.
