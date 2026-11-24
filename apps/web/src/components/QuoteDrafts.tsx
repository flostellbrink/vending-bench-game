import { createContext, useContext, useState, type ReactNode } from "react";

interface QuoteDraft {
  selection: string[];
  quantity: string;
  submittedId?: number;
}

const Drafts = createContext<{
  values: Record<string, QuoteDraft>;
  save: (key: string | number, draft: QuoteDraft) => void;
} | null>(null);

export function QuoteDrafts({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, QuoteDraft>>({});
  function save(key: string | number, draft: QuoteDraft) {
    setValues((previous) => ({ ...previous, [key]: draft }));
  }
  return <Drafts.Provider value={{ values, save }}>{children}</Drafts.Provider>;
}

export function useQuoteDraft(key: string | number, quantity: number | undefined) {
  const store = useContext(Drafts);
  if (!store) throw Error("Order slip requires a workstation");
  const draft = store.values[key] ?? {
    selection: [],
    quantity: quantity === undefined ? "" : String(quantity),
  };
  return { draft, save: store.save };
}
