import { useState } from "react";

import type { ObservedSupplier } from "@/game/suppliers.ts";

import { msg } from "@/dictionary/index.ts";

import type { ObservationProps } from "./panel-props.ts";

import "./supplier-desk.css";
import { DirectorySearch } from "./DirectorySearch.tsx";
import { ActionForm, Field } from "./FormControls.tsx";

type Props = Pick<ObservationProps, "runCommand" | "disabled"> & {
  openObject: (id: string) => void;
  suppliers: ObservedSupplier[];
};
export function SupplierDirectory({ suppliers, openObject, runCommand, disabled }: Props) {
  const [supplierId, setSupplierId] = useState("");
  return (
    <section className="sheet supplier-index">
      <div className="supplier-tools">
        <DirectorySearch disabled={disabled} runCommand={runCommand} />
      </div>
      {suppliers.length > 0 && (
        <ul className="supplier-directory">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => openObject(`supplier:${s.id}`)}
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
            <button
              className="workbench-button"
              type="submit"
              aria-haspopup="dialog"
              disabled={!supplierId.trim()}
            >
              {msg.operator.openSupplier()}
            </button>
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (supplierId.trim()) {
              openObject(`supplier:${supplierId.trim()}`);
            }
          }}
        >
          <Field label={msg.fields.supplier_id()}>
            <input
              className="control-input"
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
