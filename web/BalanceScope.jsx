import { useState } from "react";

const ink = ["#1d5941", "#6b496b", "#536879", "#765e39"];

export function BalanceScope({ history, rivals, best, release, lang, t, playerName, scriptName }) {
  const [selected, setSelected] = useState(null);
  const day = Math.min(selected ?? Math.max(0, history.length - 1), release.days);
  const series = [
    { name: playerName, values: history },
    ...(best ? [{ name: t("previousBest"), values: best.values }] : []),
    ...rivals.map((r) => ({
      name: r.kind === "script" ? scriptName : r.name,
      values: r.values,
      endDay: r.endDay,
      finalBalance: r.finalBalance,
    })),
  ];
  const known = series
    .flatMap((s) => [...(s.values ?? []), s.finalBalance])
    .filter(Number.isFinite);
  const step = Math.max(100, 10 ** Math.floor(Math.log10(Math.max(100, ...known))) / 2);
  const top = Math.ceil(Math.max(step, ...known) / step) * step;
  const bottom = Math.floor(Math.min(0, ...known) / step) * step;
  const x = (d) => 6 + (988 * d) / release.days,
    y = (v) => 5 + (88 * (top - v)) / (top - bottom);
  const format = new Intl.NumberFormat(lang, { style: "currency", currency: release.currency });
  const tick = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  const valueAt = (s) => s.values?.[day] ?? (day === s.endDay ? s.finalBalance : undefined);
  function cursorFromPointer(e) {
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
              <g key={s.name} stroke={ink[index % ink.length]} fill="none">
                {path && (
                  <path
                    d={path}
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={index ? 1.6 : 2.5}
                    strokeDasharray={index ? (index % 2 ? "6 3" : "2 3") : undefined}
                  />
                )}
                {s.endDay >= points.length && Number.isFinite(s.finalBalance) && (
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
        {series.map((s, i) => (
          <span key={s.name} style={{ "--ink": ink[i % ink.length] }}>
            {s.name} <b>{valueAt(s) == null ? "—" : format.format(valueAt(s))}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
