"use client";
import type { Release } from "games-common/benchmark";

import { redirect, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Lang } from "@/localization/messages";

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
  if (!release) redirect("/" + lang + "/");
  if (slot === "new") return <OpenNewRun lang={lang} release={release} />;
  return <SavedRun lang={lang} release={release} slot={slot} />;
}

function OpenNewRun({ lang, release }: { lang: Lang; release: Release }) {
  const started = useRef(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Commit a new slot only after navigation; merely loading the setup must not write a save.
    void Promise.resolve()
      .then(() => {
        const slot = createRun(localStorage, release);
        location.replace(
          "/" + lang + "/run/?" + new URLSearchParams({ bench: release.revision, slot }),
        );
      })
      .catch(() => setFailed(true));
  }, [release, lang]);
  return (
    <main className="run-loading">
      {failed ? (
        <p role="alert">
          {msg.session.unavailable({}, { locale: lang })}{" "}
          <a href={"/" + lang + "/"}>{msg.session.choose({}, { locale: lang })}</a>
        </p>
      ) : (
        "VENDIX/OS"
      )}
    </main>
  );
}

function SavedRun({ lang, release, slot }: { lang: Lang; release: Release; slot: string }) {
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
  if (index < 0) redirect("/" + lang + "/");
  const parentId = slots[index]?.parent?.slot;
  const parentIndex = slots.findIndex((run) => run.id === parentId);
  const parent = slots[parentIndex];
  return (
    <Station
      key={release.revision + ":" + slot}
      release={release}
      slot={slot}
      runNumber={index + 1}
      newRun={slots[index]?.moves === 0 && !parentId}
      parentBalance={
        parent && !parent.damaged && parent.cash !== null
          ? { run: parentIndex + 1, values: recordedClosings(parent) }
          : undefined
      }
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
