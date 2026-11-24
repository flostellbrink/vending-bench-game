import type { Report } from "games-common/benchmark";
import type { ReactNode, RefObject } from "react";

import { useId, useLayoutEffect, useRef } from "react";

import type { View } from "@/game/readout-path";

import { msg } from "@/dictionary";
import { toolFor } from "@/game/commands";
import { commandLabel } from "@/localization/messages";

import { ActionButton } from "./FormControls";
import "./result-dialog.css";

export function resultTitle(view: View, report?: Report, owner = "") {
  if (typeof view === "number" && report && report.endDay !== report.day)
    return msg.operator.statement() + " · " + msg.operator.day() + " " + report.day;
  if (typeof view === "number" && report)
    return (
      report.mail?.subject ??
      report.terms?.order ??
      commandLabel(toolFor(report.tool)) ??
      report.tool
    );
  if (typeof view === "string" && view.startsWith("day:"))
    return msg.operator.day() + " " + view.slice(4) + " · " + msg.operator.results();
  if (typeof view === "string" && view.startsWith("past:"))
    return msg.operator.history() + " · " + owner;
  return owner;
}

export function ResultDialog({
  title,
  children,
  close,
  related,
  covered = false,
  opener,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  related?: ReactNode;
  covered?: boolean;
  opener?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement;
    const origin =
      active instanceof HTMLElement && active !== document.body ? active : opener?.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [opener]);
  return (
    <dialog
      ref={ref}
      className="workbench-dialog result-dialog"
      aria-labelledby={heading}
      data-covered={covered || undefined}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id={heading}>{title}</h2>
        {related}
        <ActionButton type="button" onClick={close}>
          {msg.operator.closeDialog()}
        </ActionButton>
      </header>
      <div className="readout result-body">{children}</div>
    </dialog>
  );
}
