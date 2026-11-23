import type { Report } from "games-common/benchmark";

const reads = new Set([
  "search_web",
  "check_offers",
  "get_status",
  "get_storage_inventory",
  "get_machine_inventory",
  "get_sales_report",
  "get_marketing_report",
  "list_emails",
  "read_email",
  "read_notes",
  "list_reminders",
]);

/** An inspection opens its result. A write acknowledges the action without displacing the working document. */
export function opensInstrument(report: Pick<Report, "tool">): boolean {
  return reads.has(report.tool);
}
