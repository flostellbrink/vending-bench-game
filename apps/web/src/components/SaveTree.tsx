import type { Release, Rival } from "games-common/benchmark";

import { hasAny, hasValue, type Optional } from "games-common/language";
import { useLocale } from "games-localize/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { RunSlot } from "@/game/runs.ts";

import { msg } from "@/dictionary/index.ts";
import { isReferenceSlot, referenceSlotOf } from "@/game/runs.ts";
import { freshNode, saveTimeline, sourceOf, type TimelineNode } from "@/game/save-timeline.ts";
import { useCurrency } from "@/localization/formatters.ts";
import { clock } from "@/scene/clock.ts";

interface Props {
  release: Release;
  slots: RunSlot[];
  /** Model runs to branch from, one row each, with their daily balances. */
  references: Rival[];
  activeSlot?: string;
  initialDay?: number;
  disabled: boolean;
  newForm: string;
  branch: (slot: string, day: number) => void;
}
type Node = TimelineNode;
const column = 106;
const rowHeight = 60;
const cardWidth = 90;
/** Space kept between a focused card and the edge of the scroll box. */
const scrollMargin = 6;
const headHeight = 36;
const x = (day: number) => day * column - column / 2;
const y = (row: number) => row * rowHeight + rowHeight / 2;
const id = (node: Node) => `${node.source}:${node.day}`;
const fresh = freshNode;

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement) || !button.dataset.day) {
    return;
  }
  const nodes = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-day]"),
  );
  const row = Number(button.dataset.row);
  const day = Number(button.dataset.day);
  const peers = nodes.filter((n) => Number(n.dataset.row) === row);
  const at = peers.indexOf(button);
  let next: Optional<HTMLButtonElement> = undefined;
  switch (event.key) {
    case "ArrowLeft": {
      next = peers[at - 1];
      break;
    }
    case "ArrowRight": {
      next = peers[at + 1];
      break;
    }
    case "Home": {
      [next] = peers;
      break;
    }
    case "End": {
      next = peers.at(-1);
      break;
    }
    case "ArrowDown":
    case "ArrowUp": {
      const dest = row + (event.key === "ArrowDown" ? 1 : -1);
      [next] = nodes
        .filter((n) => Number(n.dataset.row) === dest)
        .toSorted(
          (a, b) => Math.abs(Number(a.dataset.day) - day) - Math.abs(Number(b.dataset.day) - day),
        );
      break;
    }
    default: {
      return;
    }
  }
  event.preventDefault();
  next?.focus();
}

function SaveCard({
  node,
  row,
  time,
  amount,
  title,
  active,
  choose,
}: {
  node: Node;
  row: number;
  time: string;
  amount: string;
  title: string;
  active: boolean;
  choose: () => void;
}) {
  const style = { left: x(node.day), top: rowHeight / 2, width: cardWidth };
  const content =
    node === fresh ? (
      <b>{msg.session.newSlot()}</b>
    ) : (
      <>
        <small>{node.result ? msg.session.closeLabel() : time}</small>
        <b>{amount}</b>
      </>
    );
  return (
    <button
      type="button"
      className={`save-card${node === fresh ? " fresh" : ""}`}
      data-day={node.day}
      data-checkpoint={id(node)}
      data-row={row}
      style={style}
      aria-label={title}
      title={title}
      aria-pressed={active}
      tabIndex={active ? 0 : -1}
      onFocus={choose}
      onClick={choose}
    >
      {content}
    </button>
  );
}

function SaveAction({
  selected,
  newForm,
  revision,
  disabled,
  branch,
}: {
  selected: Node;
  newForm: string;
  revision: string;
  disabled: boolean;
  branch: (slot: string, day: number) => void;
}) {
  const locale = useLocale();
  if (selected === fresh) {
    return (
      <button type="submit" form={newForm}>
        {msg.session.start()}
      </button>
    );
  }
  if (selected.result && isReferenceSlot(selected.source)) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => branch(selected.source, selected.day)}
      >
        {msg.session.reopen()}
      </button>
    );
  }
  if (selected.result) {
    return (
      <a href={`/${locale}/run?${new URLSearchParams({ bench: revision, slot: selected.source })}`}>
        {msg.session.reopen()}
      </a>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={() => branch(selected.source, selected.day)}>
      {msg.session.resume()}
    </button>
  );
}

export default function SaveTree({
  release,
  slots,
  references,
  activeSlot,
  initialDay,
  disabled,
  newForm,
  branch,
}: Props) {
  const [choice, setChoice] = useState<string>();
  const box = useRef<HTMLDivElement>(null);
  const { rows, runs } = saveTimeline(release, { references, slots });
  const modelName = new Map(references.map((model) => [referenceSlotOf(model), model.name]));
  const all = runs.flatMap((run) => run.nodes);
  const local = slots.find((s) => s.id === activeSlot);
  const requested = initialDay ?? (local?.finished ? release.days + 1 : local?.day);
  let original = activeSlot;
  let ancestor = local;
  const seen = new Set<string>();
  while (
    ancestor?.parent &&
    (requested ?? Infinity) <= ancestor.parent.day &&
    !seen.has(ancestor.id)
  ) {
    seen.add(ancestor.id);
    original = sourceOf(release, ancestor.parent.slot);
    ancestor = slots.find((s) => s.id === original);
  }
  const selected =
    all.find((n) => id(n) === choice) ??
    all.find((n) => n.source === original && n.day === requested) ??
    fresh;
  const picked = id(selected);
  useEffect(() => {
    const scroller = box.current;
    const node = scroller?.querySelector<HTMLButtonElement>(
      `[data-checkpoint="${CSS.escape(picked)}"]`,
    );
    if (!scroller || !node) {
      return;
    }
    const bounds = scroller.getBoundingClientRect();
    const item = node.getBoundingClientRect();
    if (item.right > bounds.right) {
      scroller.scrollLeft += item.right - bounds.right + scrollMargin;
    }
    if (item.left < bounds.left) {
      scroller.scrollLeft += item.left - bounds.left - scrollMargin;
    }
  }, [box, picked]);
  const days = Math.max(1, ...all.map((n) => n.day));
  const width = days * column;
  const height = rows.length * rowHeight;
  const money = useCurrency(release.currency);
  const amount = (node: Node) => (hasValue(node.cash) ? money.format(node.cash) : "—");
  const title = (node: Node) =>
    node === fresh
      ? msg.session.newSlot()
      : [
          modelName.get(node.source),
          node.result ? msg.session.finished() : msg.session.dayNumber({ day: node.day }),
          hasValue(node.cash) ? money.format(node.cash) : undefined,
        ]
          .filter(hasAny)
          .join(" · ");
  return (
    <section className="save-library" aria-label={msg.session.library()}>
      <div className="save-names" aria-hidden="true">
        <div className="save-names-head" style={{ height: headHeight }} />
        {rows.map(({ key, label }) => (
          <div key={key} title={label} style={{ height: rowHeight, lineHeight: `${rowHeight}px` }}>
            {label}
          </div>
        ))}
      </div>
      <div className="save-scroll" ref={box} onKeyDown={moveFocus}>
        <div className="save-map" style={{ minWidth: "100%", width }}>
          <div className="save-map-head" style={{ height: headHeight }}>
            {Array.from({ length: days }, (_, i) => (
              <span key={i} className="save-map-day" style={{ left: x(i + 1) }}>
                {i < release.days ? msg.session.dayNumber({ day: i + 1 }) : msg.session.finished()}
              </span>
            ))}
          </div>
          <div className="save-map-lanes" style={{ height }}>
            <svg width={width} height={height} aria-hidden="true">
              {runs.map(({ source, row, parent, nodes }) => {
                const [first] = nodes;
                const tail = nodes.at(-1);
                if (!first || !tail) {
                  return null;
                }
                const path = parent
                  ? `M${x(parent.day)} ${y(parent.row)} V${y(row)} H${x(tail.day)}`
                  : `M${x(first.day)} ${y(row)} H${x(tail.day)}`;
                return <path key={source} d={path} />;
              })}
            </svg>
            {rows.map(({ key }, row) => (
              <div className="save-map-row" key={key} style={{ height: rowHeight }}>
                {runs
                  .filter((run) => run.row === row)
                  .flatMap((run) => run.nodes)
                  .map((n) => (
                    <SaveCard
                      key={id(n)}
                      node={n}
                      row={row}
                      time={clock(release.network.opens)}
                      amount={amount(n)}
                      title={title(n)}
                      active={picked === id(n)}
                      choose={() => setChoice(id(n))}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="save-decision">
        <SaveAction
          selected={selected}
          newForm={newForm}
          revision={release.revision}
          disabled={disabled}
          branch={branch}
        />
        <small aria-live="polite">
          {selected === fresh ? msg.session.dayNumber({ day: 1 }) : title(selected)}
        </small>
      </div>
    </section>
  );
}
