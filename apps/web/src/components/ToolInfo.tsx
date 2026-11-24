import type { Release } from "games-common/benchmark";

import { useId, useRef, useState } from "react";

import type { Lang } from "@/localization/messages";

import { msg } from "@/dictionary";
import { commandGroups, syntax, toolFor } from "@/game/commands";

import "./tool-info.css";

interface Props {
  release: Release;
  lang: Lang;
  verb?: string;
}

const verbs = Object.values(commandGroups).flat();

export function ToolInfo({ release, lang, verb }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState("");
  const available = verb
    ? []
    : verbs.filter((alias) => {
        const tool = toolFor(alias);
        return tool && release.tools[tool] !== undefined;
      });
  const alias = verb?.toLowerCase() ?? (choice || available[0]);
  const tool = alias && toolFor(alias);
  if (!tool || release.tools[tool] === undefined) return null;
  const options = { locale: lang };
  const heading = msg.operator.toolInformation({}, options);
  const label = verb ? heading + ": " + alias : heading;

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
        {!verb && (
          <label className="tool-info-picker">
            {msg.operator.toolCommand({}, options)}
            <select
              value={alias}
              onChange={(event) => {
                setChoice(event.currentTarget.value);
                requestAnimationFrame(position);
              }}
            >
              {available.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        <code>{tool}</code>
        <samp>{syntax(alias)}</samp>
        <p lang="en">{release.tools[tool]}</p>
      </div>
    </>
  );
}
