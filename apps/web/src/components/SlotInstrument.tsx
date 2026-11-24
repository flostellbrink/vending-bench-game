import type { Report } from "games-common/benchmark";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import type { CabinetSlot } from "@/game/cabinet-layout";

import { commandForMove } from "@/game/commands";
import { slotChanges } from "@/game/slot-evidence";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import { ControlRow, ControlInput, Field, QuantityInput } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
import { ProductInput } from "./ProductInput";

const operations = ["restock_machine", "set_price", "clear_slot", "swap_item"] as const;
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
  const changes = live ? [] : slotChanges(reports, slot.id, report.id);
  const field = (name: keyof typeof msg.fields) => msg.fields[name]({}, { locale: lang });
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
      <SlotService
        slotId={slot.rawId}
        size={slot.size}
        {...{ reports, lang, t, runCommand, disabled, live }}
      />
    </section>
  );
}

type ServiceProps = Pick<ObservationProps, "lang" | "reports" | "t" | "disabled" | "runCommand">;

export function UninspectedMachine({
  machine,
  state,
  action,
  ...props
}: ServiceProps & Pick<ObservationProps, "state"> & { machine: string; action: ReactNode }) {
  const slots = state.slots.filter((id) => id.startsWith(machine + ":"));
  const [slotId, setSlotId] = useState(slots[0] ?? "");
  const slotList = useId();
  return (
    <section className="sheet slot-instrument">
      <div className="asset-actions">{action}</div>
      <Field label={msg.fields.slot({}, { locale: props.lang })}>
        <ControlInput
          list={slotList}
          value={slotId}
          onChange={(event) => setSlotId(event.currentTarget.value)}
        />
        <datalist id={slotList}>
          {slots.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      </Field>
      <SlotService {...props} slotId={slotId} live />
    </section>
  );
}

function SlotService({
  slotId,
  size,
  reports,
  lang,
  t,
  runCommand,
  disabled,
  live,
}: ServiceProps & { slotId: string; size?: string; live: boolean }) {
  const [verb, setVerb] = useState<(typeof operations)[number]>("restock_machine");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const needsProduct = verb === "restock_machine" || verb === "swap_item";
  const field = (name: keyof typeof msg.fields) => msg.fields[name]({}, { locale: lang });
  const labels = {
    restock_machine: msg.commands.restock_machine({}, { locale: lang }),
    set_price: msg.commands.set_price({}, { locale: lang }),
    clear_slot: msg.commands.clear_slot({}, { locale: lang }),
    swap_item: msg.commands.swap_item({}, { locale: lang }),
  };
  const valid =
    slotId.trim() &&
    (needsProduct
      ? product.trim() !== "" && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0
      : verb === "clear_slot" ||
        (price !== "" && Number.isFinite(Number(price)) && Number(price) >= 0));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!disabled && valid) {
      const args = needsProduct
        ? { product_id: product, quantity: Number(quantity) }
        : verb === "set_price"
          ? { price: Number(price) }
          : {};
      runCommand(commandForMove([verb, { slot: slotId, ...args }]), false, live);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="slot-operations" role="group" aria-label={field("slot") + " " + slotId}>
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
      <ControlRow className="slot-inputs">
        {needsProduct && (
          <>
            <Field label={field("product_id")}>
              <ProductInput
                reports={reports}
                t={t}
                label={field("product_id")}
                preferSize={size}
                disabled={disabled}
                value={product}
                onChange={setProduct}
              />
            </Field>
            <Field label={field("quantity")}>
              <QuantityInput
                disabled={!product}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          </>
        )}
        {verb === "set_price" && (
          <Field label={field("price")}>
            <ControlInput
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        )}
        <span className="control-line slot-submit">
          <GuiToolInfo verb={verb}>
            <button data-clock-verb={verb} disabled={disabled || !valid}>
              {labels[verb]}
            </button>
          </GuiToolInfo>
        </span>
      </ControlRow>
    </form>
  );
}
