import type { ObservedSupplier } from "@/game/suppliers";

import type { ObservationProps } from "./panel-props";

import "./supplier-desk.css";
import { DirectorySearch } from "./DirectorySearch";

type Props = Pick<ObservationProps, "state" | "t" | "runCommand" | "disabled"> & {
  openObject: (id: string) => void;
  suppliers: ObservedSupplier[];
};
export function SupplierDirectory({ suppliers, openObject, ...props }: Props) {
  return (
    <section className="sheet supplier-index">
      <DirectorySearch {...props} />
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
