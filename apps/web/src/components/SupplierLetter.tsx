import type { Snapshot } from "games-common/benchmark";

import { useId, useState } from "react";

import type { Translate } from "@/localization/messages";

import { commandWords, quotedWord } from "@/game/command-words";
import { timeLabel } from "@/game/time-label";

interface Props {
  to: string;
  subject?: string;
  line: string;
  state: Snapshot;
  t: Translate;
  disabled: boolean;
  stage: (line: string) => void;
  send: (line: string, fromPrompt?: boolean) => void;
}

export function SupplierLetter({ to, subject = "", line, state, t, disabled, stage, send }: Props) {
  const [open, setOpen] = useState(false);
  const field = useId();
  let words: string[] = [];
  try {
    words = commandWords(line);
  } catch {
    /* An unfinished quoted argument stays in the shell. */
  }
  const addressed = words[0]?.toLowerCase() === "mail" && words[1] === to;
  const title = addressed ? (words[2] ?? "") : subject;
  const body = addressed ? words.slice(3).join(" ") : "";
  const draft = (s: string, b: string) => "mail " + to + " " + quotedWord(s) + " " + quotedWord(b);
  const shown = open || addressed;
  return (
    <div className="letter-compose">
      {!shown ? (
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
            if (disabled || !addressed || !body.trim()) return;
            send(draft(title, body), true);
            setOpen(false);
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
            onChange={(e) => stage(draft(e.currentTarget.value, body))}
          />
          <label htmlFor={field + "-body"}>{t("letter")}</label>
          <textarea
            id={field + "-body"}
            rows={3}
            value={body}
            onChange={(e) => stage(draft(title, e.currentTarget.value))}
          />
          <small>{t("supplierMailTerms")}</small>
          <div>
            <button data-clock-verb="mail" disabled={disabled || !addressed || !body.trim()}>
              {t("sendLetter")} · {timeLabel("mail", state, t)}
            </button>
            <button
              type="button"
              onClick={() => {
                if (addressed) stage("");
                setOpen(false);
              }}
            >
              {t("cancelPlan")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
