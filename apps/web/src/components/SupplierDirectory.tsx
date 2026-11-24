import { useState } from "react";

import type { ObservedSupplier } from "@/game/suppliers";

import { msg } from "@/dictionary";

import type { ObservationProps } from "./panel-props";

import "./supplier-desk.css";
import { DirectorySearch } from "./DirectorySearch";
import { ActionButton, ActionForm, ControlInput, Field } from "./FormControls";

type Props = Pick<ObservationProps, "state" | "runCommand" | "disabled"> & {
  openObject: (id: string) => void;
  suppliers: ObservedSupplier[];
};
export function SupplierDirectory({ suppliers, openObject, ...props }: Props) {
  const [supplierId, setSupplierId] = useState("");
  return (
    <section className="sheet supplier-index">
      <div className="supplier-tools">
        <DirectorySearch {...props} />
      </div>
      {suppliers.length > 0 && (
        <ul className="supplier-directory">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => openObject("supplier:" + s.id)}
              >
                <span>
                  <b>{s.name}</b>
                  {s.name !== s.id && <code>{s.id}</code>}
                </span>
                {s.orders.length > 0 && (
                  <small>
                    {msg.operator.orders()} · {s.orders.length}
                  </small>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="supplier-id-lookup">
        <ActionForm
          className="compact"
          aria-label={msg.operator.openSupplier()}
          actions={
            <ActionButton type="submit" aria-haspopup="dialog" disabled={!supplierId.trim()}>
              {msg.operator.openSupplier()}
            </ActionButton>
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (supplierId.trim()) openObject("supplier:" + supplierId.trim());
          }}
        >
          <Field label={msg.fields.supplier_id()}>
            <ControlInput
              required
              value={supplierId}
              onChange={(event) => setSupplierId(event.currentTarget.value)}
            />
          </Field>
        </ActionForm>
      </div>
    </section>
  );
}
