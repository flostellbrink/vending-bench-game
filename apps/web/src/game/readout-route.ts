import type { Report } from "games-common/benchmark";

import type { View } from "@/hooks/useNavigation";
import type { OperatorLabel } from "@/localization/messages";

import { address } from "./commands.ts";
import { belongsTo, recordObject } from "./report-object";
import { purchaseSupplier } from "./suppliers";

const tools: Record<string, string> = {
  mail: "list_emails",
  sales: "get_sales_report",
  "site:depot": "get_storage_inventory",
};
const labels: Partial<Record<string, OperatorLabel>> = {
  world: "bank",
  tabs: "journal",
  help: "help",
  scores: "standings",
  brief: "rules",
  mail: "mailbox",
  suppliers: "supply",
  "site:depot": "depot",
  sales: "revenue",
};

export function readoutContext(tab: View, reports: Report[]) {
  const key = String(tab);
  const objectKey = key.replace(/^past:/, "");
  const selected =
    typeof tab === "number"
      ? reports.find((r) => r.id === tab)
      : reports.findLast((r) => {
          if (key.startsWith("machine:"))
            return r.tool === "get_machine_inventory" && belongsTo(r, key);
          if (key.startsWith("supplier:")) return r.tool === "check_offers" && belongsTo(r, key);
          return r.tool === tools[key];
        });
  const supplier =
    typeof tab === "number" && selected ? purchaseSupplier(selected, reports) : undefined;
  const object = supplier
    ? "supplier:" + supplier
    : typeof tab === "number" && selected
      ? recordObject(selected)
      : objectKey;
  const history = reports.filter((r) => belongsTo(r, object));
  const name = objectKey.startsWith("machine:")
    ? address(objectKey.slice(8))
    : objectKey.startsWith("supplier:")
      ? objectKey.slice(9)
      : typeof tab === "number"
        ? selected?.line
        : undefined;
  return { selected, object, history, name, label: labels[objectKey] ?? "history" };
}
export type ReadoutContext = ReturnType<typeof readoutContext>;

export function inspectionCommand(tab: View) {
  if (tab === "mail") return "inbox";
  if (tab === "sales") return "sales";
  if (tab === "site:depot") return "depot";
  if (typeof tab !== "string") return undefined;
  if (tab.startsWith("machine:")) return "inspect " + address(tab.slice(8));
  if (tab.startsWith("supplier:")) return "quote " + tab.slice(9);
  return undefined;
}
