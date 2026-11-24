import type { Snapshot } from "games-common/benchmark";

import { useId, useState } from "react";

import type { Translate } from "@/localization/messages";

import { quotedWord } from "@/game/command-words";
import { timeLabel } from "@/game/time-label";

interface Props {
  to: string;
  subject?: string;
  state: Snapshot;
  t: Translate;
  disabled: boolean;
  send: (line: string) => void;
}

export function SupplierLetter({ to, subject = "", state, t, disabled, send }: Props) {
  const [open, setOpen] = useState(false);
  const field = useId();
  const [title, setTitle] = useState(subject);
  const [body, setBody] = useState("");
  function close() {
    setTitle(subject);
    setBody("");
    setOpen(false);
  }
  return (
    <div className="letter-compose">
      {!open ? (
        <button
          className="receipt-link"
          onClick={() => {
            setOpen(true);
          }}
        >
          {t("writeLetter")}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (disabled || !body.trim()) return;
            send("mail " + to + " " + quotedWord(title) + " " + quotedWord(body));
            close();
          }}
        >
          <header>
            <b>{t("draft")}</b>
            <span>{to}</span>
          </header>
          <label htmlFor={field + "-subject"}>{t("mailSubject")}</label>
          <input
            id={field + "-subject"}
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
          <label htmlFor={field + "-body"}>{t("letter")}</label>
          <textarea
            id={field + "-body"}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
          />
          <small>{t("supplierMailTerms")}</small>
          <div>
            <button data-clock-verb="mail" disabled={disabled || !body.trim()}>
              {t("sendLetter")} · {timeLabel("mail", state, t)}
            </button>
            <button type="button" onClick={close}>
              {t("cancelPlan")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
