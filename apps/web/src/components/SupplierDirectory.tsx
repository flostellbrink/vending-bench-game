import type { ObservationProps } from "./panel-props";

import { DirectorySearch } from "./DirectorySearch";

type Props = Pick<ObservationProps, "state" | "t" | "reports" | "runCommand" | "disabled"> & {
  openObject: (id: string) => void;
};
export function SupplierDirectory({ reports, openObject, ...props }: Props) {
  const contacts = [...new Map(reports.flatMap((r) => r.directory.map((s) => [s.id, s]))).values()];
  return (
    <section className="sheet">
      <h2>{props.t("supply")}</h2>
      <DirectorySearch {...props} />
      {contacts.length > 0 && (
        <ul className="desk-archive">
          {contacts.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => openObject("supplier:" + s.id)}>
                {s.name} · {s.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
