import type { KnownOrder, Report } from "games-common/benchmark";

import { knownOrders } from "./reports.ts";

export interface ObservedSupplier {
  id: string;
  name: string;
  email?: string;
  quotable: boolean;
  orders: KnownOrder[];
}

export function purchaseSupplier(report: Report, reports: Report[]) {
  if (!report.terms?.order) return undefined;
  if (report.args.supplier_id) return report.args.supplier_id;
  const recipient = report.args.to;
  if (!recipient) return undefined;
  const email = recipient.toLowerCase();
  for (const prior of reports) {
    const contact = prior.directory.find((s) => s.email.toLowerCase() === email);
    if (contact) return contact.id;
  }
  return recipient;
}

export function observedSuppliers(reports: Report[]): ObservedSupplier[] {
  const suppliers = new Map<string, ObservedSupplier>();
  const addresses = new Map<string, string>();
  const receipts = new Map(reports.map((r) => [r.id, r]));
  for (const report of reports) {
    for (const contact of report.directory) {
      suppliers.set(contact.id, {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        quotable: true,
        orders: [],
      });
      addresses.set(contact.email.toLowerCase(), contact.id);
    }
  }
  for (const order of knownOrders(reports)) {
    if (!order.supplier) continue;
    const id = addresses.get(order.supplier.toLowerCase()) ?? order.supplier;
    const args = receipts.get(order.id)?.args;
    const supplier: ObservedSupplier = suppliers.get(id) ?? {
      id,
      name: id,
      email: args?.to,
      quotable: Boolean(args?.supplier_id),
      orders: [],
    };
    supplier.orders.push(order);
    suppliers.set(id, supplier);
  }
  return [...suppliers.values()];
}
