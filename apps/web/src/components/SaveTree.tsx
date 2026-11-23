import type { Release } from "games-common/benchmark";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Locale } from "@/dictionary/runtime";
import type { RunSlot } from "@/game/runs";

import { msg } from "@/dictionary";

interface Selection {
  slot: string;
  day?: number;
}
interface Props {
  release: Release;
  slots: RunSlot[];
  lang: Locale;
  activeSlot?: string;
  compact: boolean;
  disabled: boolean;
  branch: (slot: string, day: number) => void;
}

const step = 34;
const lane = 36;
const margin = 14;
const point = (day: number) => margin + (day - 1) * step;
const height = (index: number) => margin + index * lane;
const end = (slot: RunSlot) => Math.max(slot.parent?.day ?? 1, slot.day) + 0.75;

function orderSlots(slots: RunSlot[]) {
  const children = new Map<string, RunSlot[]>();
  for (const slot of slots) {
    if (!slot.parent) continue;
    const siblings = children.get(slot.parent.slot);
    if (siblings) siblings.push(slot);
    else children.set(slot.parent.slot, [slot]);
  }
  const rows: RunSlot[] = [];
  const visited = new Set<string>();
  const pending = [...slots.filter((slot) => !slot.parent), ...slots].toReversed();
  for (let slot = pending.pop(); slot; slot = pending.pop()) {
    if (visited.has(slot.id)) continue;
    visited.add(slot.id);
    rows.push(slot);
    for (const child of children.get(slot.id)?.toReversed() ?? []) pending.push(child);
  }
  return rows;
}

function selectAdjacent(event: KeyboardEvent<HTMLDivElement>) {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-row]:not(:disabled)"),
  );
  const row = Number(event.target.dataset.row),
    column = Number(event.target.dataset.column);
  const offset = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
  const same = controls.filter((b) => Number(b.dataset.row) === row);
  const index = same.indexOf(event.target);
  let next: HTMLButtonElement | undefined;
  if (offset)
    next = controls
      .filter((b) => Number(b.dataset.row) === row + offset)
      .toSorted(
        (a, b) =>
          Math.abs(Number(a.dataset.column) - column) - Math.abs(Number(b.dataset.column) - column),
      )[0];
  else if (event.key === "ArrowRight") next = same[index + 1];
  else if (event.key === "ArrowLeft") next = same[index - 1];
  else if (event.key === "Home") next = same[0];
  else if (event.key === "End") next = same.at(-1);
  else return;
  event.preventDefault();
  next?.focus();
  next?.click();
}

export default function SaveTree({
  release,
  slots,
  lang,
  activeSlot,
  compact,
  disabled,
  branch,
}: Props) {
  const [selection, select] = useState<Selection>();
  const scroller = useRef<HTMLDivElement>(null);
  const rows = orderSlots(slots);
  const runNumbers = new Map(slots.map((s, i) => [s.id, i + 1]));
  const rowNumbers = new Map(rows.map((s, i) => [s.id, i]));
  const slot =
    slots.find((s) => s.id === selection?.slot) ??
    slots.find((s) => s.id === activeSlot) ??
    slots.at(-1);
  const selectedDay = slot?.id === selection?.slot ? selection?.day : undefined;
  const selectedX = slot ? point(selectedDay ?? end(slot)) : 0;
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    if (selectedX - margin < box.scrollLeft) box.scrollLeft = selectedX - margin;
    else if (selectedX + margin > box.scrollLeft + box.clientWidth)
      box.scrollLeft = selectedX + margin - box.clientWidth;
  }, [selectedX]);
  if (!slot) return null;
  const options = { locale: lang };
  const currency = new Intl.NumberFormat(lang, { style: "currency", currency: release.currency });
  const runName = (id: string) =>
    msg.session.runNumber({ index: runNumbers.get(id) ?? 1 }, options);
  const dayName = (day: number) => msg.session.dayNumber({ day }, options);
  const checkpoint =
    slot.id === selection?.slot ? slot.checkpoints.find((c) => c.day === selection.day) : undefined;
  const day = checkpoint?.day ?? slot.day;
  const balance = checkpoint?.cash ?? slot.cash;
  const destination =
    "/" + lang + "/run/?" + new URLSearchParams({ bench: release.revision, slot: slot.id });
  const width = point(Math.max(...slots.map(end))) + margin;
  const chartHeight = height(rows.length - 1) + margin;
  const parentNumber = slot.parent && runNumbers.get(slot.parent.slot);
  const parentMorning =
    checkpoint && slot.parent
      ? slots
          .find((s) => s.id === slot.parent?.slot)
          ?.checkpoints.find((c) => c.day === checkpoint.day)
      : undefined;
  const difference =
    checkpoint && parentMorning
      ? (Math.round(checkpoint.cash * 100) - Math.round(parentMorning.cash * 100)) / 100
      : undefined;
  const description =
    slot.parent && parentNumber
      ? msg.session.from({ run: parentNumber, day: slot.parent.day }, options)
      : null;
  return (
    <section className="save-library" aria-label={msg.session.library({}, options)}>
      <h3>{msg.session.library({}, options)}</h3>
      <div className="save-chart">
        <div className="save-lanes" style={{ height: chartHeight }}>
          {rows.map((s, i) => (
            <button
              key={s.id}
              type="button"
              style={{ top: height(i) }}
              className={s.id === slot.id ? "chosen" : undefined}
              onClick={() => select({ slot: s.id })}
            >
              {runName(s.id)}
            </button>
          ))}
        </div>
        <div ref={scroller} className="save-scroll" onKeyDown={selectAdjacent}>
          <div className="save-graph" style={{ minWidth: width, height: chartHeight }}>
            <svg width={width} height={chartHeight} aria-hidden="true">
              {rows.map((s, i) => {
                const from = s.parent?.day ?? 1,
                  y = height(i);
                const parentIndex = s.parent ? rowNumbers.get(s.parent.slot) : undefined;
                return (
                  <g key={s.id} className={s.id === slot.id ? "chosen" : undefined}>
                    <path d={`M${point(from)} ${y} H${point(end(s))}`} />
                    {parentIndex !== undefined && (
                      <path
                        className="save-fork-line"
                        d={`M${point(from)} ${height(parentIndex)} v8 q0 4 4 7 l3 3 V${y - 6} q0 6 -7 6`}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            {rows.map((s, i) => (
              <div key={s.id}>
                {s.checkpoints
                  .filter((c) => c.day >= (s.parent?.day ?? 1))
                  .map((c) => (
                    <button
                      type="button"
                      key={c.day}
                      style={{ left: point(c.day), top: height(i) }}
                      data-row={i}
                      data-column={c.day}
                      className="save-node"
                      tabIndex={s.id === slot.id && c.day === checkpoint?.day ? 0 : -1}
                      aria-pressed={s.id === slot.id && c.day === checkpoint?.day}
                      aria-label={
                        runName(s.id) +
                        " · " +
                        dayName(c.day) +
                        " · " +
                        msg.session.checkpoint({}, options)
                      }
                      title={dayName(c.day) + " · " + currency.format(c.cash)}
                      onClick={() => select({ slot: s.id, day: c.day })}
                    >
                      {c.day}
                    </button>
                  ))}
                <button
                  type="button"
                  className="save-head"
                  style={{ left: point(end(s)), top: height(i) }}
                  data-row={i}
                  data-column={end(s)}
                  tabIndex={s.id === slot.id && !checkpoint ? 0 : -1}
                  aria-pressed={s.id === slot.id && !checkpoint}
                  aria-label={runName(s.id) + " · " + msg.session.latest({}, options)}
                  title={msg.session.latest({}, options)}
                  onClick={() => select({ slot: s.id })}
                >
                  <span aria-hidden="true">◆</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="save-key">
        <span>○ {msg.session.checkpoint({}, options)}</span>
        <span>◆ {msg.session.latest({}, options)}</span>
      </div>
      <div className="save-reading">
        <strong>
          {runName(slot.id)}
          {balance != null && " · " + dayName(day)}
        </strong>
        {balance != null && <b>{currency.format(balance)}</b>}
        {description && <small>{description}</small>}
        {difference !== undefined && parentNumber && (
          <small>
            {msg.session.parentDifference(
              {
                run: parentNumber,
                difference: (difference > 0 ? "+" : "") + currency.format(difference),
              },
              options,
            )}
          </small>
        )}
        {slot.damaged ? (
          <small>{msg.session.damaged({}, options)}</small>
        ) : (
          !checkpoint && slot.finished && <small>{msg.session.finished({}, options)}</small>
        )}
        {!slot.damaged && slot.cash === null && slot.moves > 0 && (
          <small>{msg.session.recoverDays({}, options)}</small>
        )}
      </div>
      {!slot.damaged && (
        <div className="session-actions">
          {checkpoint ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => branch(slot.id, checkpoint.day)}
            >
              {msg.session.fork({ day: checkpoint.day }, options)}
            </button>
          ) : (
            !(compact && slot.finished && slot.id === activeSlot) && (
              <a href={destination}>
                {slot.finished ? msg.session.reopen({}, options) : msg.session.resume({}, options)}
              </a>
            )
          )}
        </div>
      )}
    </section>
  );
}
