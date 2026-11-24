import type { Release, Rival, PersonalBest } from "games-common/benchmark";
import type { CSSProperties, PointerEvent } from "react";

import { assertValue, hasValue } from "games-common/language";

import type { ParentBalance } from "@/game/runs";
import type { Lang, Translate } from "@/localization/messages";

import { msg } from "@/dictionary";
const ink = ["#1d5941", "#6b496b", "#536879", "#765e39"];

interface BalanceScopeProps {
  parentBalance?: ParentBalance;
  history: number[];
  rivals: Rival[];
  best: PersonalBest | null;
  release: Release;
  lang: Lang;
  t: Translate;
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
  parentBalance,
  history,
  rivals,
  best,
  release,
  lang,
  t,
  selected,
  setSelected,
  showReceipts,
}: BalanceScopeProps) {
  const day = Math.min(selected ?? Math.max(0, history.length - 1), release.days);
  const series: Trace[] = [
    { name: msg.fields.player({}, { locale: lang }), values: history },
    ...(best ? [{ name: t("previousBest"), values: best.values }] : []),
    ...rivals.map((r) => ({
      name: r.kind === "script" ? msg.fields.bot({}, { locale: lang }) : assertValue(r.name),
      values: r.values,
      endDay: r.endDay,
      finalBalance: r.finalBalance,
    })),
    ...(parentBalance
      ? [
          {
            name: msg.session.sourceTrack({}, { locale: lang }),
            values: parentBalance.values,
            color: "#9a431c",
          },
        ]
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
  const format = new Intl.NumberFormat(lang, { style: "currency", currency: release.currency });
  const tick = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  const valueAt = (s: Trace) => s.values?.[day] ?? (day === s.endDay ? s.finalBalance : undefined);
  function cursorFromPointer(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    setSelected(
      Math.round(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * release.days),
    );
  }
  return (
    <section className="scope balance-scope">
      <header>
        <b>
          {t("bank")} / {release.currency}
        </b>
        <small>
          {t("day")} {day} / {release.days}
        </small>
        {day > 0 && day < history.length && (
          <button className="receipt-link" onClick={() => showReceipts(day)}>
            {t("cashChange")}{" "}
            {format.format(assertValue(history[day]) - assertValue(history[day - 1]))} ·{" "}
            {t("results")}
          </button>
        )}
      </header>
      <div className="scope-graph">
        <div className="scale" aria-hidden="true">
          <span>{tick.format(top)}</span>
          <span>{tick.format((top + bottom) / 2)}</span>
          <span>{tick.format(bottom)}</span>
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
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${6 + (988 * i) / 6} 5 V93`} className="graticule" />
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
                    <path d={`M${x(s.endDay) - 8} ${y(s.finalBalance)} h9`} strokeWidth="4" />
                  )}
              </g>
            );
          })}
          <path d={`M${x(day)} 3 V96`} className="chart-cursor" />
        </svg>
      </div>
      <input
        aria-label={t("day")}
        type="range"
        min="0"
        max={release.days}
        value={day}
        onChange={(e) => setSelected(Number(e.target.value))}
      />
      <div className="legend">
        {series.map((s, i) => {
          const style: CSSProperties & { "--ink": string } = {
            "--ink": s.color ?? assertValue(ink[i % ink.length]),
          };
          const value = valueAt(s);
          return (
            <span key={s.name} style={style}>
              {s.name} <b>{value == null ? "—" : format.format(value)}</b>
            </span>
          );
        })}
      </div>
    </section>
  );
}
