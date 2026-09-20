import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
export interface FilterTerm {
  term: string;
  builtin: boolean;
  enabled: boolean;
}
export function FilterDialog({
  terms,
  busy,
  error,
  onClose,
  onAction,
}: {
  terms: FilterTerm[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onAction: (path: string, body: object) => Promise<boolean>;
}) {
  const editorRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const [previous, setPrevious] = useState("");
  const [remove, setRemove] = useState<FilterTerm | null>(null);
  const filtered = terms.filter((t) =>
    t.term.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de")),
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await onAction("terms/save", { term: value, previous })) {
      setValue("");
      setPrevious("");
    }
  }
  return (
    <Modal
      label="Filterliste verwalten"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <section className="filter-dialog">
        <header className="dialog-head">
          <div>
            <p className="eyebrow">Moderation</p>
            <h2>Filterliste</h2>
          </div>
          <button
            className="button-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Schließen
          </button>
        </header>
        <p>
          Eigene Begriffe lassen sich entfernen. Eingebaute Regeln werden
          deaktiviert und können wieder aktiviert werden.
        </p>
        {error && (
          <p className="feedback feedback--error" role="alert">
            {error}
          </p>
        )}
        <form noValidate className="filter-editor" onSubmit={save}>
          <label>
            {previous ? "Begriff bearbeiten" : "Begriff hinzufügen"}
            <input
              ref={editorRef}
              value={value}
              maxLength={40}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </label>
          <button disabled={busy || !value.trim()}>
            {previous ? "Speichern" : "Hinzufügen"}
          </button>
          {previous && (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setPrevious("");
                setValue("");
              }}
            >
              Abbrechen
            </button>
          )}
        </form>
        <label>
          Filterliste durchsuchen
          <div className="search-field">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="button-secondary"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="Suche löschen"
              >
                ×
              </button>
            )}
          </div>
        </label>
        <p className="status-line">{filtered.length} Begriffe</p>
        <ul className="filter-list">
          {filtered.map((term) => (
            <li key={term.term}>
              <div>
                <strong>{term.term}</strong>
                <small>
                  {term.builtin ? "Eingebaut" : "Eigener Begriff"} ·{" "}
                  {term.enabled ? "Aktiv" : "Deaktiviert"}
                </small>
              </div>
              <div className="row-actions">
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() => {
                    setPrevious(term.term);
                    setValue(term.term);
                    editorRef.current?.focus();
                  }}
                >
                  Bearbeiten
                </button>
                {term.enabled ? (
                  <button
                    className="button-secondary"
                    disabled={busy}
                    onClick={() => setRemove(term)}
                  >
                    {term.builtin ? "Deaktivieren" : "Entfernen"}
                  </button>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => onAction("terms/save", { term: term.term })}
                  >
                    Aktivieren
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!filtered.length && (
          <p className="empty-state">Kein passender Begriff.</p>
        )}
        {remove && (
          <ConfirmDialog
            title={`„${remove.term}“ ${remove.builtin ? "deaktivieren" : "entfernen"}? Der Begriff wird künftig nicht mehr durch diese Regel gefiltert.`}
            confirmLabel={remove.builtin ? "Deaktivieren" : "Entfernen"}
            error={error}
            busy={busy}
            onCancel={() => setRemove(null)}
            onConfirm={async () => {
              if (await onAction("terms/remove", { term: remove.term }))
                setRemove(null);
            }}
          />
        )}
      </section>
    </Modal>
  );
}
