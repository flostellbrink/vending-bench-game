import type { Release } from "games-common/benchmark";

import { hasAny, hasValue, type Optional } from "games-common/language";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { RunSlot } from "@/game/runs.ts";

import { msg } from "@/dictionary/index.ts";
import { referenceSlot } from "@/game/runs.ts";
import { useCurrency } from "@/localization/formatters.ts";
import { clock } from "@/scene/clock.ts";

interface Props {
  release: Release;
  slots: RunSlot[];
  closings: number[];
  reference?: string;
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
  source: string;
  parent?: { slot: string; day: number };
  nodes: Node[];
}
const column = 106;
const rowHeight = 60;
const cardWidth = 90;
/** Space kept between a focused card and the edge of the scroll box. */
const scrollMargin = 6;
/** The sticky row of day labels covers the top of the scroll box. */
const headHeight = 36;
const x = (day: number) => day * column - column / 2;
const y = (row: number) => row * rowHeight + rowHeight / 2;
const id = (node: Node) => `${node.source}:${node.day}`;
const fresh: Node = { cash: null, day: 1, source: "new" };

function playerLanes(slots: RunSlot[], finishedColumn: number): Lane[] {
  const children = new Map<string, RunSlot[]>();
  for (const s of slots) {
    if (s.damaged) {
      continue;
    }
    const parent = s.parent?.slot ?? fresh.source;
    const siblings = children.get(parent) ?? [];
    siblings.push(s);
    children.set(parent, siblings);
  }
  const lanes: Lane[] = [];
  const seen = new Set<string>();
  const pending = [
    ...(children.get(referenceSlot) ?? []),
    ...(children.get(fresh.source) ?? []),
    ...slots,
  ].toReversed();
  for (let s = pending.pop(); s; s = pending.pop()) {
    if (seen.has(s.id) || s.damaged) {
      continue;
    }
    seen.add(s.id);
    const parent = s.parent ?? { day: 1, slot: fresh.source };
    const nodes: Node[] = s.checkpoints
      .filter((p) => p.day > parent.day)
      .map((p) => ({ cash: p.cash, day: p.day, source: s.id }));
    if (s.finished) {
      nodes.push({ cash: s.cash, day: finishedColumn, result: true, source: s.id });
    }
    if (nodes.length) {
      lanes.push({ nodes, parent, source: s.id });
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
  if (node.source === referenceSlot && node.result) {
    return (
      <span className="save-card reference" style={style} title={title}>
        {content}
      </span>
    );
  }
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
  if (selected === fresh) {
    return (
      <button type="submit" form={newForm}>
        {msg.session.start()}
      </button>
    );
  }
  if (selected.result) {
    return (
      <a href={`run/?${new URLSearchParams({ bench: revision, slot: selected.source })}`}>
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
  closings,
  reference,
  activeSlot,
  initialDay,
  disabled,
  newForm,
  branch,
}: Props) {
  const [choice, setChoice] = useState<string>();
  const box = useRef<HTMLDivElement>(null);
  const referenceNodes: Node[] = closings
    .slice(0, release.days - 1)
    .map((cash, i) => ({ cash, day: i + 2, source: referenceSlot }));
  const last = closings[release.days - 1];
  if (hasValue(last)) {
    referenceNodes.push({ cash: last, day: release.days + 1, result: true, source: referenceSlot });
  }
  const lanes: Lane[] = [
    { nodes: [fresh, ...referenceNodes], source: referenceSlot },
    ...playerLanes(slots, release.days + 1),
  ];
  const rowFor = new Map(lanes.map((lane, i) => [lane.source, i]));
  rowFor.set(fresh.source, 0);
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
    original = ancestor.parent.slot;
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
    if (item.bottom > bounds.bottom) {
      scroller.scrollTop += item.bottom - bounds.bottom + scrollMargin;
    }
    if (item.top < bounds.top + headHeight) {
      scroller.scrollTop += item.top - bounds.top - headHeight;
    }
  }, [box, picked]);
  const days = Math.max(1, ...all.map((n) => n.day));
  const width = days * column;
  const height = lanes.length * rowHeight;
  const money = useCurrency(release.currency);
  const amount = (node: Node) => (hasValue(node.cash) ? money.format(node.cash) : "—");
  const title = (node: Node) =>
    node === fresh
      ? msg.session.newSlot()
      : [
          node.source === referenceSlot ? reference : undefined,
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
