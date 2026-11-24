import type { Report, Snapshot } from "games-common/benchmark";

import { useId, useRef, useState } from "react";

import type { Translate } from "@/localization/messages";

import { quotedWord } from "@/game/command-words";
import { timeLabel } from "@/game/time-label";

import { GuiToolInfo } from "./GuiToolInfo";
import "./email-composer.css";

interface Props {
  to: string;
  subject?: string;
  reports: Report[];
  state: Snapshot;
  t: Translate;
  disabled: boolean;
  send: (line: string) => void;
}

function observedSender(reports: Report[]) {
  const mail = reports.findLast((receipt) => receipt.mail && receipt.args.email_id);
  if (!mail?.mail) return undefined;
  const folder = reports.findLast(
    (receipt) =>
      receipt.tool === "list_emails" && receipt.rows.some(([id]) => id === mail.args.email_id),
  );
  if (!folder) return undefined;
  return folder.args.folder === "sent" ? mail.mail.from : mail.mail.to;
}

export function EmailComposer({ to, subject, reports, state, t, disabled, send }: Props) {
  const headingId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleField = useRef<HTMLInputElement>(null);
  const recipientField = useRef<HTMLInputElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const [recipient, setRecipient] = useState(to);
  const [title, setTitle] = useState(subject ?? "");
  const [body, setBody] = useState("");
  const label = subject === undefined ? t("writeLetter") : t("replyToMail");
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="mail-compose-trigger"
        aria-haspopup="dialog"
        onClick={() => {
          setRecipient(to);
          setTitle(subject ?? "");
          setBody("");
          dialog.current?.showModal();
          const firstField = !to
            ? recipientField
            : subject === undefined
              ? titleField
              : messageField;
          firstField.current?.focus();
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="mail-composer"
        onClose={() => trigger.current?.focus()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || !recipient.trim() || !body.trim()) return;
            dialog.current?.close();
            send(["mail", recipient.trim(), quotedWord(title), quotedWord(body)].join(" "));
          }}
        >
          <header>
            <h2 id={headingId}>{label}</h2>
          </header>
          <div className="compose-addresses">
            <div>
              <b>{t("mailFrom")}</b>
              <span>{observedSender(reports) ?? t("operator")}</span>
            </div>
            <label>
              <b>{t("mailTo")}</b>
              <input
                ref={recipientField}
                type="email"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.currentTarget.value)}
              />
            </label>
            <label>
              <b>{t("mailSubject")}</b>
              <input
                ref={titleField}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
            </label>
          </div>
          <label className="compose-message">
            {t("letter")}
            <textarea
              ref={messageField}
              rows={7}
              required
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </label>
          <p>{t("supplierMailTerms")}</p>
          <div className="compose-actions">
            <button type="button" onClick={() => dialog.current?.close()}>
              {t("cancelMail")}
            </button>
            <GuiToolInfo verb="mail" cost={timeLabel("mail", state, t)}>
              <button
                type="submit"
                data-clock-verb="mail"
                disabled={disabled || !recipient.trim() || !body.trim()}
              >
                {t("sendLetter")}
              </button>
            </GuiToolInfo>
          </div>
        </form>
      </dialog>
    </>
  );
}
