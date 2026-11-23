import type { Report, Snapshot } from "games-common/benchmark";

import { msPerDay, type Optional } from "games-common/language";
import { useMemo, type CSSProperties } from "react";

import { address } from "@/game/commands";

import type { CabinetStock } from "./Cabinet";

import Office from "./Office";
import { RoomPreview } from "./RoomPreview";
import { minutesPerDay } from "./useClock";

interface WorldProps {
  value: number;
  state: Optional<Snapshot>;
  line: string;
  t: (key: "depot") => string;
  reports: readonly Report[];
  selectedSite: Optional<string>;
  onSiteSelect: (id: string) => void;
}

function observedStock(reports: readonly Report[]): Record<string, Record<string, CabinetStock>> {
  const sites: Record<string, Record<string, CabinetStock>> = {};
  for (const report of reports) {
    for (const [slot, item] of Object.entries(report.slots)) {
      const [site, machine, shelf] = address(slot).split(".");
      if (!site || !machine || !shelf) throw new Error("Invalid observed slot: " + slot);
      const machines = (sites[site] ??= {});
      (machines[machine] ??= {})[shelf.toUpperCase()] = item;
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
export function World({ value, state, line, t, reports, selectedSite, onSiteSelect }: WorldProps) {
  const depot = { id: "depot", name: t("depot") };
  const sites = [...(state?.sites ?? []).map((s) => ({ id: address(s.id), name: s.name })), depot];
  const stock = useMemo(() => observedStock(reports), [reports]);
  const last = reports.at(-1);
  const slot = last?.args.slot;
  const machine = last?.args.machine_id;
  const destination =
    typeof slot === "string"
      ? slot.split(":").slice(0, 2).join(":")
      : typeof machine === "string"
        ? machine
        : undefined;
  const focus =
    state?.machines.find((id) => line.toLowerCase().includes(address(id))) ?? destination;
  const showDepot =
    /^(depot|order)\b/i.test(line) ||
    (!line && !focus && (last?.tool === "get_storage_inventory" || last?.tool === "order_goods"));
  const commandSite = showDepot
    ? depot
    : (sites.find((site) => focus && address(focus).startsWith(site.id + ".")) ??
      sites[0] ??
      depot);
  const active = sites.find((site) => site.id === selectedSite) ?? commandSite;
  const visibleFocus = active === commandSite && !showDepot ? focus : undefined;
  const start = last ? (last.day - 1) * minutesPerDay + last.minute : 0;
  const end = last ? (last.endDay - 1) * minutesPerDay + last.endMinute : 0;
  const servicing =
    last &&
    Object.keys(last.slots).length > 0 &&
    (last.tool === "restock_machine" || last.tool === "swap_item") &&
    destination &&
    address(destination).startsWith(active.id + ".") &&
    end > start &&
    value >= start &&
    value < end;
  const progress = servicing ? (value - start) / (end - start) : 0;
  const service = servicing
    ? {
        drink: destination.endsWith("DRINKS"),
        progress,
        open: Math.min(1, progress * 4, (1 - progress) * 4),
      }
    : null;
  const light = daylight(value, state?.startDate ?? "2026-01-05");
  const style: CSSProperties & { "--light": number } = { "--light": 0.67 + light * 0.33 };
  return (
    <div className="world office-survey" style={style}>
      <figure className="live-room">
        <Office
          site={active.id}
          phase={(value % minutesPerDay) / minutesPerDay}
          light={light}
          weather={state?.weather}
          service={service}
          focus={visibleFocus?.split(":")[1]}
          stock={stock[active.id]}
        />
        <figcaption>
          {active.name}
          {visibleFocus && " / " + address(visibleFocus)}
        </figcaption>
      </figure>
      <div className="remote-rooms">
        {sites
          .filter((site) => site !== active)
          .map((site) => (
            <figure key={site.id}>
              <button type="button" className="room-selector" onClick={() => onSiteSelect(site.id)}>
                <RoomPreview site={site.id} />
                <span>{site.name}</span>
              </button>
            </figure>
          ))}
      </div>
    </div>
  );
}
