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
    <section className="sheet">
      <DirectorySearch {...props} />
      {suppliers.length > 0 && (
        <ul className="desk-archive">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => openObject("supplier:" + s.id)}>
                {s.name}
                {s.name !== s.id && " · " + s.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
