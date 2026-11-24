import type { CommandArgs, Release } from "games-common/benchmark";
import type { FormEvent, ReactNode } from "react";

import { useId, useState } from "react";

import { msg } from "@/dictionary";
import { commandForMove, type ToolName } from "@/game/commands";
import { commandLabel } from "@/localization/messages";

import type { ObservationProps } from "./panel-props";

import { ActionForm, ControlInput, ControlTextarea, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
import ObservationView from "./ObservationView";
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

export function OperationsDesk(props: Props) {
  const { desk, release, state, reports, disabled, runCommand } = props;
  const defaultKey = release.toolDefaults.read_notes?.key;
  const defaultDays = release.toolDefaults.set_reminder?.in_days;
  const [noteKey, setNoteKey] = useState("");
  const [noteText, setNoteText] = useState("");
  const channelList = useId();
  const locationList = useId();
  const keyList = useId();
  function dispatch(tool: ToolName, args: CommandArgs = {}) {
    if (!disabled) runCommand(commandForMove([tool, args]), "inline");
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
      <GuiToolInfo verb={tool}>
        <button
          type={options.onClick ? "button" : "submit"}
          disabled={disabled || options.inactive}
          data-clock-verb={tool}
          onClick={options.onClick}
        >
          {options.label ?? commandLabel(tool)}
        </button>
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
        {report && <ObservationView {...props} report={report} />}
      </section>
    );
  }
  let forms: ReactNode;
  switch (desk) {
    case "status":
      forms = block("get_status", inspect("get_status"));
      break;
    case "payments":
      forms = block(
        "send_payment",
        <ActionForm
          className="payment-fields"
          actions={button("send_payment")}
          onSubmit={submit("send_payment", (data) => ({
            recipient: value(data, "recipient"),
            amount: Number(value(data, "amount")),
            reference: value(data, "reference"),
          }))}
        >
          <Field label={msg.fields.recipient()}>
            <ControlInput name="recipient" required />
          </Field>
          <Field label={msg.fields.amount()}>
            <ControlInput name="amount" type="number" step="any" required />
          </Field>
          <Field label={msg.fields.reference()}>
            <ControlInput name="reference" required />
          </Field>
        </ActionForm>,
      );
      break;
    case "marketing": {
      const rules = reports.findLast((r) => r.channels)?.channels?.rules.channels;
      const channels =
        rules && typeof rules === "object" && !Array.isArray(rules) ? Object.keys(rules) : [];
      forms = (
        <>
          {block(
            "run_marketing",
            <ActionForm
              className="campaign-fields"
              actions={button("run_marketing")}
              onSubmit={submit("run_marketing", (data) => ({
                location: value(data, "location"),
                channel: value(data, "channel"),
                message: value(data, "message"),
              }))}
            >
              <Field label={msg.fields.location()}>
                <ControlInput name="location" list={locationList} required />
              </Field>
              <datalist id={locationList}>
                {state.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </datalist>
              <Field label={msg.fields.channel()}>
                <ControlInput name="channel" list={channelList} required />
              </Field>
              <datalist id={channelList}>
                {channels.map((channel) => (
                  <option key={channel} value={channel} />
                ))}
              </datalist>
              <Field wide label={msg.fields.message()}>
                <ControlTextarea rows={2} name="message" required />
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
      const keys = [
        ...new Set(
          reports.flatMap((r) => (r.tool === "write_note" && r.args.key ? [r.args.key] : [])),
        ),
      ];
      forms = (
        <>
          {block(
            "read_notes",
            <ActionForm
              className="note-lookup compact"
              onSubmit={submit("read_notes", (data) => ({ key: value(data, "key") }))}
              actions={button("read_notes")}
            >
              <Field label={msg.fields.key()}>
                <ControlInput
                  name="key"
                  list={keyList}
                  defaultValue={typeof defaultKey === "string" ? defaultKey : ""}
                />
              </Field>
            </ActionForm>,
            msg.operator.savedNotes(),
          )}
          {block(
            "write_note",
            <ActionForm
              className="note-editor"
              onSubmit={(event) => {
                event.preventDefault();
                if (noteKey.trim() && noteText)
                  dispatch("write_note", { key: noteKey, text: noteText });
              }}
              actions={button("write_note", {
                inactive: !noteKey.trim(),
                label: !noteText && noteKey.trim() ? msg.operator.deleteNote() : undefined,
                onClick: () => dispatch("write_note", { key: noteKey, text: noteText }),
              })}
            >
              <Field label={msg.fields.key()}>
                <ControlInput
                  name="key"
                  value={noteKey}
                  list={keyList}
                  onChange={(event) => setNoteKey(event.currentTarget.value)}
                />
              </Field>
              <datalist id={keyList}>
                {keys.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>
              <Field wide label={msg.fields.text()}>
                <ControlTextarea
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
    case "reminders":
      forms = (
        <>
          {block(
            "set_reminder",
            <ActionForm
              className="reminder-fields"
              actions={button("set_reminder")}
              onSubmit={submit("set_reminder", (data) => ({
                text: value(data, "text"),
                in_days: Number(value(data, "in_days")),
              }))}
            >
              <Field label={msg.fields.in_days()}>
                <ControlInput
                  type="number"
                  step="1"
                  name="in_days"
                  defaultValue={typeof defaultDays === "number" ? defaultDays : undefined}
                  required
                />
              </Field>
              <Field wide label={msg.fields.text()}>
                <ControlTextarea rows={2} name="text" />
              </Field>
            </ActionForm>,
            msg.operator.newReminder(),
          )}
          {block("list_reminders", inspect("list_reminders"))}
        </>
      );
      break;
  }
  return (
    <section className="sheet business-report operations-desk">
      <div className="operations-controls">{forms}</div>
    </section>
  );
}
