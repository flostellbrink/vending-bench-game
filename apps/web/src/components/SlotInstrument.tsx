import { useId, useState, type FormEvent } from "react";

import type { CabinetSlot } from "@/game/cabinet-layout";

import { quotedWord } from "@/game/command-words";
import { slotChanges } from "@/game/slot-evidence";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import { GuiToolInfo } from "./GuiToolInfo";

const operations = ["refill", "price", "clear", "swap"] as const;
type Props = ObservationProps & {
  slot: CabinetSlot;
  live: boolean;
  stockSource: Report;
  priceSource: Report;
  openReport: (id: number) => void;
};
export function SlotInstrument({
  report,
  money,
  reports,
  state,
  lang,
  t,
  runCommand,
  disabled,
  slot,
  live,
  stockSource,
  priceSource,
  openReport,
}: Props) {
  const productList = useId();
  const [verb, setVerb] = useState<(typeof operations)[number]>("refill");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const needsProduct = verb === "refill" || verb === "swap";
  const depot = reports.findLast((r) => r.tool === "get_storage_inventory");
  const sizeMatches = depot?.rows.filter((row) => row[2] === slot.size && Number(row[3]) > 0);
  const changes = live ? [] : slotChanges(reports, slot.id, report.id);
  const field = (name: keyof typeof msg.fields) => msg.fields[name]({}, { locale: lang });
  const labels = {
    refill: t("refill"),
    price: t("setPrice"),
    clear: msg.commands.clear_slot({}, { locale: lang }),
    swap: msg.commands.swap_item({}, { locale: lang }),
  };
  const valid = needsProduct
    ? product.trim() !== "" && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0
    : verb === "clear" || (price !== "" && Number.isFinite(Number(price)) && Number(price) >= 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!disabled && valid) {
      const args = needsProduct
        ? [quotedWord(product.trim()), quantity]
        : verb === "price"
          ? [price]
          : [];
      runCommand([verb, slot.id, ...args].join(" "), false, live);
    }
  }
  return (
    <section className="slot-instrument">
      <header>
        <b className="slot-code">{slot.code}</b>
        <div>
          <h3>{slot.product}</h3>
          <small>
            {t("size")}: {slot.size}
          </small>
        </div>
      </header>
      <dl className="slot-reading">
        <div>
          <dt>{field("quantity")}</dt>
          <dd>
            {slot.quantity}
            <small> / {slot.capacity}</small>
          </dd>
        </div>
        <div>
          <dt>{field("price")}</dt>
          <dd>{typeof slot.price === "number" ? money(slot.price) : slot.price}</dd>
        </div>
      </dl>
      <div className="slot-evidence">
        {t("seen")} · {t("day")} {stockSource.day} / {clock(stockSource.minute)}
        {live && (
          <button type="button" className="slot-source" onClick={() => openReport(stockSource.id)}>
            #{stockSource.id}
          </button>
        )}
        {live && priceSource.id !== stockSource.id && (
          <span>
            {field("price")} · {t("day")} {priceSource.day} / {clock(priceSource.minute)}{" "}
            <button
              type="button"
              className="slot-source"
              onClick={() => openReport(priceSource.id)}
            >
              #{priceSource.id}
            </button>
          </span>
        )}
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
                : field("price") + ": " + (change.price === undefined ? "—" : money(change.price))}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="slot-operations" role="group" aria-label={field("slot") + " " + slot.code}>
          {operations.map((action) => (
            <button
              type="button"
              key={action}
              aria-pressed={action === verb}
              data-clock-verb={action}
              onClick={() => setVerb(action)}
            >
              {labels[action]}
            </button>
          ))}
        </div>
        <div className="slot-inputs">
          {needsProduct && (
            <>
              <label>
                {field("product_id")}
                <input
                  value={product}
                  list={productList}
                  spellCheck="false"
                  autoComplete="off"
                  onChange={(e) => setProduct(e.target.value)}
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
                  onChange={(e) => setQuantity(e.target.value)}
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
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="slot-submit">
          <GuiToolInfo verb={verb}>
            <button data-clock-verb={verb} disabled={disabled || !valid}>
              {labels[verb]} <span aria-hidden="true">↵</span>
            </button>
          </GuiToolInfo>
          <span>{timeLabel(verb, state, t)}</span>
        </div>
      </form>
    </section>
  );
}
import type { Report } from "games-common/benchmark";
