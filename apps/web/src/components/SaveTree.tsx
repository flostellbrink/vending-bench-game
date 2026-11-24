import type { Release } from "games-common/benchmark";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { RunSlot } from "@/game/runs";

import { msg } from "@/dictionary";
import { scriptedSlot } from "@/game/runs";
import { useCurrency } from "@/localization/formatters";
import { clock } from "@/scene/clock";

interface Props {
  release: Release;
  slots: RunSlot[];
  closings: number[];

  activeSlot?: string;
  initialDay?: number;
  disabled: boolean;
  newForm: string;
  branch: (slot: string, day: number) => void;
}
interface Node {
  source: string;
  day: number;
  cash: number | null;
  result?: boolean;
}
interface Lane {
  source: string;
  parent?: { slot: string; day: number };
  nodes: Node[];
}
const column = 106,
  rowHeight = 60;
const x = (day: number) => (day - 0.5) * column;
const y = (row: number) => (row + 0.5) * rowHeight;
const id = (node: Node) => node.source + ":" + node.day;
const fresh: Node = { source: "new", day: 1, cash: null };

function playerLanes(slots: RunSlot[], finishedColumn: number): Lane[] {
  const children = new Map<string, RunSlot[]>();
  for (const s of slots) {
    if (s.damaged) continue;
    const parent = s.parent?.slot ?? fresh.source;
    const siblings = children.get(parent) ?? [];
    siblings.push(s);
    children.set(parent, siblings);
  }
  const lanes: Lane[] = [];
  const seen = new Set<string>();
  const pending = [
    ...(children.get(scriptedSlot) ?? []),
    ...(children.get(fresh.source) ?? []),
    ...slots,
  ].toReversed();
  for (let s = pending.pop(); s; s = pending.pop()) {
    if (seen.has(s.id) || s.damaged) continue;
    seen.add(s.id);
    const parent = s.parent ?? { slot: fresh.source, day: 1 };
    const nodes: Node[] = s.checkpoints
      .filter((p) => p.day > parent.day)
      .map((p) => ({ source: s.id, day: p.day, cash: p.cash }));
    if (s.finished) nodes.push({ source: s.id, day: finishedColumn, cash: s.cash, result: true });
    if (nodes.length) lanes.push({ source: s.id, parent, nodes });
    for (const child of (children.get(s.id) ?? []).toReversed()) pending.push(child);
  }
  return lanes;
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement) || !button.dataset.day) return;
  const nodes = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-day]"),
  );
  const row = Number(button.dataset.row),
    day = Number(button.dataset.day);
  const peers = nodes.filter((n) => Number(n.dataset.row) === row);
  const at = peers.indexOf(button);
  let next: HTMLButtonElement | undefined;
  switch (event.key) {
    case "ArrowLeft":
      next = peers[at - 1];
      break;
    case "ArrowRight":
      next = peers[at + 1];
      break;
    case "Home":
      next = peers[0];
      break;
    case "End":
      next = peers.at(-1);
      break;
    case "ArrowDown":
    case "ArrowUp": {
      const dest = row + (event.key === "ArrowDown" ? 1 : -1);
      next = nodes
        .filter((n) => Number(n.dataset.row) === dest)
        .toSorted(
          (a, b) => Math.abs(Number(a.dataset.day) - day) - Math.abs(Number(b.dataset.day) - day),
        )[0];
      break;
    }
    default:
      return;
  }
  event.preventDefault();
  next?.focus();
}

export default function SaveTree({
  release,
  slots,
  closings,
  activeSlot,
  initialDay,
  disabled,
  newForm,
  branch,
}: Props) {
  const [choice, setChoice] = useState<string>();
  const box = useRef<HTMLDivElement>(null);
  const script: Node[] = closings
    .slice(0, release.days - 1)
    .map((cash, i) => ({ source: scriptedSlot, day: i + 2, cash }));
  const last = closings[release.days - 1];
  if (last !== undefined)
    script.push({ source: scriptedSlot, day: release.days + 1, cash: last, result: true });
  const lanes: Lane[] = [
    { source: scriptedSlot, nodes: [fresh, ...script] },
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
    if (!scroller || !node) return;
    const bounds = scroller.getBoundingClientRect(),
      item = node.getBoundingClientRect();
    if (item.right > bounds.right) scroller.scrollLeft += item.right - bounds.right + 6;
    if (item.left < bounds.left) scroller.scrollLeft += item.left - bounds.left - 6;
    if (item.bottom > bounds.bottom) scroller.scrollTop += item.bottom - bounds.bottom + 6;
    if (item.top < bounds.top + 36) scroller.scrollTop += item.top - bounds.top - 36;
  }, [box, picked]);
  const days = Math.max(1, ...all.map((n) => n.day));
  const width = days * column,
    height = lanes.length * rowHeight;
  const money = useCurrency(release.currency);
  const title = (node: Node) =>
    node === fresh
      ? msg.session.newSlot()
      : [
          node.source === scriptedSlot && msg.session.scriptReference(),
          node.result ? msg.session.finished() : msg.session.dayNumber({ day: node.day }),
          node.cash !== null && money.format(node.cash),
        ]
          .filter(Boolean)
          .join(" · ");
  return (
    <section className="save-library" aria-label={msg.session.library()}>
      <div className="save-scroll" ref={box} onKeyDown={moveFocus}>
        <div className="save-map" style={{ width, minWidth: "100%" }}>
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
                const first = lane.nodes[0],
                  tail = lane.nodes.at(-1);
                if (!first || !tail) return null;
                const origin = lane.parent && rowFor.get(lane.parent.slot);
                const path =
                  lane.parent && origin !== undefined
                    ? `M${x(lane.parent.day)} ${y(origin)} V${y(row)} H${x(tail.day)}`
                    : `M${x(first.day)} ${y(row)} H${x(tail.day)}`;
                return <path key={lane.source} d={path} />;
              })}
            </svg>
            {lanes.map((lane, row) => (
              <div className="save-map-row" key={lane.source} style={{ height: rowHeight }}>
                {lane.nodes.map((n) => {
                  const style = { left: x(n.day), top: rowHeight / 2, width: 90 };
                  const content =
                    n === fresh ? (
                      <b>{msg.session.newSlot()}</b>
                    ) : (
                      <>
                        <small>
                          {n.result ? msg.session.closeLabel() : clock(release.network.opens)}
                        </small>
                        <b>{n.cash === null ? "—" : money.format(n.cash)}</b>
                      </>
                    );
                  if (n.source === scriptedSlot && (n.result || !release.scriptedReplay))
                    return (
                      <span
                        className="save-card reference"
                        style={style}
                        key={id(n)}
                        title={title(n)}
                      >
                        {content}
                      </span>
                    );
                  const active = picked === id(n);
                  return (
                    <button
                      type="button"
                      className={
                        "save-card" +
                        (n === fresh ? " fresh" : "") +
                        (n.source === scriptedSlot ? " scripted" : "")
                      }
                      key={id(n)}
                      data-day={n.day}
                      data-checkpoint={id(n)}
                      data-row={row}
                      style={style}
                      aria-label={title(n)}
                      title={title(n)}
                      aria-pressed={active}
                      tabIndex={active ? 0 : -1}
                      onFocus={() => setChoice(id(n))}
                      onClick={() => setChoice(id(n))}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="save-decision">
        {selected === fresh ? (
          <button type="submit" form={newForm}>
            {msg.session.start()}
          </button>
        ) : selected.result ? (
          <a
            href={"run/?" + new URLSearchParams({ bench: release.revision, slot: selected.source })}
          >
            {msg.session.reopen()}
          </a>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => branch(selected.source, selected.day)}
          >
            {msg.session.resume()}
          </button>
        )}
        <small aria-live="polite">
          {selected === fresh ? msg.session.dayNumber({ day: 1 }) : title(selected)}
        </small>
      </div>
    </section>
  );
}
