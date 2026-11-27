import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { type Optional } from "games-common/language";
import {
  createContext,
  useContext,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { timing, toolFor } from "@/game/commands.ts";
import { useTimeLabel } from "@/game/time-label.ts";
import { commandLabel } from "@/localization/messages.ts";

import { ToolInfo } from "./ToolInfo.tsx";

export const ToolReferenceContext = createContext<
  Optional<{
    release: Release;
    actions: Actions;

    state: Optional<Snapshot>;
  }>
>(null);

/** A button that runs a benchmark tool, with its time cost and its published description. */
export function GuiToolInfo({
  verb,
  children,
  type,
  disabled,
  onClick,
  className,
  title,
  popup = false,
  armed,
  onBlur,
  onKeyDown,
  preview = true,
}: {
  verb: string;
  children?: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
  /** The button opens a dialog. */
  popup?: boolean;
  armed?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  /** The scene previews the time cost while the pointer or focus is on the button. */
  preview?: boolean;
}) {
  const context = useContext(ToolReferenceContext);
  const timeLabel = useTimeLabel();
  const span = context ? timing(verb, context.state) : null;
  const button = (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={context ? `workbench-button ${className ?? ""}`.trim() : className}
      title={title}
      aria-haspopup={popup ? "dialog" : undefined}
      data-armed={armed}
      data-clock-verb={preview ? verb : undefined}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {context ? (children ?? commandLabel(toolFor(verb)) ?? verb) : children}
      {span && verb !== "wait_for_next_day" && (
        <small className="action-duration"> · {span.minutes} min</small>
      )}
    </button>
  );
  if (!context) {
    return button;
  }
  return (
    <span className="tool-action-pair">
      {button}
      <ToolInfo
        actions={context.actions}
        release={context.release}
        verb={verb}
        prediction={span ? timeLabel(verb, context.state) : undefined}
      />
    </span>
  );
}
