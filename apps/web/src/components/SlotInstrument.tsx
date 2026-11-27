import type { CommandArgs, Report } from "games-common/benchmark";

import { hasValue } from "games-common/language";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import type { CabinetSlot } from "@/game/cabinet-layout.ts";

import { msg } from "@/dictionary/index.ts";
import { commandForMove } from "@/game/commands.ts";
import { slotChanges } from "@/game/slot-evidence.ts";
import { clock } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import { ActionForm, Field, QuantityInput } from "./FormControls.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";
import { ProductInput } from "./ProductInput.tsx";

const operations = ["restock_machine", "set_price", "clear_slot", "swap_item"] as const;
type Operation = (typeof operations)[number];
/** The amendment lists only the latest observations after the reading. */
const shownChanges = 3;
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
  runCommand,
  disabled,
  slot,
  live,
  stockSource,
  priceSource,
  openReport,
}: Props) {
  const changes = live ? [] : slotChanges(reports, slot.id, report.id);
  return (
    <section className="slot-instrument">
      <header>
        <b className="slot-code">{slot.code}</b>
        <div>
          <h3>{slot.product}</h3>
          <small>
            {msg.operator.size()}: {slot.size}
          </small>
        </div>
      </header>
      <dl className="slot-reading">
        <div>
          <dt>{msg.fields.quantity()}</dt>
          <dd>
            {slot.quantity}
            <small> / {slot.capacity}</small>
          </dd>
        </div>
        <div>
          <dt>{msg.fields.price()}</dt>
          <dd>{typeof slot.price === "number" ? money(slot.price) : slot.price}</dd>
        </div>
      </dl>
      <div className="slot-evidence">
        {msg.operator.seen()} · {msg.operator.day()} {stockSource.day} / {clock(stockSource.minute)}
        {live && (
          <button type="button" className="slot-source" onClick={() => openReport(stockSource.id)}>
            #{stockSource.id}
          </button>
        )}
        {live && priceSource.id !== stockSource.id && (
          <span>
            {msg.fields.price()} · {msg.operator.day()} {priceSource.day} /{" "}
            {clock(priceSource.minute)}{" "}
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
          <b>{msg.operator.laterObservations()}</b>
          {changes.slice(-shownChanges).map((change) => (
            <div key={change.report.id}>
              <small>
                {msg.operator.day()} {change.report.day} · {clock(change.report.minute)}
              </small>{" "}
              {change.observation
                ? `${msg.fields.quantity()}: ${change.observation.qty}/${
                    change.observation.capacity ?? slot.capacity
                  }`
                : `${msg.fields.price()}: ${hasValue(change.price) ? money(change.price) : "—"}`}
            </div>
          ))}
        </div>
      )}
      <SlotService
        slotId={slot.rawId}
        size={slot.size}
        disabled={disabled}
        reports={reports}
        runCommand={runCommand}
      />
    </section>
  );
}

type ServiceProps = Pick<ObservationProps, "reports" | "disabled" | "runCommand">;

export function UninspectedMachine({
  machine,
  state,
  action,
  reports,
  disabled,
  runCommand,
}: ServiceProps & Pick<ObservationProps, "state"> & { machine: string; action: ReactNode }) {
  const slots = state.slots.filter((id) => id.startsWith(`${machine}:`));
  const [slotId, setSlotId] = useState(slots[0] ?? "");
  const slotList = useId();
  return (
    <section className="sheet slot-instrument uninspected-machine">
      <div className="asset-actions">{action}</div>
      <Field label={msg.fields.slot()}>
        <input
          className="control-input"
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
      <SlotService reports={reports} disabled={disabled} runCommand={runCommand} slotId={slotId} />
    </section>
  );
}

function operationArgs(
  verb: Operation,
  { product, quantity, price }: { product: string; quantity: string; price: string },
): CommandArgs {
  if (verb === "restock_machine" || verb === "swap_item") {
    return { product_id: product, quantity: Number(quantity) };
  }
  if (verb === "set_price") {
    return { price: Number(price) };
  }
  return {};
}

function SlotService({
  slotId,
  size,
  reports,
  runCommand,
  disabled,
}: ServiceProps & { slotId: string; size?: string }) {
  const [verb, setVerb] = useState<Operation>("restock_machine");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const needsProduct = verb === "restock_machine" || verb === "swap_item";
  const labels = {
    clear_slot: msg.commands.clear_slot(),
    restock_machine: msg.commands.restock_machine(),
    set_price: msg.commands.set_price(),
    swap_item: msg.commands.swap_item(),
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
      const args = operationArgs(verb, { price, product, quantity });
      runCommand(commandForMove([verb, { slot: slotId, ...args }]));
    }
  }
  return (
    <div className="slot-service">
      <div className="slot-operations" role="group" aria-label={`${msg.fields.slot()} ${slotId}`}>
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
      <ActionForm
        onSubmit={submit}
        className={needsProduct ? "slot-inputs" : "slot-single"}
        actions={
          <GuiToolInfo verb={verb} disabled={disabled || !valid}>
            {labels[verb]}
          </GuiToolInfo>
        }
      >
        {needsProduct && (
          <>
            <Field label={msg.fields.product_id()}>
              <ProductInput
                reports={reports}
                label={msg.fields.product_id()}
                preferSize={size}
                disabled={disabled}
                value={product}
                onChange={setProduct}
              />
            </Field>
            <Field label={msg.fields.quantity()}>
              <QuantityInput
                disabled={!product}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          </>
        )}
        {verb === "set_price" && (
          <Field label={msg.fields.price()}>
            <input
              className="control-input"
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        )}
      </ActionForm>
    </div>
  );
}
