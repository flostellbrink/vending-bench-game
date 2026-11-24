"use client";
import type { Release, Rival } from "games-common/benchmark";

import { useEffect, useId, useState } from "react";

import { msg } from "@/dictionary";
import { loadRival } from "@/game/rival-balances";
import {
  forkRun,
  forkScriptedRun,
  listRuns,
  runKey,
  scriptedSlot,
  readSlotSnapshot,
  slotSnapshot,
  withRunLock,
} from "@/game/runs";
import { unavailable, useStoredText } from "@/hooks/useSessionStorage";

import SaveTree from "./SaveTree";
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
  const script = release.rivals.find((r) => r.kind === "script" && (r.balances || r.values));
  const [loaded, setLoaded] = useState<{ script: Rival; values?: number[] }>();
  useEffect(() => {
    if (!script || script.values) return undefined;
    const request = new AbortController();
    void loadRival(script, request.signal)
      .then((data) => {
        if (!request.signal.aborted) setLoaded({ script, values: data.values });
      })
      .catch(() => {});
    return () => request.abort();
  }, [script]);
  const closings =
    (script?.values ?? (loaded && loaded.script === script ? loaded.values : undefined))?.slice(
      1,
      release.days + 1,
    ) ?? [];
  const snapshot = useStoredText(() => slotSnapshot(localStorage, release));
  const runs = typeof snapshot === "string" ? readSlotSnapshot(snapshot) : [];
  const [problem, setProblem] = useState(false),
    [sending, setSending] = useState(false);
  const newForm = useId();
  const resume = (id: string) =>
    "run/?" + new URLSearchParams({ bench: release.revision, slot: id });
  async function branch(id: string, startDay: number) {
    if (sending || typeof snapshot !== "string") return;
    setSending(true);
    try {
      const child = await withRunLock(runKey(release) + ":fork:" + id + ":" + startDay, () => {
        const existing = listRuns(localStorage, release)
          .filter(
            (run) =>
              !run.damaged &&
              !run.finished &&
              run.day === startDay &&
              run.checkpoints.some(
                (point) => point.day === startDay && point.moveCount === run.moves,
              ) &&
              (run.id === id || (run.parent?.slot === id && run.parent.day === startDay)),
          )
          .toSorted(
            (a, b) =>
              Number(b.id === slot) - Number(a.id === slot) ||
              (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0),
          )[0];
        if (existing) return existing.id;
        return id === scriptedSlot
          ? forkScriptedRun(localStorage, release, startDay)
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
          {msg.session.version()} {release.id} · {msg.session.seed()} {release.seed}
        </small>
      </header>
      {snapshot === unavailable ? (
        <p role="alert">{msg.session.unavailable()}</p>
      ) : (
        <SaveTree
          key={release.revision + ":" + (slot ?? "latest") + ":" + (day ?? "tip")}
          release={release}
          slots={runs}
          closings={closings}

          activeSlot={slot}
          initialDay={day}
          newForm={newForm}
          disabled={sending || typeof snapshot !== "string"}
          branch={branch}
        />
      )}
      {problem && <p role="alert">{msg.session.branchFailed()}</p>}
      <div className="save-console-actions">
        <form id={newForm} action="run/" method="get">
          <input type="hidden" name="bench" value={release.revision} />
          <input type="hidden" name="slot" value="new" />
        </form>
      </div>
    </section>
  );
}
