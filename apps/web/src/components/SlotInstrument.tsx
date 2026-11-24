import { useId, type FormEvent } from "react";

import type { CabinetSlot } from "@/game/cabinet-layout";

import { parse, timing } from "@/game/commands";
import { slotChanges } from "@/game/slot-evidence";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

const operations = ["refill", "price", "clear", "swap"] as const;
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
  const verb =
    (targeted && operations.find((action) => action === first.toLowerCase())) || "refill";
  const needsProduct = verb === "refill" || verb === "swap";
  const product = targeted && needsProduct ? (args[0] ?? "") : "";
  const quantity = targeted && needsProduct ? (args[1] ?? "") : "";
  const price = targeted && verb === "price" ? (args[0] ?? "") : "";
  const depot = reports.findLast((r) => r.tool === "get_storage_inventory");
  const sizeMatches = depot?.rows.filter((row) => row[2] === slot.size && Number(row[3]) > 0);
  const changes = slotChanges(reports, slot.id, report.id);
  const field = (name: keyof typeof msg.fields) => msg.fields[name]({}, { locale: lang });
  const labels = {
    refill: t("refill"),
    price: t("setPrice"),
    clear: msg.commands.clear_slot({}, { locale: lang }),
    swap: msg.commands.swap_item({}, { locale: lang }),
  };
  function canDispatch() {
    if (disabled || !targeted) return false;
    try {
      const [, parsed] = parse(commandLine, state, {
        restock_machine: [],
        set_price: [],
        clear_slot: [],
        swap_item: [],
      });
      if (verb === "clear") return true;
      if (verb === "price") return parsed.price !== undefined && parsed.price >= 0;
      return parsed.quantity !== undefined && parsed.quantity > 0 && Boolean(parsed.product_id);
    } catch {
      return false;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canDispatch()) runCommand(commandLine.trim(), true);
  }
  return (
    <section className="slot-instrument">
      <header>
        <h3>
          <b>{slot.code}</b> {slot.product}
        </h3>
        <small>
          {t("seen")} · {t("day")} {report.day} / {clock(report.minute)}
        </small>
      </header>
      <dl className="slot-reading">
        <div>
          <dt>{t("size")}</dt>
          <dd>{slot.size}</dd>
        </div>
        <div>
          <dt>{field("quantity")}</dt>
          <dd>
            {slot.quantity}/{slot.capacity}
          </dd>
        </div>
        <div>
          <dt>{field("price")}</dt>
          <dd>{slot.price}</dd>
        </div>
      </dl>
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
      <div className="slot-operations">
        {operations.map((action) => (
          <button
            type="button"
            key={action}
            aria-pressed={action === verb}
            data-clock-verb={action}
            onClick={() => {
              if (!targeted || action !== verb) stageCommand(action + " " + slot.id + " ");
            }}
          >
            {labels[action]} <small>{timing(action, state)?.minutes} min</small>
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        {needsProduct && (
          <>
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
                    verb + " " + slot.id + " " + (next && quantity ? next + " " + quantity : next),
                  );
                }}
              />
            </label>
            <datalist id={productList}>
              {depot &&
                sizeMatches?.map((r) => (
                  <option key={r[0]} value={r[0]}>
                    {r[1]} ×{r[3]} · {t("depot")} #{depot.id} · {t("day")} {depot.day}{" "}
                    {clock(depot.minute)}
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
                  stageCommand(verb + " " + slot.id + " " + product + " " + e.target.value)
                }
              />
            </label>
          </>
        )}
        {verb === "price" && (
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
        )}
        <button data-clock-verb={verb} disabled={!canDispatch()}>
          {labels[verb]} · {timeLabel(verb, state, t)}
        </button>
      </form>
    </section>
  );
}
