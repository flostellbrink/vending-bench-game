import type { CommandArgs, Release } from "games-common/benchmark";
import type { FormEvent, ReactNode } from "react";

import { useId, useState } from "react";

import { commandForMove, type ToolName } from "@/game/commands";
import { commandLabel, fieldLabel } from "@/localization/messages";

import type { ObservationProps } from "./panel-props";

import { ControlInput, ControlRow, ControlTextarea, Field } from "./FormControls";
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
  const { desk, lang, t, release, state, reports, disabled, runCommand } = props;
  const defaultKey = release.toolDefaults.read_notes?.key;
  const defaultDays = release.toolDefaults.set_reminder?.in_days;
  const [noteKey, setNoteKey] = useState(typeof defaultKey === "string" ? defaultKey : "");
  const [noteText, setNoteText] = useState("");
  const channelList = useId();
  const locationList = useId();
  const keyList = useId();
  function dispatch(tool: ToolName, args: CommandArgs = {}) {
    if (!disabled) runCommand(commandForMove([tool, args]), false, true);
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
          {options.label ?? commandLabel(tool, lang)}
        </button>
      </GuiToolInfo>
    );
  }
  const field = (key: string) => fieldLabel(key, lang);
  let forms: ReactNode;
  let tools: ToolName[];
  switch (desk) {
    case "status":
      tools = ["get_status"];
      forms = button("get_status", { onClick: () => dispatch("get_status") });
      break;
    case "payments":
      tools = ["send_payment"];
      forms = (
        <form
          onSubmit={submit("send_payment", (data) => ({
            recipient: value(data, "recipient"),
            amount: Number(value(data, "amount")),
            reference: value(data, "reference"),
          }))}
        >
          <ControlRow>
            <Field label={field("recipient")}>
              <ControlInput name="recipient" required />
            </Field>
            <Field label={field("amount")}>
              <ControlInput name="amount" type="number" step="any" required />
            </Field>
            <Field label={field("reference")}>
              <ControlInput name="reference" required />
            </Field>
            {button("send_payment")}
          </ControlRow>
        </form>
      );
      break;
    case "marketing": {
      tools = ["get_marketing_report", "run_marketing"];
      const rules = reports.findLast((r) => r.channels)?.channels?.rules.channels;
      const channels =
        rules && typeof rules === "object" && !Array.isArray(rules) ? Object.keys(rules) : [];
      forms = (
        <>
          {button("get_marketing_report", { onClick: () => dispatch("get_marketing_report") })}
          <form
            onSubmit={submit("run_marketing", (data) => ({
              location: value(data, "location"),
              channel: value(data, "channel"),
              message: value(data, "message"),
            }))}
          >
            <ControlRow>
              <Field label={field("location")}>
                <ControlInput name="location" list={locationList} required />
              </Field>
              <datalist id={locationList}>
                {state.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </datalist>
              <Field label={field("channel")}>
                <ControlInput name="channel" list={channelList} required />
              </Field>
              <datalist id={channelList}>
                {channels.map((channel) => (
                  <option key={channel} value={channel} />
                ))}
              </datalist>
            </ControlRow>
            <Field label={field("message")}>
              <ControlTextarea rows={2} name="message" required />
            </Field>
            {button("run_marketing")}
          </form>
        </>
      );
      break;
    }
    case "notes": {
      tools = ["read_notes", "write_note"];
      const keys = [
        ...new Set(
          reports.flatMap((r) => (r.tool === "write_note" && r.args.key ? [r.args.key] : [])),
        ),
      ];
      forms = (
        <form onSubmit={submit("read_notes", () => ({ key: noteKey }))}>
          <ControlRow>
            <Field label={field("key")}>
              <ControlInput
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
            {button("read_notes", { label: noteKey ? undefined : t("allNotes") })}
          </ControlRow>
          <Field label={field("text")}>
            <ControlTextarea
              rows={2}
              value={noteText}
              onChange={(event) => setNoteText(event.currentTarget.value)}
            />
          </Field>
          {button("write_note", {
            inactive: !noteKey.trim(),
            label: !noteText && noteKey.trim() ? t("deleteNote") : undefined,
            onClick: () => dispatch("write_note", { key: noteKey, text: noteText }),
          })}
        </form>
      );
      break;
    }
    case "reminders":
      tools = ["list_reminders", "set_reminder"];
      forms = (
        <>
          {button("list_reminders", { onClick: () => dispatch("list_reminders") })}
          <form
            onSubmit={submit("set_reminder", (data) => ({
              text: value(data, "text"),
              in_days: Number(value(data, "in_days")),
            }))}
          >
            <Field label={field("text")}>
              <ControlTextarea rows={2} name="text" />
            </Field>
            <ControlRow>
              <Field label={field("in_days")}>
                <ControlInput
                  type="number"
                  step="1"
                  name="in_days"
                  defaultValue={typeof defaultDays === "number" ? defaultDays : undefined}
                  required
                />
              </Field>
              {button("set_reminder")}
            </ControlRow>
          </form>
        </>
      );
      break;
  }
  const report = reports.findLast((r) => tools.some((tool) => tool === r.tool));
  return (
    <section className="sheet business-report operations-desk">
      <div className="operations-controls">{forms}</div>
      {report && <ObservationView {...props} report={report} />}
    </section>
  );
}
