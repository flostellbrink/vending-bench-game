import type { Release, Snapshot } from "games-common/benchmark";

import {
  cloneElement,
  createContext,
  useContext,
  type ComponentProps,
  type ReactElement,
} from "react";

import type { Lang, Translate } from "@/localization/messages";

import { timing } from "@/game/commands";
import { timeLabel } from "@/game/time-label";

import { ToolInfo } from "./ToolInfo";

export const ToolReferenceContext = createContext<{
  release: Release;
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
  const { state, release, lang, t } = context;
  const span = timing(verb, state);
  return (
    <span className="tool-action-pair">
      {span && verb !== "close"
        ? cloneElement(
            children,
            {},
            children.props.children,
            <small className="action-duration"> · {span.minutes} min</small>,
          )
        : children}
      <ToolInfo
        {...{ release, lang, verb }}
        prediction={span ? timeLabel(verb, state, t) : undefined}
      />
    </span>
  );
}
