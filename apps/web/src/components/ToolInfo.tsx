import type { Actions, Release } from "games-common/benchmark";

import { hasValue } from "games-common/language";
import { useId, useRef } from "react";

import { msg } from "@/dictionary/index.ts";
import { syntax } from "@/game/commands.ts";
import { toolDefaults } from "@/game/tool-defaults.ts";

import "./tool-info.css";

interface Props {
  release: Release;

  verb: string;
  actions: Actions;
  prediction?: string;
}

export function ToolInfo({ release, verb: tool, actions, prediction }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  if (!hasValue(release.tools[tool])) {
    return null;
  }
  const heading = msg.operator.toolInformation();
  const label = `${heading}: ${tool}`;
  const defaults = toolDefaults(release, tool);

  function position() {
    const card = panel.current;
    const button = trigger.current;
    if (!card || !button || !card.matches(":popover-open")) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const gap = 6;
    card.style.left = `${Math.max(gap, Math.min(rect.left, innerWidth - card.offsetWidth - gap))}px`;
    const below = rect.bottom + gap;
    card.style.top = `${Math.max(
      gap,
      below + card.offsetHeight <= innerHeight
        ? below
        : Math.min(innerHeight - card.offsetHeight - gap, rect.top - card.offsetHeight - gap),
    )}px`;
  }

  return (
    <>
      <button
        ref={trigger}
        className="workbench-button tool-info-trigger"
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        popoverTarget={id}
        onClick={(event) => event.stopPropagation()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="5" r=".9" fill="currentColor" />
          <path d="M8 7v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
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
            aria-label={msg.operator.dismissInfo()}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            ×
          </button>
        </div>
        <samp>{syntax(tool, actions)}</samp>
        {prediction && <small className="tool-prediction">{prediction}</small>}
        {defaults && (
          <small>
            {msg.operator.defaults()}: <code>{defaults}</code>
          </small>
        )}
        <p lang="en">{release.tools[tool]}</p>
      </div>
    </>
  );
}
