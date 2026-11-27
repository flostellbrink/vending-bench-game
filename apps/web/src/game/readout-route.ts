import type { Report } from "games-common/benchmark";

import type { View } from "@/hooks/useNavigation.ts";

import { msg } from "@/dictionary/index.ts";

import { address } from "./commands.ts";
import { belongsTo, recordObject } from "./report-object.ts";
import { purchaseSupplier } from "./suppliers.ts";

const machinePrefix = "machine:";
const supplierPrefix = "supplier:";

const tools: Record<string, string> = {
  mail: "list_emails",
  sales: "get_sales_report",
  "site:depot": "get_storage_inventory",
};
const labels: Partial<Record<string, typeof msg.operator.history>> = {
  brief: msg.operator.rules,
  help: msg.operator.help,
  machines: msg.operator.allMachines,
  mail: msg.operator.mailbox,
  marketing: msg.operator.marketing,
  notes: msg.operator.notes,
  payments: msg.operator.payments,
  reminders: msg.operator.reminders,
  sales: msg.operator.revenue,
  scores: msg.operator.standings,
  "site:depot": msg.operator.depot,
  status: msg.operator.status,
  suppliers: msg.operator.supply,
  world: msg.operator.bank,
};

function selectedObject(tab: View, objectKey: string, reports: Report[], selected?: Report) {
  if (typeof tab !== "number" || !selected) {
    return objectKey;
  }
  const supplier = purchaseSupplier(selected, reports);
  return supplier ? `${supplierPrefix}${supplier}` : recordObject(selected);
}

function readoutName(tab: View, objectKey: string, selected?: Report) {
  if (objectKey.startsWith(machinePrefix)) {
    return address(objectKey.slice(machinePrefix.length));
  }
  if (objectKey.startsWith(supplierPrefix)) {
    return objectKey.slice(supplierPrefix.length);
  }
  return typeof tab === "number" ? selected?.line : undefined;
}

export function readoutContext(tab: View, reports: Report[]) {
  const key = String(tab);
  const objectKey = key.replace(/^past:/, "");
  const selected =
    typeof tab === "number"
      ? reports.find((r) => r.id === tab)
      : reports.findLast((r) => {
          if (key.startsWith(machinePrefix)) {
            return r.tool === "get_machine_inventory" && belongsTo(r, key);
          }
          if (key.startsWith(supplierPrefix)) {
            return r.tool === "check_offers" && belongsTo(r, key);
          }
          return r.tool === tools[key];
        });
  const object = selectedObject(tab, objectKey, reports, selected);
  const history = reports.filter(
    (r) =>
      belongsTo(r, object) ||
      (object.startsWith(supplierPrefix) &&
        r.tool === "send_email" &&
        purchaseSupplier(r, reports) === object.slice(supplierPrefix.length)),
  );
  const name = readoutName(tab, objectKey, selected);
  return { history, label: labels[objectKey] ?? msg.operator.history, name, object, selected };
}
export type ReadoutContext = ReturnType<typeof readoutContext>;

export function inspectionCommand(tab: View) {
  if (tab === "mail") {
    return "list_emails";
  }
  if (tab === "sales") {
    return "get_sales_report";
  }
  if (tab === "site:depot") {
    return "get_storage_inventory";
  }
  if (typeof tab !== "string") {
    return undefined;
  }
  if (tab.startsWith(machinePrefix)) {
    return "get_machine_inventory";
  }
  return undefined;
}
