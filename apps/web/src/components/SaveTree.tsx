import type { Release } from "games-common/benchmark";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Locale } from "@/dictionary/runtime";
import type { RunSlot } from "@/game/runs";

import { msg } from "@/dictionary";
import { clock } from "@/scene/clock";

interface Selection {
  slot: string;
  day?: number;
}
interface Props {
  release: Release;
  slots: RunSlot[];
  lang: Locale;
  activeSlot?: string;
  initialDay?: number;
  disabled: boolean;
  newForm: string;
  branch: (slot: string, day: number) => void;
}
const column = 112,
  cardWidth = 94,
  labelWidth = 100,
  rowHeight = 91,
  morningY = 24,
  tipY = 66;
const center = (day: number) => labelWidth + (day - 0.5) * column;
const tipDay = (s: RunSlot, days: number) => Math.min(s.day, days);
const visibleMornings = (s: RunSlot) =>
  s.checkpoints.filter((c) => !s.parent || c.day > s.parent.day);
const tipPosition = (s: RunSlot, day: number) =>
  visibleMornings(s).some((c) => c.day === day) ? tipY : morningY;

function orderSlots(slots: RunSlot[]) {
  const children = new Map<string, RunSlot[]>();
  for (const s of slots) {
    if (s.parent) {
      const list = children.get(s.parent.slot) ?? [];
      list.push(s);
      children.set(s.parent.slot, list);
    }
  }
  const visited = new Set<string>(),
    rows: RunSlot[] = [];
  const pending = [...slots.filter((s) => !s.parent), ...slots].toReversed();
  for (let s = pending.pop(); s; s = pending.pop()) {
    if (visited.has(s.id)) continue;
    visited.add(s.id);
    rows.push(s);
    for (const child of children.get(s.id)?.toReversed() ?? []) pending.push(child);
  }
  return rows;
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.dataset.row === undefined) return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>("[data-row]:not(:disabled)"),
  );
  const row = Number(target.dataset.row),
    at = Number(target.dataset.day);
  const peers = controls.filter((n) => Number(n.dataset.row) === row),
    i = peers.indexOf(target);
  let next: HTMLElement | undefined;
  if (event.key === "ArrowLeft") next = peers[i - 1];
  else if (event.key === "ArrowRight") next = peers[i + 1];
  else if (event.key === "Home") next = peers[0];
  else if (event.key === "End") next = peers.at(-1);
  else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const adjacent = row + (event.key === "ArrowDown" ? 1 : -1);
    next = controls
      .filter((n) => Number(n.dataset.row) === adjacent)
      .toSorted(
        (a, b) => Math.abs(Number(a.dataset.day) - at) - Math.abs(Number(b.dataset.day) - at),
      )[0];
  } else return;
  event.preventDefault();
  next?.focus();
}
function inheritedMorning(slot: RunSlot, day: number | undefined, byId: Map<string, RunSlot>) {
  if (day === undefined) return slot;
  let selected = slot;
  const seen = new Set<string>();
  while (selected.parent && day <= selected.parent.day && !seen.has(selected.id)) {
    seen.add(selected.id);
    const parent = byId.get(selected.parent.slot);
    if (!parent) break;
    selected = parent;
  }
  return selected;
}

export default function SaveTree({
  release,
  slots,
  lang,
  activeSlot,
  initialDay,
  disabled,
  newForm,
  branch,
}: Props) {
  const [choice, setChoice] = useState<Selection>();
  const scroller = useRef<HTMLDivElement>(null);
  const rows = orderSlots(slots);
  const byId = new Map(slots.map((s) => [s.id, s]));
  const rowIndex = new Map(rows.map((s, i) => [s.id, i]));
  const runNumber = new Map(slots.map((s, i) => [s.id, i + 1]));
  const newest = slots
    .filter((s) => !s.damaged)
    .toSorted((a, b) => (a.updatedAt ?? a.createdAt ?? 0) - (b.updatedAt ?? b.createdAt ?? 0))
    .at(-1);
  const candidate = byId.get(choice?.slot ?? activeSlot ?? "") ?? newest ?? slots[0];
  const selectedDay = choice ? choice.day : initialDay;
  const selected = candidate ? inheritedMorning(candidate, selectedDay, byId) : undefined;
  const selectedPoint = selected?.checkpoints.find((p) => p.day === selectedDay);
  const col = selectedPoint?.day ?? (selected ? tipDay(selected, release.days) : 1);
  const row = selected ? (rowIndex.get(selected.id) ?? 0) : 0;
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const x = center(col);
    if (x - cardWidth / 2 - labelWidth < box.scrollLeft)
      box.scrollLeft = x - cardWidth / 2 - labelWidth;
    else if (x + cardWidth / 2 + 8 > box.scrollLeft + box.clientWidth)
      box.scrollLeft = x + cardWidth / 2 + 8 - box.clientWidth;
    const y = row * rowHeight;
    if (y < box.scrollTop) box.scrollTop = y;
    if (y + rowHeight + 40 > box.scrollTop + box.clientHeight)
      box.scrollTop = y + rowHeight + 40 - box.clientHeight;
  }, [col, row]);
  if (!selected) return null;
  const options = { locale: lang };
  const currency = new Intl.NumberFormat(lang, { style: "currency", currency: release.currency });
  const name = (s: RunSlot) => msg.session.runNumber({ index: runNumber.get(s.id) ?? 1 }, options);
  const dayLabel = (day: number) => msg.session.dayNumber({ day }, options);
  const width = labelWidth + Math.max(...slots.map((s) => tipDay(s, release.days))) * column;
  const chartHeight = rows.length * rowHeight;
  const parent = selected.parent && byId.get(selected.parent.slot);
  const comparison = selectedPoint && parent?.checkpoints.find((p) => p.day === selectedPoint.day);
  const change =
    selectedPoint && comparison
      ? (Math.round(selectedPoint.cash * 100) - Math.round(comparison.cash * 100)) / 100
      : undefined;
  return (
    <section className="save-library" aria-label={msg.session.library({}, options)}>
      <div ref={scroller} className="save-scroll" onKeyDown={moveFocus}>
        <div className="save-map" style={{ minWidth: width }}>
          <div className="save-map-head">
            <button type="submit" form={newForm} className="save-new">
              {msg.session.newSlot({}, options)}
            </button>
            {Array.from({ length: (width - labelWidth) / column }, (_, i) => (
              <span key={i} style={{ left: center(i + 1) }}>
                {dayLabel(i + 1)}
              </span>
            ))}
          </div>
          <div className="save-map-lanes" style={{ height: chartHeight }}>
            <svg
              viewBox={`0 0 ${width} ${chartHeight}`}
              width={width}
              height={chartHeight}
              aria-hidden="true"
            >
              {rows.map((s, i) => {
                const first = s.parent?.day ?? 1,
                  day = tipDay(s, release.days),
                  y = i * rowHeight + morningY,
                  x = center(day);
                const p = s.parent ? rowIndex.get(s.parent.slot) : undefined;
                return (
                  <g key={s.id} className={s.id === selected.id ? "current" : undefined}>
                    {p !== undefined && (
                      <path d={`M${center(first)} ${p * rowHeight + morningY} V${y}`} />
                    )}
                    <path
                      d={`M${center(first)} ${y} H${x} V${i * rowHeight + tipPosition(s, day)}`}
                    />
                  </g>
                );
              })}
            </svg>
            {rows.map((s, i) => {
              const isHead = s.id === selected.id && !selectedPoint;
              const tip = tipDay(s, release.days);
              const tipLabel = s.finished
                ? msg.session.reopen({}, options)
                : msg.session.resume({}, options);
              const newestTip = s.id === newest?.id;
              return (
                <div className="save-map-row" key={s.id} style={{ height: rowHeight }}>
                  <div className="save-lane-name">{name(s)}</div>
                  {visibleMornings(s).map((c) => {
                    const active = s.id === selected.id && c.day === selectedPoint?.day;
                    return (
                      <button
                        type="button"
                        key={c.day}
                        disabled={disabled}
                        data-row={i}
                        data-day={c.day}
                        tabIndex={active ? 0 : -1}
                        aria-current={active ? "true" : undefined}
                        className="save-card morning"
                        style={{ left: center(c.day), top: morningY, width: cardWidth }}
                        title={msg.session.fork({ day: c.day }, options)}
                        aria-label={
                          name(s) +
                          " · " +
                          msg.session.fork({ day: c.day }, options) +
                          " · " +
                          currency.format(c.cash)
                        }
                        onFocus={() => setChoice({ slot: s.id, day: c.day })}
                        onClick={() => branch(s.id, c.day)}
                      >
                        <small>{clock(release.network.opens)}</small>
                        <b>{currency.format(c.cash)}</b>
                      </button>
                    );
                  })}
                  {s.damaged ? (
                    <span
                      className="save-card damaged"
                      style={{ left: center(tip), top: tipPosition(s, tip), width: cardWidth }}
                    >
                      {msg.session.damaged({}, options)}
                    </span>
                  ) : (
                    <a
                      href={
                        "/" +
                        lang +
                        "/run/?" +
                        new URLSearchParams({ bench: release.revision, slot: s.id })
                      }
                      data-row={i}
                      data-day={tip + 0.5}
                      tabIndex={isHead ? 0 : -1}
                      aria-current={isHead ? "true" : undefined}
                      className={"save-card tip" + (newestTip ? " newest" : "")}
                      style={{ left: center(tip), top: tipPosition(s, tip), width: cardWidth }}
                      title={tipLabel}
                      aria-label={
                        name(s) +
                        " · " +
                        tipLabel +
                        (s.cash === null ? "" : " · " + currency.format(s.cash))
                      }
                      onFocus={() => setChoice({ slot: s.id })}
                    >
                      <small>
                        <span aria-hidden="true">{s.finished ? "■ " : "▶ "}</span>
                        {s.finished
                          ? msg.session.finished({}, options)
                          : s.minute === undefined
                            ? msg.session.latest({}, options)
                            : clock(s.minute)}
                      </small>
                      <b>{s.cash === null ? "—" : currency.format(s.cash)}</b>
                      {newestTip && <em>{msg.session.newest({}, options)}</em>}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="save-focus-note" aria-live="polite">
        <b>{name(selected)}</b>
        {parent && selected.parent && (
          <span>
            {msg.session.from(
              { run: runNumber.get(parent.id) ?? 1, day: selected.parent.day },
              options,
            )}
          </span>
        )}
        {change !== undefined && parent && (
          <span>
            {msg.session.parentDifference(
              {
                run: runNumber.get(parent.id) ?? 1,
                difference: (change > 0 ? "+" : "") + currency.format(change),
              },
              options,
            )}
          </span>
        )}
        {!selected.damaged && selected.cash === null && selected.moves > 0 && (
          <span>{msg.session.recoverDays({}, options)}</span>
        )}
      </div>
    </section>
  );
}
