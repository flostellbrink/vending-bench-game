import { useEffect, useMemo, useRef, useState } from "react";
import Office from "./Office.jsx";
import { address } from "./commands.js";

export const clock = (minutes) =>
  [Math.floor(minutes / 60) % 24, Math.floor(minutes) % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

export function useClock(state) {
  const target = state ? (state.day - 1) * 1440 + state.minute : null;
  const shown = useRef(null);
  const [value, setValue] = useState(540);
  useEffect(() => {
    if (target === null) {
      shown.current = null;
      setValue(540);
      return;
    }
    const from = shown.current;
    if (from === null || from > target || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = target;
      setValue(target);
      return;
    }
    let frame;
    const duration = Math.min(3200, 400 + 65 * Math.sqrt(target - from)),
      start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      shown.current = from + (target - from) * p * p * (3 - 2 * p);
      setValue(shown.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

const sites = [
  { id: "lounge", name: "AI Lounge" },
  { id: "house", name: "AI House" },
  { id: "main-lounge", name: "Main Lounge" },
  { id: "depot", name: "Depot" },
];
export function World({ value, state, line, t, reports }) {
  const phase = (value % 1440) / 1440;
  const date = new Date(
    Date.parse((state?.startDate || "2026-01-05") + "T00:00Z") +
      Math.floor(value / 1440) * 86400000,
  );
  const yearDay = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000;
  const daylight = 12 + 3 * Math.sin(((yearDay - 80) * 2 * Math.PI) / 365.25);
  const light = Math.max(0, Math.cos(((phase * 24 - 12) * Math.PI) / daylight));
  const last = reports.at(-1);
  const stock = useMemo(() => {
    const sites = {};
    for (const report of reports)
      for (const [slot, item] of Object.entries(report.slots)) {
        const [site, kind, shelf] = address(slot).split(".");
        const machines = (sites[site] ??= {});
        (machines[kind] ??= {})[shelf.toUpperCase()] = item;
      }
    return sites;
  }, [reports]);
  const destination = last?.args.slot?.split(":").slice(0, 2).join(":") || last?.args.machine_id;
  const focus =
    state?.machines.find((id) => line.toLowerCase().includes(address(id))) || destination;
  const isDepot =
    /^(depot|order)\b/i.test(line) ||
    (!line && !focus && ["get_storage_inventory", "order_goods"].includes(last?.tool));
  const site = isDepot
    ? "depot"
    : sites.find((s) => focus && address(focus).startsWith(s.id + "."))?.id || "lounge";
  const start = last ? (last.day - 1) * 1440 + last.minute : 0;
  const end = last ? (last.endDay - 1) * 1440 + last.endMinute : 0;
  const servicing =
    last &&
    Object.keys(last.slots).length &&
    ["restock_machine", "swap_item"].includes(last.tool) &&
    destination &&
    address(destination).startsWith(site + ".") &&
    end > start &&
    value >= start &&
    value < end;
  const elapsed = servicing ? (value - start) / (end - start) : 0;
  const service = servicing
    ? {
        drink: destination.endsWith("DRINKS"),
        progress: elapsed,
        open: Math.min(1, elapsed * 4, (1 - elapsed) * 4),
      }
    : null;
  const label = (s) => (s.id === "depot" ? t("depot") : s.name);
  const active = sites.find((s) => s.id === site);
  return (
    <div className="world office-survey" style={{ "--light": 0.67 + light * 0.33 }}>
      <figure className="live-room">
        <Office
          site={site}
          phase={phase}
          light={light}
          weather={state?.weather}
          service={service}
          focus={focus?.split(":")[1]}
          stock={stock[site]}
        />
        <figcaption>
          {label(active)}
          {focus && !isDepot && " / " + address(focus)}
        </figcaption>
      </figure>
      <div className="remote-rooms">
        {sites
          .filter((s) => s !== active)
          .map((s) => (
            <figure key={s.id}>
              <Office site={s.id} phase={phase} light={light} weather={state?.weather} stock={stock[s.id]} />
              <figcaption>{label(s)}</figcaption>
            </figure>
          ))}
      </div>
    </div>
  );
}
