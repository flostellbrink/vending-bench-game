import type { Release } from "games-common/benchmark";

import { useId, useRef } from "react";

import type { Lang } from "@/localization/messages";

import { msg } from "@/dictionary";
import { syntax, toolFor } from "@/game/commands";
import { toolDefaults } from "@/game/tool-defaults";

import "./tool-info.css";

interface Props {
  release: Release;
  lang: Lang;
  verb: string;
  prediction?: string;
}

export function ToolInfo({ release, lang, verb, prediction }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const alias = verb.toLowerCase();
  const tool = toolFor(alias);
  if (!tool || release.tools[tool] === undefined) return null;
  const options = { locale: lang };
  const heading = msg.operator.toolInformation({}, options);
  const label = heading + ": " + alias;
  const defaults = toolDefaults(release, tool);

  function position() {
    const card = panel.current;
    const button = trigger.current;
    if (!card || !button || !card.matches(":popover-open")) return;
    const rect = button.getBoundingClientRect();
    const gap = 6;
    card.style.left =
      Math.max(gap, Math.min(rect.left, innerWidth - card.offsetWidth - gap)) + "px";
    const below = rect.bottom + gap;
    card.style.top =
      Math.max(
        gap,
        below + card.offsetHeight <= innerHeight
          ? below
          : Math.min(innerHeight - card.offsetHeight - gap, rect.top - card.offsetHeight - gap),
      ) + "px";
  }

  return (
    <>
      <button
        ref={trigger}
        className="tool-info-trigger"
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        popoverTarget={id}
        onClick={(event) => event.stopPropagation()}
      >
        ⓘ
      </button>
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-label={label}
        popover="auto"
        className="tool-info-panel"
        onToggle={position}
      >
        <div className="tool-info-heading">
          <b>{heading}</b>
          <button
            type="button"
            aria-label={msg.operator.dismissInfo({}, options)}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            ×
          </button>
        </div>
        <code>{tool}</code>
        <samp>{syntax(alias)}</samp>
        {prediction && <small className="tool-prediction">{prediction}</small>}
        {defaults && (
          <small>
            {msg.operator.defaults({}, options)}: <code>{defaults}</code>
          </small>
        )}
        <p lang="en">{release.tools[tool]}</p>
      </div>
    </>
  );
}
