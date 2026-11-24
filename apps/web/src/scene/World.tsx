import type { Report, Snapshot } from "games-common/benchmark";

import { msPerDay, type Optional } from "games-common/language";
import { useMemo, type CSSProperties } from "react";

import { address, moveDestination } from "@/game/commands";

import type { CabinetStock } from "./Cabinet";

import { depotObservations } from "./Depot";
import Office from "./Office";
import { RoomPreview } from "./RoomPreview";
import { minutesPerDay } from "./useClock";

interface WorldProps {
  value: number;
  state: Optional<Snapshot>;
  t: (key: "depot") => string;
  reports: readonly Report[];
  sceneObject: Optional<string>;
  onOpen: (id: string) => void;
}

function cabinetObservations(reports: readonly Report[], closes: number) {
  type Reading = { time: number; stock: CabinetStock };
  const sites: Record<string, Record<string, Reading[]>> = {};
  for (const report of reports) {
    const start = (report.day - 1) * minutesPerDay + report.minute;
    const loading = report.tool === "restock_machine" || report.tool === "swap_item";
    const duration = Math.max(
      0,
      (report.endDay > report.day ? closes : report.endMinute) - report.minute,
    );
    const time = loading ? start + duration / 2 : start;
    for (const [slot, item] of Object.entries(report.slots)) {
      const [site, machine, shelf] = address(slot).split(".");
      if (!site || !machine || !shelf) throw new Error("Invalid observed slot: " + slot);
      const machines = (sites[site] ??= {});
      const readings = (machines[machine] ??= []);
      let reading = readings.at(-1);
      if (reading?.time !== time) {
        reading = { time, stock: { ...reading?.stock } };
        readings.push(reading);
      }
      reading.stock[shelf.toUpperCase()] = item;
    }
  }
  return sites;
}

function daylight(value: number, startDate: string): number {
  const timestamp =
    Date.parse(startDate + "T00:00Z") + Math.floor(value / minutesPerDay) * msPerDay;
  const year = new Date(timestamp).getUTCFullYear();
  const yearDay = (timestamp - Date.UTC(year, 0, 1)) / msPerDay;
  const hours = 12 + 3 * Math.sin(((yearDay - 80) * 2 * Math.PI) / 365.25);
  const phase = (value % minutesPerDay) / minutesPerDay;
  return Math.max(0, Math.cos(((phase * 24 - 12) * Math.PI) / hours));
}

/** Show the addressed site and its last observed inventory without spending simulated time. */
export function World({ value, state, t, reports, sceneObject, onOpen }: WorldProps) {
  const depot = { id: "depot", name: t("depot") };
  const sites = [...(state?.sites ?? []).map((s) => ({ id: address(s.id), name: s.name })), depot];
  const closes = state?.closes ?? 0;
  const cabinets = useMemo(() => cabinetObservations(reports, closes), [reports, closes]);
  const inventories = useMemo(() => depotObservations(reports), [reports]);
  const depotCases = inventories.findLast((inventory) => inventory.time <= value)?.cases ?? null;
  const last = reports.at(-1);
  const lastObject = useMemo(() => {
    const report = reports.findLast((r) => moveDestination([r.tool, r.args]) !== undefined);
    return report && moveDestination([report.tool, report.args]);
  }, [reports]);
  const lastTarget = last && moveDestination([last.tool, last.args]);
  const destination = lastTarget?.startsWith("machine:") ? lastTarget.slice(8) : undefined;
  const activeObject = sceneObject ?? lastObject;
  const focus = activeObject?.startsWith("machine:") ? activeObject.slice(8) : undefined;
  const active =
    activeObject === "site:depot"
      ? depot
      : (sites.find((site) => focus && address(focus).startsWith(site.id + ".")) ??
        sites[0] ??
        depot);
  const machines = state?.machines.filter((id) => address(id).startsWith(active.id + ".")) ?? [];
  function openSite(site: string) {
    if (site === "depot") return onOpen("site:depot");
    const targets = state?.machines.filter((id) => address(id).startsWith(site + ".")) ?? [];
    const preferred = targets.find((id) => address(id) === site + ".snack") ?? targets[0];
    if (preferred) onOpen("machine:" + preferred);
  }
  const stock: Record<string, CabinetStock> = {};
  for (const [cabinet, readings] of Object.entries(cabinets[active.id] ?? {})) {
    const reading = readings.findLast((entry) => entry.time <= value);
    if (reading) stock[cabinet] = reading.stock;
  }
  const start = last ? (last.day - 1) * minutesPerDay + last.minute : 0;
  const end = last
    ? (last.day - 1) * minutesPerDay +
      (last.endDay > last.day && state ? state.closes : last.endMinute)
    : 0;
  const cabinetVisit =
    last &&
    Object.keys(last.slots).length > 0 &&
    destination &&
    address(destination).startsWith(active.id + ".") &&
    end > start &&
    value >= start &&
    value < end;
  const progress = cabinetVisit ? (value - start) / (end - start) : 0;
  const service =
    cabinetVisit &&
    (last.tool === "get_machine_inventory" ||
      last.tool === "restock_machine" ||
      last.tool === "swap_item")
      ? {
          drink: destination.endsWith("DRINKS"),
          progress,
          inspecting: last.tool === "get_machine_inventory",
          open:
            last.tool === "get_machine_inventory"
              ? 0
              : Math.min(1, progress * 4, (1 - progress) * 4),
        }
      : null;
  const light = daylight(value, state?.startDate ?? "2026-01-05");
  const style: CSSProperties & { "--light": number } = { "--light": 0.67 + light * 0.33 };
  return (
    <div className="world office-survey" style={style}>
      <figure className="live-room">
        <Office
          site={active.id}
          slots={state?.slots}
          depotCases={depotCases}
          phase={(value % minutesPerDay) / minutesPerDay}
          light={light}
          weather={state?.weather}
          service={service}
          focus={focus?.split(":")[1]}
          machines={machines}
          onMachineSelect={(id) => onOpen("machine:" + id)}
          visit={cabinetVisit ? { drink: destination.endsWith("DRINKS"), progress } : null}
          stock={stock}
        />
        <figcaption>
          {active.name}
          {focus && " / " + address(focus)}
        </figcaption>
      </figure>
      <div className="remote-rooms">
        {sites.map((site) => (
          <figure key={site.id}>
            <button
              type="button"
              className="room-selector"
              aria-pressed={site.id === active.id}
              onClick={() => openSite(site.id)}
            >
              <RoomPreview site={site.id} depotCases={depotCases} />
              <span>{site.name}</span>
            </button>
          </figure>
        ))}
      </div>
    </div>
  );
}
