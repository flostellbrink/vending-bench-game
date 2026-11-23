import type { Report, Snapshot } from "games-common/benchmark";

import { last } from "games-common/language";

import type { Translate } from "@/localization/messages";

import { address } from "@/game/commands";
interface Props {
  state: Snapshot | null;
  reports: Report[];
  t: Translate;
  value: string;
  onOpen: (id: string) => void;
}
export function ObjectNavigator({ state, reports, t, value, onOpen }: Props) {
  const suppliers = [
    ...new Map(reports.flatMap((r) => r.directory.map((s) => [s.id, s]))).values(),
  ];
  const leaf = (id: string, name: string) => (
    <button
      type="button"
      key={id}
      aria-current={value === id ? "location" : undefined}
      className="tree-leaf"
      onClick={() => onOpen(id)}
    >
      {name}
    </button>
  );
  return (
    <nav className="object-tree" aria-label={t("network")}>
      {leaf("desk", t("dispatchDesk"))}
      {leaf("world", t("bank"))}
      {leaf("scores", t("standings"))}
      <details open>
        <summary>{t("network")}</summary>
        {state?.sites.map((site) => (
          <details key={site.id} className="tree-branch">
            <summary>{site.name}</summary>
            {state.machines
              .filter((id) => id.startsWith(site.id + ":"))
              .map((id) => leaf("machine:" + id, last(address(id).split("."))))}
          </details>
        ))}
        {leaf("site:depot", t("depot"))}
      </details>
      <details open>
        <summary>{t("supply")}</summary>
        {leaf("suppliers", t("searchSuppliers"))}
        {suppliers.map((s) => leaf("supplier:" + s.id, s.name))}
        {leaf("orders", t("deliveries"))}
      </details>
      {leaf("mail", t("mailbox"))}
      {leaf("sales", t("revenue"))}
      {leaf("brief", t("rules"))}
    </nav>
  );
}
