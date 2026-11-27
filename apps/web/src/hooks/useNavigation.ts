import type { Move } from "games-common/benchmark";

import { hasAny, type Optional } from "games-common/language";
import { useCallback, useState } from "react";

import { moveDestination } from "@/game/commands.ts";
import { enterReadout, type View } from "@/game/readout-path.ts";
export type { View } from "@/game/readout-path.ts";
export function useNavigation(initialView: View) {
  const [path, setPath] = useState<View[]>([initialView]);
  const tab = path.at(-1) ?? initialView;
  const [sceneObject, setSceneObject] = useState<Optional<string>>(null);
  const [balanceDay, setBalanceDay] = useState<Optional<number>>(null);
  const rememberObject = useCallback((id: string) => {
    if (id.startsWith("machine:") || id === "site:depot") {
      setSceneObject(id);
    }
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
    if (hasAny(destination)) {
      setSceneObject(destination);
    }
  }
  return {
    balanceDay,
    followMove,
    leaveDetail,
    openObject,
    path,
    rememberObject,
    sceneObject,
    setBalanceDay,
    setTab,
    showResult,
    tab,
  };
}
export type Navigation = ReturnType<typeof useNavigation>;
