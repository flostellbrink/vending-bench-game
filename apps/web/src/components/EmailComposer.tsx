import type { Report } from "games-common/benchmark";

import { useId, useRef, useState } from "react";

import type { Translate } from "@/localization/messages";

import { quotedWord } from "@/game/command-words";

import { ActionButton, ControlInput, ControlRow, Field, ControlTextarea } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
import "./email-composer.css";

interface Props {
  to: string;
  subject?: string;
  reports: Report[];
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

export function EmailComposer({ to, subject, reports, t, disabled, send }: Props) {
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
      <ActionButton
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
      </ActionButton>
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
            <Field label={t("mailTo")}>
              <ControlInput
                ref={recipientField}
                type="email"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.currentTarget.value)}
              />
            </Field>
            <Field label={t("mailSubject")}>
              <ControlInput
                ref={titleField}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
            </Field>
          </div>
          <Field className="compose-message" label={t("letter")}>
            <ControlTextarea
              ref={messageField}
              rows={7}
              required
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </Field>
          <p>{t("supplierMailTerms")}</p>
          <ControlRow className="compose-actions">
            <ActionButton type="button" onClick={() => dialog.current?.close()}>
              {t("cancelMail")}
            </ActionButton>
            <GuiToolInfo verb="mail">
              <button
                type="submit"
                data-clock-verb="mail"
                disabled={disabled || !recipient.trim() || !body.trim()}
              >
                {t("sendLetter")}
              </button>
            </GuiToolInfo>
          </ControlRow>
        </form>
      </dialog>
    </>
  );
}
