import { useCallback, useRef, useState } from "react";
export type View = string | number;
export function useNavigation(initialView: View) {
  const [tab, setView] = useState<View>(initialView);
  const current = useRef<View>(initialView),
    history = useRef<View[]>([]);
  const [site, setSite] = useState<string | null>(null);
  const [balanceDay, setBalanceDay] = useState<number | null>(null);
  const setTab = useCallback((id: View) => {
    if (current.current === id) return;
    if (id === "desk") history.current = [];
    else history.current.push(current.current);
    current.current = id;
    setView(id);
  }, []);
  function back() {
    const id = history.current.pop() ?? "desk";
    current.current = id;
    setView(id);
  }
  function openObject(id: string) {
    if (id.startsWith("machine:"))
      setSite(id.slice(8).toLowerCase().replace(/^ai-/, "").split(":")[0] ?? null);
    else if (id.startsWith("site:")) setSite(id.slice(5));
    setTab(id);
  }
  return { tab, setTab, back, site, setSite, openObject, balanceDay, setBalanceDay };
}
export type Navigation = ReturnType<typeof useNavigation>;
