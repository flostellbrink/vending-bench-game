import type { Release, Rival, PersonalBest } from "games-common/benchmark";
import type { CSSProperties, PointerEvent } from "react";

import { assertValue, hasValue } from "games-common/language";

import type { ParentBalance } from "@/game/runs";

import { msg } from "@/dictionary";
import { useCurrency } from "@/localization/formatters";

import "./financial-readouts.css";
const ink = [
  "#bbeb9b",
  "#eac177",
  "#9dd4e6",
  "#d9bbd8",
  "#ffab87",
  "#92d8b3",
  "#d7d989",
  "#a5bdff",
];

interface BalanceScopeProps {
  embedded?: boolean;
  parentBalance?: ParentBalance;
  history: number[];
  rivals: Rival[];
  best: PersonalBest | null;
  release: Release;

  selected: number | null;
  setSelected: (day: number) => void;
  showReceipts: (day: number) => void;
}
interface Trace {
  color?: string;
  name: string;
  values?: number[];
  endDay?: number | null;
  finalBalance?: number | null;
}
export function BalanceScope({
  embedded,
  parentBalance,
  history,
  rivals,
  best,
  release,
  selected,
  setSelected,
  showReceipts,
}: BalanceScopeProps) {
  const day = Math.min(selected ?? Math.max(0, history.length - 1), release.days);
  const endpoints = rivals.filter(
    (r) => !r.values?.length && r.endDay != null && r.finalBalance != null,
  );
  const endpointDays = new Set(endpoints.map((r) => r.endDay));
  const series: Trace[] = [
    { name: msg.fields.player(), values: history },
    ...(best ? [{ name: msg.operator.previousBest(), values: best.values }] : []),
    ...rivals.map((r) => ({
      name: r.kind === "script" ? msg.fields.bot() : assertValue(r.name),
      values: r.values,
      endDay: r.endDay,
      finalBalance: r.finalBalance,
    })),
    ...(parentBalance
      ? [{ name: msg.session.sourceTrack(), values: parentBalance.values, color: "#ff997e" }]
      : []),
  ];
  const known = series
    .flatMap((s) => [...(s.values ?? []), s.finalBalance])
    .filter(hasValue)
    .filter(Number.isFinite);
  const step = Math.max(100, 10 ** Math.floor(Math.log10(Math.max(100, ...known))) / 2);
  const top = Math.ceil(Math.max(step, ...known) / step) * step;
  const bottom = Math.floor(Math.min(0, ...known) / step) * step;
  const x = (d: number) => 6 + (988 * d) / release.days,
    y = (v: number) => 5 + (88 * (top - v)) / (top - bottom);
  const format = useCurrency(release.currency);
  const tick = useCurrency(release.currency, true);
  const valueAt = (s: Trace) => s.values?.[day] ?? (day === s.endDay ? s.finalBalance : undefined);
  const days = Array.from(
    new Set(Array.from({ length: 7 }, (_, i) => Math.round((i * release.days) / 6))),
  );
  const playerBalance = history[day];
  function cursorFromPointer(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    setSelected(
      Math.round(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * release.days),
    );
  }
  return (
    <section className="scope balance-scope">
      <header>
        <div className="balance-reading">
          <small>
            {!embedded && msg.operator.bank() + " · "}
            {day === 0 ? msg.operator.opening() : msg.operator.closing()} · {msg.operator.day()}{" "}
            {day} / {release.days}
          </small>
          <strong>{playerBalance === undefined ? "—" : format.format(playerBalance)}</strong>
        </div>
        {day > 0 && day < history.length && (
          <button aria-haspopup="dialog" className="receipt-link" onClick={() => showReceipts(day)}>
            {msg.operator.cashChange()}{" "}
            {format.format(assertValue(history[day]) - assertValue(history[day - 1]))} ·{" "}
            {msg.operator.results()}
          </button>
        )}
      </header>
      <div className="scope-graph">
        <div className="scale" aria-hidden="true">
          {[top, (top + bottom) / 2, bottom].map((amount) => (
            <span key={amount} style={{ top: y(amount) + "%" }}>
              {tick.format(amount)}
            </span>
          ))}
        </div>
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          onPointerDown={cursorFromPointer}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <path key={f} d={`M6 ${5 + 88 * f} H994`} className="graticule" />
          ))}
          {days.map((d) => (
            <path key={d} d={`M${x(d)} 5 V93`} className="graticule" />
          ))}
          {series.map((s, index) => {
            const points = s.values ?? [];
            const path = points
              .map((v, d) => (d ? `H${x(d)} V${y(v)}` : `M${x(0)} ${y(v)}`))
              .join(" ");
            return (
              <g key={s.name} stroke={s.color ?? ink[index % ink.length]} fill="none">
                {path && (
                  <path
                    d={path}
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={index ? 1.6 : 2.5}
                    strokeDasharray={index ? (index % 2 ? "6 3" : "2 3") : undefined}
                  />
                )}
                {s.endDay != null &&
                  s.endDay >= points.length &&
                  s.finalBalance != null &&
                  Number.isFinite(s.finalBalance) && (
                    <path
                      d={`M${x(s.endDay)} ${y(s.finalBalance)} h0.01`}
                      strokeWidth="5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
              </g>
            );
          })}
          <path d={`M${x(day)} 3 V96`} className="chart-cursor" />
          {playerBalance !== undefined && (
            <path
              d={`M${x(day) - 4} ${y(playerBalance)} h8`}
              stroke={ink[0]}
              strokeWidth={5}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <small className="axis-unit">{msg.operator.day()}</small>
        <div className="scope-days" aria-hidden="true">
          {days.map((d) => (
            <span key={d} style={{ left: x(d) / 10 + "%" }}>
              {d}
            </span>
          ))}
        </div>
        <input
          aria-label={msg.operator.day()}
          type="range"
          min="0"
          max={release.days}
          value={day}
          onChange={(e) => setSelected(Number(e.target.value))}
        />
      </div>
      <div className="legend">
        {series.map((s, i) => {
          if (!s.values?.length) return null;
          const style: CSSProperties & { "--ink": string } = {
            "--ink": s.color ?? assertValue(ink[i % ink.length]),
          };
          const value = valueAt(s);
          return (
            <span
              key={s.name}
              style={style}
              className={i === 0 ? "player-key" : i % 2 === 1 ? "dashed-key" : "dotted-key"}
            >
              {s.name} <b>{value == null ? "—" : format.format(value)}</b>
            </span>
          );
        })}
        {endpoints.length > 0 && (
          <div className="endpoint-keys">
            <small>
              {msg.session.finalBalances()}
              {endpointDays.size === 1 && " · " + msg.operator.day() + " " + endpoints[0]?.endDay}
            </small>
            {series.map((s, i) => {
              if (s.values?.length || s.endDay == null || s.finalBalance == null) return null;
              const style: CSSProperties & { "--ink": string } = {
                "--ink": s.color ?? assertValue(ink[i % ink.length]),
              };
              return (
                <span className="endpoint-key" key={s.name} style={style}>
                  {s.name}
                  {endpointDays.size > 1 && " · " + msg.operator.day() + " " + s.endDay}{" "}
                  <b>{format.format(s.finalBalance)}</b>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
