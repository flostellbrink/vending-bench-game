import type { Report, Snapshot } from "games-common/benchmark";

import {
  entries,
  hasValue,
  hoursPerDay,
  keys,
  msPerDay,
  type Optional,
} from "games-common/language";
import { useMemo, type CSSProperties } from "react";

import { msg } from "@/dictionary/index.ts";
import { address, moveDestination } from "@/game/commands.ts";
import { weatherObservations } from "@/game/reports.ts";

import type { CabinetStock } from "./Cabinet.tsx";

import { depotObservations } from "./Depot.tsx";
import Office from "./Office.tsx";
import { RoomPreview } from "./RoomPreview.tsx";
import { minutesPerDay } from "./useClock.ts";

const machinePrefix = "machine:";
/** Day length over the year: hours of daylight swing around the mean, longest in summer. */
const sun = { meanHours: 12, noonHour: 12, springEquinoxDay: 80, swingHours: 3, yearDays: 365.25 };
/** The room keeps this share of its brightness at night; daylight adds the rest. */
const roomLight = { daylightShare: 0.33, night: 0.67 };

interface WorldProps {
  value: number;
  state: Optional<Snapshot>;

  reports: readonly Report[];
  sceneObject: Optional<string>;
  onOpen: (id: string) => void;
}

function cabinetObservations(reports: readonly Report[], closes: number) {
  interface Reading {
    time: number;
    stock: CabinetStock;
  }
  const sites: Record<string, Record<string, Reading[]>> = {};
  for (const report of reports) {
    const start = (report.day - 1) * minutesPerDay + report.minute;
    const loading = report.tool === "restock_machine" || report.tool === "swap_item";
    const duration = Math.max(
      0,
      (report.endDay > report.day ? closes : report.endMinute) - report.minute,
    );
    const time = loading ? start + duration / 2 : start;
    for (const [slot, item] of entries(report.slots)) {
      const [site, machine, shelf] = address(slot).split(".");
      if (!site || !machine || !shelf) {
        throw new Error(`Invalid observed slot: ${slot}`);
      }
      const machines = sites[site] ?? {};
      sites[site] = machines;
      const readings = machines[machine] ?? [];
      machines[machine] = readings;
      let reading = readings.at(-1);
      if (reading?.time !== time) {
        reading = { stock: { ...reading?.stock }, time };
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
  const hours =
    sun.meanHours +
    sun.swingHours * Math.sin(((yearDay - sun.springEquinoxDay) * 2 * Math.PI) / sun.yearDays);
  const phase = (value % minutesPerDay) / minutesPerDay;
  return Math.max(0, Math.cos(((phase * hoursPerDay - sun.noonHour) * Math.PI) / hours));
}

/** Show the addressed site and its last observed inventory without spending simulated time. */
export function World({ value, state, reports, sceneObject, onOpen }: WorldProps) {
  const depot = { id: "depot", name: msg.operator.depot() };
  const sites = [...(state?.sites ?? []).map((s) => ({ id: address(s.id), name: s.name })), depot];
  const closes = state?.closes ?? 0;
  const cabinets = useMemo(() => cabinetObservations(reports, closes), [reports, closes]);
  const inventories = useMemo(() => depotObservations(reports), [reports]);
  const depotCases = inventories.findLast((inventory) => inventory.time <= value)?.cases ?? null;
  const last = reports.at(-1);
  const weatherByDay = useMemo(() => weatherObservations(reports), [reports]);
  const observed = weatherByDay.get(1 + Math.floor(value / minutesPerDay));
  const lastObject = useMemo(() => {
    const report = reports.findLast((r) => hasValue(moveDestination([r.tool, r.args])));
    return report && moveDestination([report.tool, report.args]);
  }, [reports]);
  const lastTarget = last && moveDestination([last.tool, last.args]);
  const destination = lastTarget?.startsWith(machinePrefix)
    ? lastTarget.slice(machinePrefix.length)
    : undefined;
  const activeObject = sceneObject ?? lastObject;
  const focus = activeObject?.startsWith(machinePrefix)
    ? activeObject.slice(machinePrefix.length)
    : undefined;
  const active =
    activeObject === "site:depot"
      ? depot
      : (sites.find((site) => focus && address(focus).startsWith(`${site.id}.`)) ??
        sites[0] ??
        depot);
  const machines = state?.machines.filter((id) => address(id).startsWith(`${active.id}.`)) ?? [];
  function openSite(site: string) {
    if (site === "depot") {
      return onOpen("site:depot");
    }
    const targets = state?.machines.filter((id) => address(id).startsWith(`${site}.`)) ?? [];
    const preferred = targets.find((id) => address(id) === `${site}.snack`) ?? targets[0];
    if (preferred) {
      onOpen(`${machinePrefix}${preferred}`);
    }
  }
  const stock: Record<string, CabinetStock> = {};
  for (const [cabinet, readings] of entries(cabinets[active.id] ?? {})) {
    const reading = readings.findLast((entry) => entry.time <= value);
    if (reading) {
      stock[cabinet] = reading.stock;
    }
  }
  const start = last ? (last.day - 1) * minutesPerDay + last.minute : 0;
  const end = last
    ? (last.day - 1) * minutesPerDay +
      (last.endDay > last.day && state ? state.closes : last.endMinute)
    : 0;
  const cabinetVisit =
    last &&
    keys(last.slots).length > 0 &&
    destination &&
    address(destination).startsWith(`${active.id}.`) &&
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
          inspecting: last.tool === "get_machine_inventory",
          open:
            last.tool === "get_machine_inventory"
              ? 0
              : Math.min(1, progress * 4, (1 - progress) * 4),
          progress,
        }
      : null;
  const light = daylight(value, state?.startDate ?? "2026-01-05");
  const style: CSSProperties & { "--light": number } = {
    "--light": roomLight.night + light * roomLight.daylightShare,
  };
  return (
    <div className="world office-survey" style={style}>
      <figure className="live-room">
        <Office
          site={active.id}
          slots={state?.slots}
          depotCases={depotCases}
          phase={(value % minutesPerDay) / minutesPerDay}
          light={light}
          weather={
            observed && observed.minute <= value % minutesPerDay ? observed.weather : undefined
          }
          service={service}
          focus={focus?.split(":")[1]}
          machines={machines}
          onMachineSelect={(id) => onOpen(`machine:${id}`)}
          visit={cabinetVisit ? { drink: destination.endsWith("DRINKS"), progress } : null}
          stock={stock}
        />
        <figcaption>
          {active.name}
          {focus && ` / ${address(focus)}`}
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
