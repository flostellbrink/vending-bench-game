import type { Release, Rival } from "games-common/benchmark";

import { hasAny, hasValue, type Optional } from "games-common/language";
import { useLocale } from "games-localize/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { RunSlot } from "@/game/runs.ts";

import { msg } from "@/dictionary/index.ts";
import { isReferenceResult, isReferenceSlot, referenceFor, referenceSlotOf } from "@/game/runs.ts";
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
interface Node {
  source: string;
  day: number;
  cash: Optional<number>;
  result?: boolean;
}
interface Lane {
  label: string;
  source: string;
  parent?: { slot: string; day: number };
  nodes: Node[];
}
const column = 106;
const rowHeight = 60;
const cardWidth = 90;
/** The sticky column of row names covers the left of the scroll box. */
const labelWidth = 170;
/** Space kept between a focused card and the edge of the scroll box. */
const scrollMargin = 6;
/** The sticky row of day labels covers the top of the scroll box. */
const headHeight = 36;
const x = (day: number) => labelWidth + day * column - column / 2;
const y = (row: number) => row * rowHeight + rowHeight / 2;
const id = (node: Node) => `${node.source}:${node.day}`;
const fresh: Node = { cash: null, day: 1, source: "new" };

/** The row source of a parent slot; old saves name the top model run with a shared marker. */
function sourceOf(release: Release, slot: string) {
  const reference = isReferenceSlot(slot) ? referenceFor(release, slot) : undefined;
  return reference ? referenceSlotOf(reference) : slot;
}

function referenceLane(release: Release, reference: Rival): Lane {
  const source = referenceSlotOf(reference);
  const closings = reference.values?.slice(1, release.days + 1) ?? [];
  const nodes: Node[] = closings
    .slice(0, release.days - 1)
    .map((cash, i) => ({ cash, day: i + 2, source }));
  const last = closings[release.days - 1];
  if (hasValue(last)) {
    nodes.push({ cash: last, day: release.days + 1, result: true, source });
  }
  return { label: reference.name, nodes, source };
}

function playerLanes(release: Release, slots: RunSlot[], references: Rival[]): Lane[] {
  const finishedColumn = release.days + 1;
  // A finished model run is the result box of its own row.
  const shown = slots.filter((s) => !s.damaged && !isReferenceResult(s.parent, release));
  const parentOf = (s: RunSlot) =>
    s.parent
      ? { day: s.parent.day, slot: sourceOf(release, s.parent.slot) }
      : { day: 1, slot: fresh.source };
  const children = new Map<string, RunSlot[]>();
  for (const s of shown) {
    const parent = parentOf(s).slot;
    children.set(parent, [...(children.get(parent) ?? []), s]);
  }
  const lanes: Lane[] = [];
  const seen = new Set<string>();
  const pending = [
    ...references.flatMap((reference) => children.get(referenceSlotOf(reference)) ?? []),
    ...(children.get(fresh.source) ?? []),
    ...shown,
  ].toReversed();
  for (let s = pending.pop(); s; s = pending.pop()) {
    if (seen.has(s.id)) {
      continue;
    }
    seen.add(s.id);
    const parent = parentOf(s);
    const nodes: Node[] = s.checkpoints
      .filter((p) => p.day > parent.day)
      .map((p) => ({ cash: p.cash, day: p.day, source: s.id }));
    if (s.finished) {
      nodes.push({ cash: s.cash, day: finishedColumn, result: true, source: s.id });
    }
    if (nodes.length) {
      lanes.push({ label: msg.fields.player(), nodes, parent, source: s.id });
    }
    for (const child of (children.get(s.id) ?? []).toReversed()) {
      pending.push(child);
    }
  }
  return lanes;
}

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
  const lanes: Lane[] = [
    { label: msg.session.newSlot(), nodes: [fresh], source: fresh.source },
    ...references.map((reference) => referenceLane(release, reference)),
    ...playerLanes(release, slots, references),
  ];
  const rowFor = new Map(lanes.map((lane, i) => [lane.source, i]));
  const labelFor = new Map(lanes.map((lane) => [lane.source, lane.label]));
  const all = lanes.flatMap((l) => l.nodes);
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
    if (item.left < bounds.left + labelWidth) {
      scroller.scrollLeft += item.left - bounds.left - labelWidth - scrollMargin;
    }
    if (item.bottom > bounds.bottom) {
      scroller.scrollTop += item.bottom - bounds.bottom + scrollMargin;
    }
    if (item.top < bounds.top + headHeight) {
      scroller.scrollTop += item.top - bounds.top - headHeight;
    }
  }, [box, picked]);
  const days = Math.max(1, ...all.map((n) => n.day));
  const width = labelWidth + days * column;
  const height = lanes.length * rowHeight;
  const money = useCurrency(release.currency);
  const amount = (node: Node) => (hasValue(node.cash) ? money.format(node.cash) : "—");
  const title = (node: Node) =>
    node === fresh
      ? msg.session.newSlot()
      : [
          isReferenceSlot(node.source) ? labelFor.get(node.source) : undefined,
          node.result ? msg.session.finished() : msg.session.dayNumber({ day: node.day }),
          hasValue(node.cash) ? money.format(node.cash) : undefined,
        ]
          .filter(hasAny)
          .join(" · ");
  return (
    <section className="save-library" aria-label={msg.session.library()}>
      <div className="save-scroll" ref={box} onKeyDown={moveFocus}>
        <div className="save-map" style={{ minWidth: "100%", width }}>
          <div className="save-map-head">
            {Array.from({ length: days }, (_, i) => (
              <span key={i} style={{ left: x(i + 1) }}>
                {i < release.days ? msg.session.dayNumber({ day: i + 1 }) : msg.session.finished()}
              </span>
            ))}
          </div>
          <div className="save-map-lanes" style={{ height }}>
            <svg width={width} height={height} aria-hidden="true">
              {lanes.map((lane, row) => {
                const [first] = lane.nodes;
                const tail = lane.nodes.at(-1);
                if (!first || !tail) {
                  return null;
                }
                const origin = lane.parent && rowFor.get(lane.parent.slot);
                const path =
                  lane.parent && hasValue(origin)
                    ? `M${x(lane.parent.day)} ${y(origin)} V${y(row)} H${x(tail.day)}`
                    : `M${x(first.day)} ${y(row)} H${x(tail.day)}`;
                return <path key={lane.source} d={path} />;
              })}
            </svg>
            {lanes.map((lane, row) => (
              <div className="save-map-row" key={lane.source} style={{ height: rowHeight }}>
                <span
                  className="save-lane-name"
                  style={{ lineHeight: `${rowHeight}px`, width: labelWidth }}
                  title={lane.label}
                >
                  {lane.label}
                </span>
                {lane.nodes.map((n) => (
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
