import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { createContext, useContext, type ComponentProps, type ReactElement } from "react";

import type { Lang, Translate } from "@/localization/messages";

import { timing } from "@/game/commands";
import { timeLabel } from "@/game/time-label";

import { ActionButton } from "./FormControls";
import { ToolInfo } from "./ToolInfo";

export const ToolReferenceContext = createContext<{
  release: Release;
  actions: Actions;
  lang: Lang;
  state: Snapshot | null;
  t: Translate;
} | null>(null);

export function GuiToolInfo({
  verb,
  children,
}: {
  verb: string;
  children: ReactElement<ComponentProps<"button">, "button">;
}) {
  const context = useContext(ToolReferenceContext);
  if (!context) return children;
  const { state, release, lang, actions, t } = context;
  const span = timing(verb, state);
  return (
    <span className="tool-action-pair">
      <ActionButton {...children.props}>
        {children.props.children}
        {span && verb !== "wait_for_next_day" && (
          <small className="action-duration"> · {span.minutes} min</small>
        )}
      </ActionButton>
      <ToolInfo
        {...{ release, lang, verb, actions }}
        prediction={span ? timeLabel(verb, state, t) : undefined}
      />
    </span>
  );
}
