import type { Report } from "games-common/benchmark";

import { hasValue } from "games-common/language";
import { useId, useRef, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { commandForMove } from "@/game/commands.ts";

import { Field } from "./FormControls.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";
import "./email-composer.css";

interface Props {
  to: string;
  subject?: string;
  reports: Report[];

  disabled: boolean;
  send: (line: string) => void;
}

function observedSender(reports: Report[]) {
  const mail = reports.findLast((receipt) => receipt.mail && receipt.args.email_id);
  if (!mail?.mail) {
    return undefined;
  }
  const folder = reports.findLast(
    (receipt) =>
      receipt.tool === "list_emails" && receipt.rows.some(([id]) => id === mail.args.email_id),
  );
  if (!folder) {
    return undefined;
  }
  return folder.args.folder === "sent" ? mail.mail.from : mail.mail.to;
}

export function EmailComposer({ to, subject, reports, disabled, send }: Props) {
  const headingId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleField = useRef<HTMLInputElement>(null);
  const recipientField = useRef<HTMLInputElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const [recipient, setRecipient] = useState(to);
  const [title, setTitle] = useState(subject ?? "");
  const [body, setBody] = useState("");
  const label = hasValue(subject) ? msg.operator.replyToMail() : msg.operator.writeLetter();
  /** The first field that the letter still needs. */
  function firstField() {
    if (!to) {
      return recipientField.current;
    }
    if (!hasValue(subject)) {
      return titleField.current;
    }
    return messageField.current;
  }
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="workbench-button mail-compose-trigger"
        aria-haspopup="dialog"
        onClick={() => {
          setRecipient(to);
          setTitle(subject ?? "");
          setBody("");
          dialog.current?.showModal();
          firstField()?.focus();
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="workbench-dialog mail-composer"
        onClose={() => trigger.current?.focus()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || !recipient.trim()) {
              return;
            }
            dialog.current?.close();
            send(commandForMove(["send_email", { body, subject: title, to: recipient }]));
          }}
        >
          <header>
            <h2 id={headingId}>{label}</h2>
          </header>
          <div className="compose-addresses">
            <div>
              <b>{msg.operator.mailFrom()}</b>
              <span>{observedSender(reports) ?? msg.operator.operator()}</span>
            </div>
            <Field label={msg.operator.mailTo()}>
              <input
                className="control-input"
                ref={recipientField}
                inputMode="email"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.currentTarget.value)}
              />
            </Field>
            <Field label={msg.operator.mailSubject()}>
              <input
                className="control-input"
                ref={titleField}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
            </Field>
          </div>
          <Field className="compose-message" label={msg.operator.letter()}>
            <textarea
              className="control-textarea"
              ref={messageField}
              rows={7}
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </Field>
          <p>{msg.operator.supplierMailTerms()}</p>
          <div className="control-row compose-actions">
            <button
              className="workbench-button"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              {msg.operator.cancelMail()}
            </button>
            <GuiToolInfo verb="send_email" type="submit" disabled={disabled || !recipient.trim()} />
          </div>
        </form>
      </dialog>
    </>
  );
}
