"use client";
import type { Release } from "games-common/benchmark";

import { redirect, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { msg } from "@/dictionary";
import { releases } from "@/game/releases";
import {
  createRun,
  isSlotId,
  legacySlot,
  readSlotSnapshot,
  recordedClosings,
  slotSnapshot,
} from "@/game/runs";

import { Station } from "./Station";
export default function Game() {
  return (
    <Suspense fallback={<main className="run-loading">VENDIX/OS</main>}>
      <ActiveRun />
    </Suspense>
  );
}

function ActiveRun() {
  const query = useSearchParams();
  const revision = query.get("bench");
  const slot = query.get("slot") ?? legacySlot;
  const release = releases.find((entry) => entry.revision === revision);
  if (!release) redirect("../");
  if (slot === "new") return <OpenNewRun release={release} />;
  return <SavedRun release={release} slot={slot} />;
}

function OpenNewRun({ release }: { release: Release }) {
  const started = useRef(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Commit a new slot only after navigation; merely loading the setup must not write a save.
    void Promise.resolve()
      .then(() => {
        const slot = createRun(localStorage, release);
        window.history.replaceState(
          null,
          "",
          "?" + new URLSearchParams({ bench: release.revision, slot }),
        );
      })
      .catch(() => setFailed(true));
  }, [release]);
  return (
    <main className="run-loading">
      {failed ? (
        <p role="alert">
          {msg.session.unavailable()} <a href="../">{msg.session.choose()}</a>
        </p>
      ) : (
        "VENDIX/OS"
      )}
    </main>
  );
}

function SavedRun({ release, slot }: { release: Release; slot: string }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      if (!isSlotId(slot)) return "[]";
      try {
        return slotSnapshot(localStorage, release);
      } catch {
        return "[]";
      }
    },
    () => undefined,
  );
  if (snapshot === undefined) return <main className="run-loading">VENDIX/OS</main>;
  const slots = readSlotSnapshot(snapshot);
  const index = slots.findIndex((run) => run.id === slot);
  if (index < 0) redirect("../");
  const parentId = slots[index]?.parent?.slot;
  const parentIndex = slots.findIndex((run) => run.id === parentId);
  const parent = slots[parentIndex];
  return (
    <Station
      key={release.revision + ":" + slot}
      release={release}
      slot={slot}
      newRun={slots[index]?.moves === 0 && !parentId}
      parentBalance={
        parent && !parent.damaged && parent.cash !== null
          ? { values: recordedClosings(parent) }
          : undefined
      }

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
