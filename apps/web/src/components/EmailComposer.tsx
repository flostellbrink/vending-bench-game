import type { Report } from "games-common/benchmark";

import { useId, useRef, useState } from "react";

import { msg } from "@/dictionary";
import { commandForMove } from "@/game/commands";

import { ActionButton, ControlInput, ControlRow, Field, ControlTextarea } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
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
  if (!mail?.mail) return undefined;
  const folder = reports.findLast(
    (receipt) =>
      receipt.tool === "list_emails" && receipt.rows.some(([id]) => id === mail.args.email_id),
  );
  if (!folder) return undefined;
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
  const label = subject === undefined ? msg.operator.writeLetter() : msg.operator.replyToMail();
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
            if (disabled || !recipient.trim()) return;
            dialog.current?.close();
            send(commandForMove(["send_email", { to: recipient, subject: title, body }]));
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
              <ControlInput
                ref={recipientField}
                inputMode="email"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.currentTarget.value)}
              />
            </Field>
            <Field label={msg.operator.mailSubject()}>
              <ControlInput
                ref={titleField}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
            </Field>
          </div>
          <Field className="compose-message" label={msg.operator.letter()}>
            <ControlTextarea
              ref={messageField}
              rows={7}
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </Field>
          <p>{msg.operator.supplierMailTerms()}</p>
          <ControlRow className="compose-actions">
            <ActionButton type="button" onClick={() => dialog.current?.close()}>
              {msg.operator.cancelMail()}
            </ActionButton>
            <GuiToolInfo verb="send_email">
              <button
                type="submit"
                data-clock-verb="send_email"
                disabled={disabled || !recipient.trim()}
              />
            </GuiToolInfo>
          </ControlRow>
        </form>
      </dialog>
    </>
  );
}
