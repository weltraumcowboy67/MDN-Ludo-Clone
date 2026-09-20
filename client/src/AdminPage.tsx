import { FilterDialog, type FilterTerm } from "./FilterDialog";
import { useEffect, useState } from "react";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
interface Session {
  username: string;
  csrf: string;
}
interface Overview {
  reports: Array<{
    id: string;
    roomId: string;
    text: string;
    term: string;
    status: string;
    createdAt: number;
  }>;
  terms: FilterTerm[];
  rooms: Array<{
    roomId: string;
    status: string;
    players: Array<{
      id: string;
      name: string;
      isBot: boolean;
      connected: boolean;
    }>;
  }>;
}
export function AdminPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    path: string;
    body: object;
  } | null>(null);
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const [dark, setDark] = useState(
    () => localStorage.getItem("mensch:theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("mensch:theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.title = "Verwaltung · MDN Ludo";
    void fetch("/api/admin/session")
      .then(async (r) => {
        if (r.ok) setSession(await r.json());
        else if (r.status === 403) setError((await r.json()).error);
      })
      .catch(() => setError("Spielserver nicht erreichbar."))
      .finally(() => setChecking(false));
  }, []);
  async function load() {
    const response = await fetch("/api/admin/overview");
    if (response.status === 401) {
      setSession(null);
      throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setOverview(data);
  }
  useEffect(() => {
    if (session) void load().catch((e) => setError(e.message));
  }, [session]);
  async function action(path: string, body: object) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": session?.csrf || "",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.status === 401) setSession(null);
      if (!response.ok) throw new Error(data.error);
      if (path === "logout") {
        setSession(null);
        setOverview(null);
      } else {
        await load();
        setNotice("Änderung gespeichert.");
      }
      setConfirm(null);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!username.trim() || !password) {
      setError("Benutzername und Passwort eingeben.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      setPassword("");
      if (!response.ok) throw new Error(data.error);
      setSession(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const reports = overview?.reports.filter((r) => r.status === filter) || [];
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(reports.length / 10) - 1),
  );
  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/">
          <ArrowLeft size={18} /> Zum Spiel
        </a>
        <button className="button-secondary" onClick={() => setDark(!dark)}>
          {dark ? "Hell" : "Dunkel"}
        </button>
      </header>
      <div className="admin-title">
        <Shield size={28} />
        <div>
          <p className="eyebrow">Nur auf diesem Rechner</p>
          <h1>{session ? "Spielverwaltung" : "Admin anmelden"}</h1>
        </div>
      </div>
      <p className="admin-intro">
        {session
          ? `Angemeldet als ${session.username}. Du entscheidest, welche Meldungen in den Filter aufgenommen werden.`
          : "Verwalte Meldungen und Partien. Deine Freunde spielen ohne Anmeldung."}
      </p>
      {error && (
        <p className="feedback feedback--error" role="alert" id="admin-error">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback" role="status">
          {notice}
        </p>
      )}
      {checking ? (
        <p role="status">Zugang wird geprüft …</p>
      ) : !session ? (
        <form className="login-form" noValidate onSubmit={signIn}>
          <label>
            Benutzername
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-error" : undefined}
            />
          </label>
          <label>
            Passwort
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-error" : undefined}
              />
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShow(!show)}
                aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button disabled={busy}>
            {busy ? "Anmeldung läuft …" : "Anmelden"}
          </button>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <button
              className="button-secondary"
              disabled={busy}
              onClick={() => {
                setError("");
                void load().catch((e) => setError(e.message));
              }}
            >
              Aktualisieren
            </button>
            <button
              className="button-secondary"
              disabled={busy}
              onClick={() => action("logout", {})}
            >
              Abmelden
            </button>
          </div>
          {!overview ? (
            <p role="status">Verwaltung wird geladen …</p>
          ) : (
            <>
              <section className="admin-section">
                <div className="section-heading">
                  <h2>Meldungen</h2>
                  <label>
                    Status
                    <select
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="pending">Offen</option>
                      <option value="accepted">Angenommen</option>
                      <option value="rejected">Abgelehnt</option>
                    </select>
                  </label>
                </div>
                {!reports.length ? (
                  <p className="empty-state">
                    Keine Meldungen in dieser Ansicht.
                  </p>
                ) : (
                  reports
                    .slice(currentPage * 10, currentPage * 10 + 10)
                    .map((report) => (
                      <article className="report-row" key={report.id}>
                        <div>
                          <small>
                            Raum {report.roomId} ·{" "}
                            {new Date(report.createdAt).toLocaleString("de-DE")}
                          </small>
                          <p>{report.text}</p>
                          <strong>Gemeldeter Begriff: {report.term}</strong>
                        </div>
                        {report.status === "pending" && (
                          <div className="row-actions">
                            <button
                              disabled={busy}
                              onClick={() =>
                                setConfirm({
                                  title: `„${report.term}“ in den globalen Filter aufnehmen?`,
                                  path: `reports/${report.id}`,
                                  body: { action: "accept" },
                                })
                              }
                            >
                              Annehmen
                            </button>
                            <button
                              className="button-secondary"
                              disabled={busy}
                              onClick={() =>
                                action(`reports/${report.id}`, {
                                  action: "reject",
                                })
                              }
                            >
                              Ablehnen
                            </button>
                          </div>
                        )}
                      </article>
                    ))
                )}
                {reports.length > 10 && (
                  <nav aria-label="Meldungsseiten" className="row-actions">
                    <button
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Zurück
                    </button>
                    <span>
                      Seite {currentPage + 1} von{" "}
                      {Math.ceil(reports.length / 10)}
                    </span>
                    <button
                      disabled={(currentPage + 1) * 10 >= reports.length}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Weiter
                    </button>
                  </nav>
                )}
              </section>
              <section className="admin-section">
                <div className="section-heading">
                  <div>
                    <h2>Chatfilter</h2>
                    <p>
                      {overview.terms.filter((t) => t.enabled).length} aktive
                      Begriffe und Regeln.
                    </p>
                  </div>
                  <button
                    className="button-secondary"
                    onClick={() => {
                      setError("");
                      setFilterOpen(true);
                    }}
                  >
                    Filterliste verwalten
                  </button>
                </div>
              </section>
              <section className="admin-section">
                <h2>Partien</h2>
                {!overview.rooms.length ? (
                  <p className="empty-state">
                    Noch keine Partie. Erstelle eine Runde im Spiel.
                  </p>
                ) : (
                  overview.rooms.map((room) => (
                    <article className="room-row" key={room.roomId}>
                      <div className="section-heading">
                        <h3>Raum {room.roomId}</h3>
                        <span>
                          {
                            (
                              {
                                lobby: "Lobby",
                                playing: "Läuft",
                                paused: "Pausiert",
                                finished: "Beendet",
                              } as Record<string, string>
                            )[room.status]
                          }
                        </span>
                      </div>
                      <div className="row-actions">
                        <a href={`/?watch=${encodeURIComponent(room.roomId)}`}>
                          Partie öffnen
                        </a>
                        {room.status === "playing" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(`rooms/${room.roomId}`, {
                                action: "pause",
                              })
                            }
                          >
                            Pausieren
                          </button>
                        )}
                        {room.status === "paused" &&
                          room.players.some((p) => p.connected && !p.isBot) && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                action(`rooms/${room.roomId}`, {
                                  action: "resume",
                                })
                              }
                            >
                              Fortsetzen
                            </button>
                          )}
                        <button
                          className="button-secondary"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title:
                                "Partie zurücksetzen? Alle Figuren gehen zurück und die Runde beginnt in der Lobby.",
                              path: `rooms/${room.roomId}`,
                              body: { action: "reset" },
                            })
                          }
                        >
                          Zurücksetzen
                        </button>
                        <button
                          className="button-secondary"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: `Raum ${room.roomId} endgültig löschen? Die Partie und der gespeicherte Spielstand werden entfernt.`,
                              path: `rooms/${room.roomId}`,
                              body: { action: "delete" },
                            })
                          }
                        >
                          Partie löschen
                        </button>
                      </div>
                      <ul>
                        {room.players.map((player) => (
                          <li key={player.id}>
                            <span>
                              {player.name} ·{" "}
                              {player.isBot
                                ? "Computer"
                                : player.connected
                                  ? "online"
                                  : "offline"}
                            </span>
                            <button
                              className="button-secondary"
                              disabled={busy}
                              onClick={() =>
                                setConfirm({
                                  title: `${player.name} aus der Partie entfernen?`,
                                  path: `rooms/${room.roomId}`,
                                  body: { action: "kick", playerId: player.id },
                                })
                              }
                            >
                              Entfernen
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
        </>
      )}
      {filterOpen && overview && (
        <FilterDialog
          terms={overview.terms}
          busy={busy}
          error={error}
          onClose={() => setFilterOpen(false)}
          onAction={action}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          error={error}
          confirmLabel={
            confirm.path.startsWith("reports/")
              ? "Annehmen"
              : "action" in confirm.body && confirm.body.action === "reset"
                ? "Zurücksetzen"
                : "action" in confirm.body && confirm.body.action === "delete"
                  ? "Partie löschen"
                  : "Entfernen"
          }
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => action(confirm.path, confirm.body)}
        />
      )}
    </main>
  );
}
