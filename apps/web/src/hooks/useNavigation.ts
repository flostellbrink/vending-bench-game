import type { Move } from "games-common/benchmark";

import { useCallback, useRef, useState } from "react";

import { moveDestination } from "@/game/commands";
export type View = string | number;
export function useNavigation(initialView: View) {
  const [tab, setView] = useState<View>(initialView);
  const current = useRef<View>(initialView),
    history = useRef<View[]>([]);
  const [sceneObject, setSceneObject] = useState<string | null>(null);
  const [balanceDay, setBalanceDay] = useState<number | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const rememberObject = useCallback((id: string) => {
    if (id.startsWith("machine:") || id === "site:depot") setSceneObject(id);
  }, []);
  const setTab = useCallback((next: View) => {
    const id = next === "desk" || next === "orders" ? "suppliers" : next;
    if (current.current === id) return;
    history.current.push(current.current);
    setCanGoBack(true);
    current.current = id;
    setView(id);
  }, []);
  function back() {
    const id = history.current.pop();
    if (id === undefined) return;
    setCanGoBack(history.current.length > 0);
    current.current = id;
    setView(id);
  }
  const openObject = useCallback(
    (id: string) => {
      rememberObject(id);
      setTab(id);
    },
    [setTab, rememberObject],
  );
  function followMove(move: Move) {
    const destination = moveDestination(move);
    if (destination) setSceneObject(destination);
  }
  return {
    tab,
    canGoBack,
    setTab,
    back,
    sceneObject,
    rememberObject,
    followMove,
    openObject,
    balanceDay,
    setBalanceDay,
  };
}
export type Navigation = ReturnType<typeof useNavigation>;
