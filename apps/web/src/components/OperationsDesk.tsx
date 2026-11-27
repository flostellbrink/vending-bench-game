import type { CommandArgs, Release } from "games-common/benchmark";
import type { FormEvent, ReactNode } from "react";

import { keys } from "games-common/language";
import { useId, useMemo, useRef, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { commandForMove, type ToolName } from "@/game/commands.ts";
import { noteSnapshot } from "@/game/note-snapshot.ts";
import { commandLabel } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import { ActionForm, Field } from "./FormControls.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";
import ObservationView from "./ObservationView.tsx";
import "./operations-desk.css";

type Desk = "status" | "payments" | "marketing" | "notes" | "reminders";
type Props = Omit<ObservationProps, "report"> & {
  desk: Desk;
  release: Release;
  openReport: (id: number) => void;
};

function value(data: FormData, key: string) {
  const entry = data.get(key);
  return typeof entry === "string" ? entry : "";
}

export function OperationsDesk({
  desk,
  release,
  state,
  reports,
  money,
  disabled,
  runCommand,
  openReport,
}: Props) {
  const defaultDays = release.toolDefaults.set_reminder?.in_days;
  const [noteKey, setNoteKey] = useState("");
  const [noteText, setNoteText] = useState("");
  const channelList = useId();
  const locationList = useId();
  const keyList = useId();
  const editor = useRef<HTMLTextAreaElement>(null);
  const notebook = useMemo(
    () => (desk === "notes" ? noteSnapshot(reports) : null),
    [desk, reports],
  );
  function dispatch(tool: ToolName, args: CommandArgs = {}) {
    if (!disabled) {
      runCommand(commandForMove([tool, args]), "inline");
    }
  }
  function submit(tool: ToolName, getArgs: (form: FormData) => CommandArgs) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      dispatch(tool, getArgs(new FormData(event.currentTarget)));
    };
  }
  function button(
    tool: ToolName,
    options: { onClick?: () => void; label?: string; inactive?: boolean } = {},
  ) {
    return (
      <GuiToolInfo
        verb={tool}
        type={options.onClick ? "button" : "submit"}
        disabled={disabled || options.inactive}
        onClick={options.onClick}
      >
        {options.label ?? commandLabel(tool)}
      </GuiToolInfo>
    );
  }
  function inspect(tool: ToolName) {
    return button(tool, { onClick: () => dispatch(tool) });
  }
  function block(tool: ToolName, controls: ReactNode, title?: string) {
    const report = reports.findLast((entry) => entry.tool === tool);
    return (
      <section className="operation-block" aria-label={title ?? commandLabel(tool)}>
        {title && <h3>{title}</h3>}
        {controls}
        {report && (
          <ObservationView
            report={report}
            reports={reports}
            state={state}
            money={money}
            runCommand={runCommand}
            disabled={disabled}
            openReport={openReport}
          />
        )}
      </section>
    );
  }
  let forms: ReactNode = null;
  switch (desk) {
    case "status": {
      forms = block("get_status", inspect("get_status"));
      break;
    }
    case "payments": {
      forms = block(
        "send_payment",
        <ActionForm
          className="payment-fields"
          actions={button("send_payment")}
          onSubmit={submit("send_payment", (data) => ({
            amount: Number(value(data, "amount")),
            recipient: value(data, "recipient"),
            reference: value(data, "reference"),
          }))}
        >
          <Field label={msg.fields.recipient()}>
            <input className="control-input" name="recipient" required />
          </Field>
          <Field label={msg.fields.amount()}>
            <input className="control-input" name="amount" type="number" step="any" required />
          </Field>
          <Field label={msg.fields.reference()}>
            <input className="control-input" name="reference" required />
          </Field>
        </ActionForm>,
      );
      break;
    }
    case "marketing": {
      const rules = reports.findLast((r) => r.channels)?.channels?.rules.channels;
      const channels =
        rules && typeof rules === "object" && !Array.isArray(rules) ? keys(rules) : [];
      forms = (
        <>
          {block(
            "run_marketing",
            <ActionForm
              className="campaign-fields"
              actions={button("run_marketing")}
              onSubmit={submit("run_marketing", (data) => ({
                channel: value(data, "channel"),
                location: value(data, "location"),
                message: value(data, "message"),
              }))}
            >
              <Field label={msg.fields.location()}>
                <input className="control-input" name="location" list={locationList} required />
              </Field>
              <datalist id={locationList}>
                {state.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </datalist>
              <Field label={msg.fields.channel()}>
                <input className="control-input" name="channel" list={channelList} required />
              </Field>
              <datalist id={channelList}>
                {channels.map((channel) => (
                  <option key={channel} value={channel} />
                ))}
              </datalist>
              <Field wide label={msg.fields.message()}>
                <textarea className="control-textarea" rows={2} name="message" required />
              </Field>
            </ActionForm>,
            msg.operator.campaignDraft(),
          )}
          {block("get_marketing_report", inspect("get_marketing_report"))}
        </>
      );
      break;
    }
    case "notes": {
      forms = (
        <>
          <section className="operation-block" aria-label={msg.operator.savedNotes()}>
            <h3>{msg.operator.savedNotes()}</h3>
            {inspect("read_notes")}
            {notebook && (
              <>
                <button
                  className="receipt-link note-source"
                  type="button"
                  onClick={() => openReport(notebook.read.id)}
                >
                  {msg.operator.seen()} · {msg.operator.day()} {notebook.read.day} /{" "}
                  {clock(notebook.read.minute)} · #{notebook.read.id}
                </button>
                {notebook.entries ? (
                  notebook.entries.map((note) => (
                    <details className="saved-note" key={note.key}>
                      <summary>
                        {note.key}{" "}
                        <small>
                          · {msg.operator.day()} {note.day}
                        </small>
                      </summary>
                      <pre>{note.text}</pre>
                      <button
                        className="workbench-button"
                        type="button"
                        onClick={() => {
                          setNoteKey(note.key);
                          setNoteText(note.text);
                          editor.current?.focus();
                        }}
                      >
                        {msg.operator.editNote()}
                      </button>
                    </details>
                  ))
                ) : (
                  <pre className="note-original">{notebook.read.output}</pre>
                )}
              </>
            )}
          </section>
          {block(
            "write_note",
            <ActionForm
              className="note-editor"
              onSubmit={(event) => {
                event.preventDefault();
                if (noteKey.trim() && noteText) {
                  dispatch("write_note", { key: noteKey, text: noteText });
                }
              }}
              actions={button("write_note", {
                inactive: !noteKey.trim(),
                label: !noteText && noteKey.trim() ? msg.operator.deleteNote() : undefined,
                onClick: () => dispatch("write_note", { key: noteKey, text: noteText }),
              })}
            >
              <Field label={msg.fields.key()}>
                <input
                  className="control-input"
                  name="key"
                  value={noteKey}
                  list={keyList}
                  onChange={(event) => setNoteKey(event.currentTarget.value)}
                />
              </Field>
              <datalist id={keyList}>
                {notebook?.entries?.map((note) => (
                  <option key={note.key} value={note.key} />
                ))}
              </datalist>
              <Field wide label={msg.fields.text()}>
                <textarea
                  className="control-textarea"
                  ref={editor}
                  rows={2}
                  value={noteText}
                  onChange={(event) => setNoteText(event.currentTarget.value)}
                />
              </Field>
            </ActionForm>,
            msg.operator.noteEditor(),
          )}
        </>
      );
      break;
    }
    case "reminders": {
      forms = (
        <>
          {block(
            "set_reminder",
            <ActionForm
              className="reminder-fields"
              actions={button("set_reminder")}
              onSubmit={submit("set_reminder", (data) => ({
                in_days: Number(value(data, "in_days")),
                text: value(data, "text"),
              }))}
            >
              <Field label={msg.fields.in_days()}>
                <input
                  className="control-input"
                  type="number"
                  step="1"
                  name="in_days"
                  defaultValue={typeof defaultDays === "number" ? defaultDays : undefined}
                  required
                />
              </Field>
              <Field wide label={msg.fields.text()}>
                <textarea className="control-textarea" rows={2} name="text" />
              </Field>
            </ActionForm>,
            msg.operator.newReminder(),
          )}
          {block("list_reminders", inspect("list_reminders"))}
        </>
      );
      break;
    }
  }
  return (
    <section className="sheet business-report operations-desk">
      <div className="operations-controls">{forms}</div>
    </section>
  );
}
