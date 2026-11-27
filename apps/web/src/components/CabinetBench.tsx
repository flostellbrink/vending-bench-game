import type { Report } from "games-common/benchmark";

import { assertValue, first as firstValue, hasValue, type Optional } from "games-common/language";
import { useMemo, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { cabinetLayout, type CabinetSlot } from "@/game/cabinet-layout.ts";
import { address } from "@/game/commands.ts";
import { slotChanges } from "@/game/slot-evidence.ts";

import type { ObservationProps } from "./panel-props.ts";

import { SlotInstrument } from "./SlotInstrument.tsx";
import "./cabinet-bench.css";

/** The inventory report lists the slot price in this column. */
const inventoryPriceColumn = 5;
interface Props extends ObservationProps {
  live: boolean;
  openReport: (id: number) => void;
}
/** A slot on a shelf of the cabinet face, with its fill level. */
function ShelfSlot({
  slot,
  picked,
  pick,
}: {
  slot: CabinetSlot;
  picked: boolean;
  pick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={`${slot.code} · ${slot.product} · ${slot.quantity} / ${slot.capacity}`}
      title={`${slot.code} · ${slot.product} · ${slot.quantity}/${slot.capacity}`}
      onClick={pick}
    >
      <b>{slot.code}</b>
      <span>{slot.quantity}</span>
      <i className="slot-level" aria-hidden="true">
        <i style={{ width: `${(slot.quantity / Math.max(1, slot.capacity)) * 100}%` }} />
      </i>
    </button>
  );
}

/** The price that a later receipt shows for the slot, or "—" when it clears the price. */
function observedPrice(
  { report: source, price }: { report: Report; price?: number },
  slotId: string,
): Optional<string | number> {
  const inspection =
    source.tool === "get_machine_inventory"
      ? source.rows.find(([id]) => typeof id === "string" && address(id) === slotId)
      : undefined;
  const listed = inspection?.[inventoryPriceColumn];
  if (hasValue(listed)) {
    return listed;
  }
  if (hasValue(price)) {
    return price;
  }
  if (source.tool === "clear_slot" || source.display.includes("has no price set")) {
    return "—";
  }
  return undefined;
}

export default function CabinetBench({
  report,
  reports,
  state,
  money,
  runCommand,
  disabled,
  live,
  openReport,
}: Props) {
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
        const price = observedPrice(change, slot.id);
        if (hasValue(price)) {
          slot.price = price;
          priceSources.set(slot.id, source);
        }
      }
    }
    return { ...layout, priceSources, stockSources };
  }, [report, reports, live]);
  const { machines, slots } = readings;
  const [picked, setPicked] = useState(() => slots.keys().next().value);
  const slot = (picked ? slots.get(picked) : undefined) ?? slots.values().next().value;
  if (!slot) {
    return null;
  }
  const shelves = assertValue(machines.get(slot.machine));

  return (
    <div className="cabinet-bench">
      <section className="cabinet-face" aria-label={slot.machine}>
        <header>
          {machines.size === 1 ? (
            <b>{slot.machine}</b>
          ) : (
            <select
              className="control-input"
              aria-label={msg.operator.machines()}
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
              style={{ gridTemplateColumns: `repeat(${shelf.length}, minmax(0,1fr))` }}
            >
              {shelf.map((s) => (
                <ShelfSlot key={s.id} slot={s} picked={s === slot} pick={() => setPicked(s.id)} />
              ))}
            </div>
          ))}
        </div>
      </section>
      <SlotInstrument
        key={slot.id}
        report={report}
        reports={reports}
        state={state}
        money={money}
        runCommand={runCommand}
        disabled={disabled}
        live={live}
        openReport={openReport}
        slot={slot}
        stockSource={readings.stockSources.get(slot.id) ?? report}
        priceSource={readings.priceSources.get(slot.id) ?? report}
      />
    </div>
  );
}
