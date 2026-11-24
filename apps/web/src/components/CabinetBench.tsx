import { assertValue, first as firstValue } from "games-common/language";
import { useMemo, useState } from "react";

import { cabinetLayout, type CabinetSlot } from "@/game/cabinet-layout";
import { address } from "@/game/commands";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";

import { SlotInstrument } from "./SlotInstrument";
import "./cabinet-bench.css";
export default function CabinetBench(props: Omit<ObservationProps, "money">) {
  const { report, lang, t, commandLine, stageCommand } = props;
  const { machines, slots } = useMemo(() => cabinetLayout(report.rows), [report]);
  const [picked, setPicked] = useState(() => slots.keys().next().value);
  const [first = "", slotWord] = commandLine.trim().split(/\s+/);
  const verb = first.toLowerCase();
  const commandSlot =
    slotWord && ["refill", "price", "clear", "swap"].includes(verb)
      ? slots.get(address(slotWord))
      : undefined;
  const slot =
    commandSlot ?? (picked ? slots.get(picked) : undefined) ?? slots.values().next().value;
  if (!slot) return null;
  const shelves = assertValue(machines.get(slot.machine));
  function pick(next: CabinetSlot) {
    setPicked(next.id);
    // Retarget the instrument without carrying a quantity or price to the new slot.
    if (commandSlot && next !== commandSlot) stageCommand(verb + " " + next.id + " ");
  }

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
                pick(firstValue(firstShelf));
              }}
            >
              {[...machines.keys()].map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          )}
          <small>{msg.fields.slot({}, { locale: lang })}</small>
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
                  onClick={() => pick(s)}
                >
                  <b>{s.code}</b>
                  <span>
                    {s.quantity}
                    <small>/{s.capacity}</small>
                  </span>
                  <i className="slot-level" aria-hidden="true">
                    <i style={{ width: (s.quantity / Math.max(1, s.capacity)) * 100 + "%" }} />
                  </i>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
      <SlotInstrument {...props} slot={slot} targeted={slot === commandSlot} />
    </div>
  );
}
