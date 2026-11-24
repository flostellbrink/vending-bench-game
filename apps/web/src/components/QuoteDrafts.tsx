import { createContext, useContext, useState, type ReactNode } from "react";

interface QuoteDraft {
  selection: string[];
  quantity: string;
  submittedId?: number;
}

const Drafts = createContext<{
  values: Record<number, QuoteDraft>;
  save: (receipt: number, draft: QuoteDraft) => void;
} | null>(null);

export function QuoteDrafts({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<number, QuoteDraft>>({});
  function save(receipt: number, draft: QuoteDraft) {
    setValues((previous) => ({ ...previous, [receipt]: draft }));
  }
  return <Drafts.Provider value={{ values, save }}>{children}</Drafts.Provider>;
}

export function useQuoteDraft(receipt: number, quantity: number) {
  const store = useContext(Drafts);
  if (!store) throw Error("Order slip requires a workstation");
  const draft = store.values[receipt] ?? { selection: [], quantity: String(quantity) };
  return { draft, save: store.save };
}
