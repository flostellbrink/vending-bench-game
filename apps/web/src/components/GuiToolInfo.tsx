import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { createContext, useContext, type ComponentProps, type ReactElement } from "react";

import { timing, toolFor } from "@/game/commands";
import { useTimeLabel } from "@/game/time-label";
import { commandLabel } from "@/localization/messages";

import { ActionButton } from "./FormControls";
import { ToolInfo } from "./ToolInfo";

export const ToolReferenceContext = createContext<{
  release: Release;
  actions: Actions;

  state: Snapshot | null;
} | null>(null);

export function GuiToolInfo({
  verb,
  children,
}: {
  verb: string;
  children: ReactElement<ComponentProps<"button">, "button">;
}) {
  const context = useContext(ToolReferenceContext);
  const timeLabel = useTimeLabel();
  if (!context) return children;
  const { state, release, actions } = context;
  const span = timing(verb, state);
  return (
    <span className="tool-action-pair">
      <ActionButton {...children.props}>
        {children.props.children ?? commandLabel(toolFor(verb)) ?? verb}
        {span && verb !== "wait_for_next_day" && (
          <small className="action-duration"> · {span.minutes} min</small>
        )}
      </ActionButton>
      <ToolInfo
        {...{ release, verb, actions }}
        prediction={span ? timeLabel(verb, state) : undefined}
      />
    </span>
  );
}
