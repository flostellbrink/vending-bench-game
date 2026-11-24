import type { Report } from "games-common/benchmark";

import type { View } from "@/hooks/useNavigation";

import { msg } from "@/dictionary";

import { address } from "./commands.ts";
import { belongsTo, recordObject } from "./report-object";
import { purchaseSupplier } from "./suppliers";

const tools: Record<string, string> = {
  mail: "list_emails",
  sales: "get_sales_report",
  "site:depot": "get_storage_inventory",
};
const labels: Partial<Record<string, typeof msg.operator.history>> = {
  world: msg.operator.bank,
  status: msg.operator.status,
  payments: msg.operator.payments,
  machines: msg.operator.allMachines,
  marketing: msg.operator.marketing,
  notes: msg.operator.notes,
  reminders: msg.operator.reminders,
  help: msg.operator.help,
  scores: msg.operator.standings,
  brief: msg.operator.rules,
  mail: msg.operator.mailbox,
  suppliers: msg.operator.supply,
  "site:depot": msg.operator.depot,
  sales: msg.operator.revenue,
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
  const history = reports.filter(
    (r) =>
      belongsTo(r, object) ||
      (object.startsWith("supplier:") &&
        r.tool === "send_email" &&
        purchaseSupplier(r, reports) === object.slice(9)),
  );
  const name = objectKey.startsWith("machine:")
    ? address(objectKey.slice(8))
    : objectKey.startsWith("supplier:")
      ? objectKey.slice(9)
      : typeof tab === "number"
        ? selected?.line
        : undefined;
  return { selected, object, history, name, label: labels[objectKey] ?? msg.operator.history };
}
export type ReadoutContext = ReturnType<typeof readoutContext>;

export function inspectionCommand(tab: View) {
  if (tab === "mail") return "list_emails";
  if (tab === "sales") return "get_sales_report";
  if (tab === "site:depot") return "get_storage_inventory";
  if (typeof tab !== "string") return undefined;
  if (tab.startsWith("machine:")) return "get_machine_inventory";
  return undefined;
}
