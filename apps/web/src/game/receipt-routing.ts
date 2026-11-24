import type { Report } from "games-common/benchmark";
export type GuiResponse = "dialog" | "inline";
export type ResponseDestination = GuiResponse | "console";

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

/** Read receipts use the compact preview rather than the terminal's write acknowledgment. */
export function isReadReceipt(report: Pick<Report, "tool">): boolean {
  return reads.has(report.tool);
}
