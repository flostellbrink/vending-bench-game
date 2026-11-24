import type { Move } from "games-common/benchmark";

import { useCallback, useState } from "react";

import { moveDestination } from "@/game/commands";
export type View = string | number;
export function useNavigation(initialView: View) {
  const [tab, setView] = useState<View>(initialView);
  const [sceneObject, setSceneObject] = useState<string | null>(null);
  const [balanceDay, setBalanceDay] = useState<number | null>(null);
  const rememberObject = useCallback((id: string) => {
    if (id.startsWith("machine:") || id === "site:depot") setSceneObject(id);
  }, []);
  const setTab = useCallback((next: View) => {
    const id = next === "desk" || next === "orders" ? "suppliers" : next;
    setView(id);
  }, []);
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
    setTab,
    sceneObject,
    rememberObject,
    followMove,
    openObject,
    balanceDay,
    setBalanceDay,
  };
}
export type Navigation = ReturnType<typeof useNavigation>;
