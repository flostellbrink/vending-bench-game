"use client";
import type { Release } from "games-common/benchmark";

import { useLocale } from "games-localize/react";
import { useId, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import {
  existingBranch,
  forkReferenceRun,
  forkRun,
  isReferenceSlot,
  listRuns,
  referenceRuns,
  runKey,
  readSlotSnapshot,
  slotSnapshot,
  withRunLock,
} from "@/game/runs.ts";
import { unavailable, useStoredText } from "@/hooks/useSessionStorage.ts";

import SaveTree from "./SaveTree.tsx";
import "./save-tree.css";

export function SaveLibrarySection({
  release,
  slot,
  day,
}: {
  release: Release;

  slot?: string;
  day?: number;
}) {
  const snapshot = useStoredText(() => slotSnapshot(localStorage, release));
  const runs = typeof snapshot === "string" ? readSlotSnapshot(snapshot) : [];
  const [problem, setProblem] = useState(false);
  const [sending, setSending] = useState(false);
  const newForm = useId();
  const locale = useLocale();
  const resume = (id: string) => `/${locale}/run?${new URLSearchParams({ slot: id })}`;
  async function branch(id: string, startDay: number) {
    if (sending || typeof snapshot !== "string") {
      return;
    }
    setSending(true);
    try {
      const child = await withRunLock(`${runKey(release)}:fork:${id}:${startDay}`, () => {
        const existing = existingBranch(listRuns(localStorage, release), release, {
          day: startDay,
          preferred: slot,
          source: id,
        });
        if (existing) {
          return existing.id;
        }
        return isReferenceSlot(id)
          ? forkReferenceRun(localStorage, release, id, startDay)
          : forkRun(localStorage, release, id, startDay);
      });
      location.assign(resume(child));
    } catch {
      setProblem(true);
      setSending(false);
    }
  }
  return (
    <section className="save-console embedded">
      <header>
        <div>
          <h2>{msg.session.saveTimeline()}</h2>
        </div>
        <small>
          {msg.session.version()} {release.version} · {msg.session.seed()} {release.seed}
        </small>
      </header>
      {snapshot === unavailable ? (
        <p role="alert">{msg.session.unavailable()}</p>
      ) : (
        <SaveTree
          key={`${slot ?? "latest"}:${day ?? "tip"}`}
          release={release}
          slots={runs}
          references={referenceRuns(release)}

          activeSlot={slot}
          initialDay={day}
          newForm={newForm}
          disabled={sending || typeof snapshot !== "string"}
          branch={branch}
        />
      )}
      {problem && <p role="alert">{msg.session.branchFailed()}</p>}
      <div className="save-console-actions">
        <form id={newForm} action={`/${locale}/run`} method="get">
          <input type="hidden" name="slot" value="new" />
        </form>
      </div>
    </section>
  );
}
