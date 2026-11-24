import { createContext, useContext, useState, type ReactNode } from "react";

import type { OrderLine } from "@/game/order-entry";

interface OrderDraft {
  lines: OrderLine[];
  submittedId?: number;
}
const Drafts = createContext<{
  quantities: Record<string, string>;
  setQuantity: (key: string, value: string) => void;
  orders: Record<string, OrderDraft>;
  setOrder: (supplier: string, draft: OrderDraft) => void;
} | null>(null);
export function QuoteDrafts({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, OrderDraft>>({});
  return (
    <Drafts.Provider
      value={{
        quantities,
        orders,
        setQuantity: (key, value) => setQuantities((prev) => ({ ...prev, [key]: value })),
        setOrder: (supplier, draft) => setOrders((prev) => ({ ...prev, [supplier]: draft })),
      }}
    >
      {children}
    </Drafts.Provider>
  );
}
function useDrafts() {
  const drafts = useContext(Drafts);
  if (!drafts) throw Error("Order slip requires a workstation");
  return drafts;
}
export function useQuoteQuantity(key: string | number, initial?: number) {
  const drafts = useDrafts();
  return {
    qty: drafts.quantities[String(key)] ?? String(initial ?? ""),
    change: (value: string) => drafts.setQuantity(String(key), value),
  };
}
export function useOrderDraft(supplier: string) {
  const drafts = useDrafts();
  const key = "supplier:" + supplier;
  const draft = drafts.orders[key] ?? {
    lines: [{ key: "manual", product: "", quantity: "", manual: true }],
  };
  return { draft, save: (value: OrderDraft) => drafts.setOrder(key, value) };
}
