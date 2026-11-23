import { useId, type FormEvent } from "react";

import type { CabinetSlot } from "@/game/cabinet-layout";

import { parse } from "@/game/commands";
import { slotChanges } from "@/game/slot-evidence";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";
type Props = Omit<ObservationProps, "money"> & { slot: CabinetSlot; targeted: boolean };
export function SlotInstrument({
  report,
  reports,
  state,
  lang,
  t,
  commandLine,
  stageCommand,
  runCommand,
  disabled,
  slot,
  targeted,
}: Props) {
  const productList = useId();
  const [first = "", , ...args] = commandLine.trim().split(/\s+/);
  const verb = first.toLowerCase();
  const product = targeted && verb === "refill" ? (args[0] ?? "") : "";
  const quantity = targeted && verb === "refill" ? (args[1] ?? "") : "";
  const price = targeted && verb === "price" ? (args[0] ?? "") : "";
  const depot = reports?.findLast((r) => r.tool === "get_storage_inventory");
  const changes = slotChanges(reports, slot.id, report.id);
  const field = (name: keyof typeof msg.fields) => msg.fields[name]({}, { locale: lang });
  function canDispatch(action: "refill" | "price") {
    if (disabled || !targeted || action !== verb) return false;
    try {
      const [, parsed] = parse(commandLine, state, { restock_machine: [], set_price: [] });
      return action === "refill"
        ? parsed.quantity !== undefined && parsed.quantity > 0 && Boolean(parsed.product_id)
        : parsed.price !== undefined && parsed.price >= 0;
    } catch {
      return false;
    }
  }

  function submit(event: FormEvent, action: "refill" | "price") {
    event.preventDefault();
    if (canDispatch(action)) runCommand(commandLine.trim(), true);
  }

  return (
    <section className="slot-instrument">
      <header>
        <h3>
          {slot.code} · {slot.product}
        </h3>
        <small>
          {t("seen")} · {t("day")} {report.day} / {clock(report.minute)}
        </small>
      </header>
      <div className="slot-reading">
        <span>
          {t("size")}: {slot.size}
        </span>
        <span>
          {field("quantity")}: {slot.quantity}/{slot.capacity}
        </span>
        <span>
          {field("price")}: {slot.price}
        </span>
      </div>
      {changes.length > 0 && (
        <div className="slot-amendment">
          <b>{t("laterObservations")}</b>
          {changes.slice(-3).map((change) => (
            <div key={change.report.id}>
              <small>
                {t("day")} {change.report.day} · {clock(change.report.minute)}
              </small>{" "}
              {change.observation
                ? field("quantity") +
                  ": " +
                  change.observation.qty +
                  "/" +
                  (change.observation.capacity ?? slot.capacity)
                : field("price") + ": " + change.price}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={(event) => submit(event, "refill")}>
        <label>
          {field("product_id")}
          <input
            value={product}
            list={productList}
            spellCheck="false"
            autoComplete="off"
            onChange={(e) => {
              const next = e.target.value.trim();
              stageCommand(
                "refill " + slot.id + " " + (next && quantity ? next + " " + quantity : next),
              );
            }}
          />
        </label>
        <datalist id={productList}>
          {depot?.rows.map((r) => (
            <option key={r[0]} value={r[0]}>
              {r[1]} · {r[3]}
            </option>
          ))}
        </datalist>
        <label>
          {field("quantity")}
          <input
            type="number"
            min="1"
            step="1"
            disabled={!product}
            value={quantity}
            onChange={(e) =>
              stageCommand("refill " + slot.id + " " + product + " " + e.target.value)
            }
          />
        </label>
        <button data-clock-verb="refill" disabled={!canDispatch("refill")}>
          {t("refill")} · {timeLabel("refill", state, t)}
        </button>
      </form>
      <form onSubmit={(event) => submit(event, "price")}>
        <label>
          {field("price")}
          <input
            type="number"
            min="0"
            step=".01"
            value={price}
            onChange={(e) => stageCommand("price " + slot.id + " " + e.target.value)}
          />
        </label>
        <button data-clock-verb="price" disabled={!canDispatch("price")}>
          {t("setPrice")} · {timeLabel("price", state, t)}
        </button>
      </form>
    </section>
  );
}
