import { useState } from "react";

import type { ObservedSupplier } from "@/game/suppliers";

import { msg } from "@/dictionary";

import type { ObservationProps } from "./panel-props";

import "./supplier-desk.css";
import { DirectorySearch } from "./DirectorySearch";
import { ActionButton, ControlInput, ControlRow, Field } from "./FormControls";

type Props = Pick<ObservationProps, "state" | "t" | "lang" | "runCommand" | "disabled"> & {
  openObject: (id: string) => void;
  suppliers: ObservedSupplier[];
};
export function SupplierDirectory({ suppliers, openObject, lang, ...props }: Props) {
  const [supplierId, setSupplierId] = useState("");
  const options = { locale: lang };
  return (
    <section className="sheet supplier-index">
      <div className="supplier-tools">
        <DirectorySearch {...props} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (supplierId.trim()) openObject("supplier:" + supplierId.trim());
          }}
        >
          <ControlRow>
            <Field label={msg.fields.supplier_id({}, options)}>
              <ControlInput
                required
                value={supplierId}
                onChange={(event) => setSupplierId(event.currentTarget.value)}
              />
            </Field>
            <ActionButton type="submit" disabled={!supplierId.trim()}>
              {msg.operator.openSupplier({}, options)}
            </ActionButton>
          </ControlRow>
        </form>
      </div>
      {suppliers.length > 0 && (
        <ul className="supplier-directory">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => openObject("supplier:" + s.id)}>
                <span>
                  <b>{s.name}</b>
                  {s.name !== s.id && <code>{s.id}</code>}
                </span>
                {s.orders.length > 0 && (
                  <small>
                    {props.t("orders")} · {s.orders.length}
                  </small>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
