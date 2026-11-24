import type { Report } from "games-common/benchmark";

import { assertValue, first as firstValue } from "games-common/language";
import { useMemo, useState } from "react";

import { cabinetLayout } from "@/game/cabinet-layout";
import { address } from "@/game/commands";
import { slotChanges } from "@/game/slot-evidence";

import type { ObservationProps } from "./panel-props";

import { SlotInstrument } from "./SlotInstrument";
import "./cabinet-bench.css";
interface Props extends ObservationProps {
  live: boolean;
  openReport: (id: number) => void;
}
export default function CabinetBench(props: Props) {
  const { report, reports, live, t } = props;
  const readings = useMemo(() => {
    const layout = cabinetLayout(report.rows);
    const stockSources = new Map<string, Report>();
    const priceSources = new Map<string, Report>();
    const later = live ? reports.filter((r) => r.id > report.id) : [];
    for (const slot of layout.slots.values()) {
      for (const change of slotChanges(later, slot.id, report.id)) {
        const source = change.report;
        if (change.observation) {
          slot.product = change.observation.item ?? "—";
          slot.quantity = change.observation.qty;
          slot.capacity = change.observation.capacity ?? slot.capacity;
          stockSources.set(slot.id, source);
        }
        const inspection =
          source.tool === "get_machine_inventory"
            ? source.rows.find(([id]) => typeof id === "string" && address(id) === slot.id)
            : undefined;
        let price;
        if (inspection?.[5] != null) price = inspection[5];
        else if (change.price !== undefined) price = change.price;
        else if (source.tool === "clear_slot" || source.display.includes("has no price set"))
          price = "—";
        if (price !== undefined) {
          slot.price = price;
          priceSources.set(slot.id, source);
        }
      }
    }
    return { ...layout, stockSources, priceSources };
  }, [report, reports, live]);
  const { machines, slots } = readings;
  const [picked, setPicked] = useState(() => slots.keys().next().value);
  const slot = (picked ? slots.get(picked) : undefined) ?? slots.values().next().value;
  if (!slot) return null;
  const shelves = assertValue(machines.get(slot.machine));

  return (
    <div className="cabinet-bench">
      <section className="cabinet-face" aria-label={slot.machine}>
        <header>
          {machines.size === 1 ? (
            <b>{slot.machine}</b>
          ) : (
            <select
              aria-label={t("machines")}
              value={slot.machine}
              onChange={(e) => {
                const firstShelf = assertValue(machines.get(e.target.value)?.values().next().value);
                setPicked(firstValue(firstShelf).id);
              }}
            >
              {[...machines.keys()].map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          )}
        </header>
        <div className="cabinet-glass">
          {[...shelves].map(([key, shelf]) => (
            <div
              className="cabinet-shelf"
              key={key}
              style={{ gridTemplateColumns: "repeat(" + shelf.length + ", minmax(0,1fr))" }}
            >
              {shelf.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s === slot}
                  aria-label={s.code + " · " + s.product + " · " + s.quantity + " / " + s.capacity}
                  title={s.code + " · " + s.product + " · " + s.quantity + "/" + s.capacity}
                  onClick={() => setPicked(s.id)}
                >
                  <b>{s.code}</b>
                  <span>{s.quantity}</span>
                  <i className="slot-level" aria-hidden="true">
                    <i style={{ width: (s.quantity / Math.max(1, s.capacity)) * 100 + "%" }} />
                  </i>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
      <SlotInstrument
        key={slot.id}
        {...props}
        slot={slot}
        stockSource={readings.stockSources.get(slot.id) ?? report}
        priceSource={readings.priceSources.get(slot.id) ?? report}
      />
    </div>
  );
}
