"use client";

import {
  parseWorkerReply,
  type Actions,
  type Entry,
  type PersonalBest,
  type Release,
  type Report,
  type Rival,
  type Snapshot,
  type WorkerReply,
  type WorkerRequest,
} from "games-common/benchmark";
import { errorToString } from "games-common/language";
import { useCallback, useEffect, useRef, useState } from "react";
import * as v from "valibot";

import { opensInstrument } from "@/game/receipt-routing";
import { observation } from "@/game/reports";
import {
  recordKey,
  runKey,
  readRecord,
  readRun,
  runTimeline,
  saveRun,
  withRunLock,
  type RunTimeline,
} from "@/game/runs";

export interface LocalLine {
  id: string;
  line: string;
  day: number;
  minute: number;
  localText: string;
}
export type LogLine = Report | LocalLine;
type BootStage = "runtime" | "mount" | "ready";
type SaveIssue = "" | "saveConflict" | "saveFailed";
type View = number | "scores" | "desk";
type SimulatorResult = Extract<WorkerReply, { state: Snapshot }>;

interface RunView {
  revision: string;
  journal: Entry[];
  state: Snapshot | null;
  actions: Actions;
  reports: Report[];
  lines: LogLine[];
  history: number[];
  best: PersonalBest | null;
  busy: boolean;
  error: string;
  boot: BootStage[] | null;
}

function initialView(): RunView {
  return {
    revision: "",
    journal: [],
    state: null,
    actions: {},
    reports: [],
    lines: [],
    history: [],
    best: null,
    busy: true,
    error: "",
    boot: null,
  };
}

function post(worker: Worker, request: WorkerRequest) {
  worker.postMessage(request);
}

async function loadRivals(release: Release, signal: AbortSignal): Promise<Rival[]> {
  return Promise.all(
    release.rivals.map(async (rival) => {
      if (!rival.balances) return rival;
      const response = await fetch("/" + rival.balances, { signal });
      if (!response.ok) throw Error("Reference data unavailable");
      return { ...rival, values: v.parse(v.array(v.number()), await response.json()) };
    }),
  );
}

async function recordScore(key: string, state: Snapshot, values: number[]) {
  if (!state.over || state.failed || values.length !== state.days + 1) return;
  if (!state.final) throw Error("Completed run is missing its final score");
  const score = state.final.reward;
  await withRunLock(key, () => {
    const previous = readRecord(localStorage.getItem(key));
    if (!previous || score > previous.score)
      localStorage.setItem(key, JSON.stringify({ score, values }));
  });
}

function reportsFor(data: SimulatorResult, entries: Entry[], offset: number): Report[] {
  if (data.receipts.length !== entries.length)
    throw Error("Simulator returned a different receipt count");
  return data.receipts.map((receipt, i) => {
    const entry = entries[i];
    if (!entry) throw Error("Simulator returned a receipt without a command");
    return observation(receipt, entry.move, offset + i + 1, entry.line);
  });
}

/** Keeps the selected run's simulator, journal and comparison record in sync. */
export function useRun(release: Release, slot: string, onView: (id: View) => void) {
  const [storedView, setView] = useState<RunView>(initialView);
  const view = storedView.revision === release.revision ? storedView : initialView();
  const [rivalResult, setRivals] = useState<{ revision: string; rivals: Rival[] } | null>(null);
  const rivals = rivalResult?.revision === release.revision ? rivalResult.rivals : [];
  const [saveIssue, setSaveIssue] = useState<SaveIssue>("");
  const [epoch, retry] = useState(0);
  const worker = useRef<Worker | null>(null);
  const pending = useRef<{ entry: Entry; keepInstrument: boolean } | null>(null);
  const saveKey = runKey(release, slot);
  const bestKey = recordKey(release);
  const setError = useCallback((error: string) => setView((old) => ({ ...old, error })), []);
  const clearSaveIssue = useCallback(() => setSaveIssue(""), []);

  useEffect(() => {
    const current = new Worker("/worker.js");
    worker.current = current;
    const abort = new AbortController();
    let serialized: string | null = null,
      opponent: PersonalBest | null = null,
      balances: number[] = [];
    let first = false;
    let entries: Entry[] = [];
    let timeline: RunTimeline | undefined;
    pending.current = null;

    const fail = (error: unknown) => {
      if (abort.signal.aborted) return;
      pending.current = null;
      setView((old) => ({
        ...(old.revision === release.revision ? old : initialView()),
        revision: release.revision,
        busy: false,
        error: errorToString(error),
      }));
    };

    function replay() {
      first = !localStorage.getItem("vendix.booted");
      serialized = localStorage.getItem(saveKey);
      if (serialized === null) throw Error("Saved run not found");
      const saved = readRun(serialized, readRecord(localStorage.getItem(bestKey)));
      opponent = saved.opponent;
      entries = saved.moves;
      timeline = saved.timeline;
      balances = [];
      pending.current = null;
      post(current, { release, moves: entries.map((e) => e.move) });
    }

    async function accept(data: SimulatorResult) {
      const request = pending.current;
      const entry = request?.entry;
      const reports = reportsFor(data, entry ? [entry] : entries, entry ? entries.length : 0);
      const previousTimeline = timeline;
      timeline = runTimeline(release, data.receipts, data.state.over, entry ? timeline : undefined);
      balances = entry ? [...balances, ...data.history.slice(1)] : data.history;
      if (entry) {
        const next = [...entries, entry];
        try {
          serialized = await withRunLock(saveKey, () =>
            saveRun(localStorage, saveKey, serialized, next, opponent, data.state.over, timeline),
          );
        } catch (error) {
          if (abort.signal.aborted) return;
          setSaveIssue(
            error instanceof Error && error.message === "changed" ? "saveConflict" : "saveFailed",
          );
          retry((n) => n + 1);
          setView({ ...initialView(), revision: release.revision });
          onView("desk");
          replay();
          return;
        }
        if (abort.signal.aborted) return;
        entries = next;
      } else {
        if (!previousTimeline && serialized !== null) {
          try {
            serialized = await withRunLock(saveKey, () =>
              saveRun(
                localStorage,
                saveKey,
                serialized,
                entries,
                opponent,
                data.state.over,
                timeline,
              ),
            );
          } catch (error) {
            if (abort.signal.aborted) return;
            if (error instanceof Error && error.message === "changed") {
              replay();
              return;
            }
            setSaveIssue("saveFailed");
          }
        }
        if (first) localStorage.setItem("vendix.booted", "1");
      }
      if (data.state.over) {
        try {
          await recordScore(bestKey, data.state, balances);
        } catch {
          if (!abort.signal.aborted) setSaveIssue("saveFailed");
        }
      }
      if (abort.signal.aborted) return;
      pending.current = null;
      setView((old) => ({
        ...old,
        revision: release.revision,
        journal: entries,
        best: opponent,
        state: data.state,
        actions: data.actions,
        history: balances,
        busy: false,
        reports: entry ? [...old.reports, ...reports] : reports,
        lines: entry ? [...old.lines, ...reports] : reports,
        boot: !entry ? (first ? [...(old.boot ?? []), "ready"] : null) : old.boot,
      }));
      if (data.state.over) onView("scores");
      else if (request && !request.keepInstrument && reports[0] && opensInstrument(reports[0]))
        onView(reports[0].id);
    }

    current.addEventListener("error", (e) => fail(e.message), { signal: abort.signal });
    current.addEventListener(
      "message",
      async (event: MessageEvent<unknown>) => {
        if (abort.signal.aborted) return;
        try {
          const data = parseWorkerReply(event.data);
          if ("error" in data) {
            fail(data.error);
            return;
          }
          if ("boot" in data) {
            if (first)
              setView((old) => {
                const active = old.revision === release.revision ? old : initialView();
                return {
                  ...active,
                  revision: release.revision,
                  boot: [...(active.boot ?? []), data.boot],
                };
              });
            return;
          }
          await accept(data);
        } catch (error) {
          fail(error);
        }
      },
      { signal: abort.signal },
    );

    try {
      replay();
    } catch (error) {
      fail(error);
    }
    return () => {
      abort.abort();
      worker.current = null;
      current.terminate();
    };
  }, [release, saveKey, bestKey, onView]);

  useEffect(() => {
    const abort = new AbortController();
    loadRivals(release, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setRivals({ revision: release.revision, rivals: data });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setError(errorToString(error));
      });
    return () => abort.abort();
  }, [release, setError]);

  function submit(entry: Entry, keepInstrument = false): boolean {
    if (view.busy || !view.state || view.state.over || pending.current || !worker.current)
      return false;
    pending.current = { entry, keepInstrument };
    clearSaveIssue();
    setView((old) => ({ ...old, busy: true, error: "" }));
    post(worker.current, { moves: [entry.move] });
    return true;
  }
  function appendLocal(line: string, localText: string) {
    setView((old) =>
      !old.state
        ? old
        : {
            ...old,
            lines: [
              ...old.lines,
              {
                id: "help-" + old.lines.length,
                line,
                localText,
                day: old.state.day,
                minute: old.state.minute,
              },
            ],
          },
    );
  }
  return { ...view, rivals, saveIssue, epoch, submit, appendLocal, setError, clearSaveIssue };
}
