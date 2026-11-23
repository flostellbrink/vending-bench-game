"use client";
import { redirect, useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";

import type { Lang } from "@/localization/messages";

import { releases } from "@/game/releases";
import { isSlotId, legacySlot, runKey } from "@/game/runs";

import { Station } from "./Station";
export default function Game({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={<main className="run-loading">VENDIX/OS</main>}>
      <ActiveRun lang={lang} />
    </Suspense>
  );
}

function ActiveRun({ lang }: { lang: Lang }) {
  const query = useSearchParams();
  const revision = query.get("bench");
  const slot = query.get("slot") ?? legacySlot;
  const release = releases.find((entry) => entry.revision === revision);
  const exists = useSyncExternalStore(
    subscribe,
    () => {
      if (!release || !isSlotId(slot)) return false;
      try {
        return localStorage.getItem(runKey(release, slot)) !== null;
      } catch {
        return false;
      }
    },
    () => undefined,
  );
  if (exists === undefined) return <main className="run-loading">VENDIX/OS</main>;
  if (!release || !exists) redirect("/" + lang + "/");
  return (
    <Station
      key={release.revision + ":" + slot}
      release={release}
      slot={slot}
      lang={lang}
      changeLang={(l) => {
        localStorage.language = l;
        window.location.assign("/" + l + "/run/" + location.search + location.hash);
      }}
    />
  );
}

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  return () => window.removeEventListener("storage", update);
}
