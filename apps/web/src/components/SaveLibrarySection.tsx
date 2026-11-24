"use client";
import type { Release, Rival } from "games-common/benchmark";

import { useEffect, useId, useState } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { loadRival } from "@/game/rival-balances";
import {
  forkRun,
  forkScriptedRun,
  scriptedSlot,
  readSlotSnapshot,
  slotSnapshot,
} from "@/game/runs";
import { unavailable, useStoredText } from "@/hooks/useSessionStorage";

import SaveTree from "./SaveTree";
import "./save-tree.css";

export function SaveLibrarySection({
  release,
  lang,
  embedded = false,
  slot,
  day,
}: {
  release: Release;
  lang: Locale;
  embedded?: boolean;
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
  const options = { locale: lang };
  const newForm = useId();
  async function branch(id: string, startDay: number) {
    if (sending || typeof snapshot !== "string") return;
    setSending(true);
    try {
      const child =
        id === scriptedSlot
          ? await forkScriptedRun(localStorage, release, startDay)
          : forkRun(localStorage, release, id, startDay);
      location.assign(
        "/" + lang + "/run/?" + new URLSearchParams({ bench: release.revision, slot: child }),
      );
    } catch {
      setProblem(true);
      setSending(false);
    }
  }
  return (
    <section className={embedded ? "save-console embedded" : "save-console"}>
      <header>
        <div>
          {embedded ? (
            <h2>{msg.session.library({}, options)}</h2>
          ) : (
            <h1>{msg.session.library({}, options)}</h1>
          )}
          <p>{msg.session.saveTimeline({}, options)}</p>
        </div>
        <small>
          {msg.session.version({}, options)} {release.id} · {msg.session.seed({}, options)}{" "}
          {release.seed}
        </small>
      </header>
      {snapshot === unavailable ? (
        <p role="alert">{msg.session.unavailable({}, options)}</p>
      ) : (
        <SaveTree
          key={release.revision + ":" + (slot ?? "latest") + ":" + (day ?? "tip")}
          release={release}
          slots={runs}
          closings={closings}
          lang={lang}
          activeSlot={slot}
          initialDay={day}
          newForm={newForm}
          disabled={sending || typeof snapshot !== "string"}
          branch={branch}
        />
      )}
      {problem && <p role="alert">{msg.session.branchFailed({}, options)}</p>}
      <div className="save-console-actions">
        {!embedded && (
          <a
            href={
              "/" +
              lang +
              "/?" +
              new URLSearchParams({ bench: release.revision, ...(slot ? { slot } : {}) })
            }
          >
            {msg.session.back({}, options)}
          </a>
        )}
        <form id={newForm} action={"/" + lang + "/run/"} method="get">
          <input type="hidden" name="bench" value={release.revision} />
          <input type="hidden" name="slot" value="new" />
          {!runs.length && !closings.length && !embedded && (
            <button type="submit">{msg.session.again({}, options)}</button>
          )}
        </form>
      </div>
    </section>
  );
}
