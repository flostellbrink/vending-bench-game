import type { Report } from "games-common/benchmark";
export function recordObject(report: Report): string {
  const { tool, args } = report;
  if (args.slot) return "machine:" + args.slot.split(":").slice(0, 2).join(":");
  if (args.machine_id) return "machine:" + args.machine_id;
  if (args.supplier_id) return "supplier:" + args.supplier_id;
  if (tool === "get_storage_inventory") return "site:depot";
  if (tool === "search_web") return "suppliers";
  if (["list_emails", "read_email", "send_email"].includes(tool)) return "mail";
  if (tool === "get_sales_report") return "sales";
  return "world";
}

export function belongsTo(report: Report, object: string): boolean {
  if (object === "world") return report.openingCash !== report.closingCash;
  if (object === "orders")
    return (
      Boolean(report.terms && "order" in report.terms) ||
      report.notices.some((s) => s.startsWith("Delivery "))
    );
  if (object === "suppliers") return report.tool === "search_web";
  if (
    object.startsWith("machine:") &&
    report.tool === "get_machine_inventory" &&
    !report.args.machine_id
  )
    return report.rows.some((row) => String(row[0]).startsWith(object.slice(8) + ":"));
  return recordObject(report) === object;
}
