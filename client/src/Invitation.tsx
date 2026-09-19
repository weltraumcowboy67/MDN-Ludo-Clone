import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { invitationUrl } from "./invitations";

export function Invitation({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const link = invitationUrl(location.origin, roomId);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setFallback(true);
    }
  }
  return (
    <div className="invitation">
      <span>
        Raum <strong>{roomId}</strong>
      </span>
      <button type="button" className="button-secondary" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Link kopiert" : "Einladen"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Einladungslink kopiert." : ""}
      </span>
      {fallback && (
        <label>
          Link zum Kopieren
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </div>
  );
}
