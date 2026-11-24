import type { Move } from "games-common/benchmark";

import { useCallback, useState } from "react";

import { moveDestination } from "@/game/commands";
import { enterReadout, type View } from "@/game/readout-path";
export type { View } from "@/game/readout-path";
export function useNavigation(initialView: View) {
  const [path, setPath] = useState<View[]>([initialView]);
  const tab = path.at(-1) ?? initialView;
  const [sceneObject, setSceneObject] = useState<string | null>(null);
  const [balanceDay, setBalanceDay] = useState<number | null>(null);
  const rememberObject = useCallback((id: string) => {
    if (id.startsWith("machine:") || id === "site:depot") setSceneObject(id);
  }, []);
  const setTab = useCallback((next: View) => {
    setPath((current) => enterReadout(current, next));
  }, []);
  const showResult = useCallback((next: View) => {
    setPath((current) => enterReadout(current, next, true));
  }, []);
  const leaveDetail = useCallback(() => {
    setPath((current) => (current.length > 1 ? current.slice(0, -1) : current));
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
    path,
    leaveDetail,
    setTab,
    showResult,
    sceneObject,
    rememberObject,
    followMove,
    openObject,
    balanceDay,
    setBalanceDay,
  };
}
export type Navigation = ReturnType<typeof useNavigation>;
