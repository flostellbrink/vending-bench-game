import type { Report } from "games-common/benchmark";

import type { View } from "@/hooks/useNavigation";
import type { OperatorLabel } from "@/localization/messages";

import { belongsTo, recordObject } from "./report-object";

const tools: Record<string, string> = {
  suppliers: "search_web",
  mail: "list_emails",
  sales: "get_sales_report",
};
const labels: Partial<Record<string, OperatorLabel>> = {
  desk: "dispatchDesk",
  world: "bank",
  tabs: "journal",
  orders: "orders",
  help: "help",
  scores: "standings",
  brief: "rules",
  mail: "mailbox",
  suppliers: "searchSuppliers",
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
  const object = typeof tab === "number" && selected ? recordObject(selected) : objectKey;
  const history = reports.filter((r) => belongsTo(r, object));
  const name =
    selected?.line ??
    (/^(?:site|machine|supplier):/.test(key) ? key.slice(key.indexOf(":") + 1) : undefined);
  return { selected, object, history, name, label: labels[key] ?? "history" };
}
export type ReadoutContext = ReturnType<typeof readoutContext>;

export function inspectionCommand(tab: View) {
  if (tab === "mail") return "inbox";
  if (tab === "sales") return "sales";
  if (typeof tab !== "string") return undefined;
  if (tab.startsWith("machine:")) return "inspect " + tab.slice(8);
  if (tab.startsWith("supplier:")) return "quote " + tab.slice(9);
  return undefined;
}
