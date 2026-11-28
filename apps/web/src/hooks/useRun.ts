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
import { errorToString, hasValue, type Optional } from "games-common/language";
import { useCallback, useEffect, useRef, useState } from "react";

import { shouldOpenReceipt, type ResponseDestination } from "@/game/receipt-routing.ts";
import { observation } from "@/game/reports.ts";
import { loadRival } from "@/game/rival-balances.ts";
import {
  isReferenceResult,
  recordKey,
  runKey,
  readRecord,
  readRun,
  runTimeline,
  saveRun,
  withRunLock,
  type RunTimeline,
} from "@/game/runs.ts";

interface LocalLine {
  id: string;
  line: string;
  day: number;
  minute: number;
  localText: string;
}
export type LogLine = Report | LocalLine;
type BootStage = "runtime" | "mount" | "ready";
type SaveIssue = "" | "saveConflict" | "saveFailed";
type View = number | "suppliers";
type SimulatorResult = Extract<WorkerReply, { state: Snapshot }>;

interface RunView {
  journal: Entry[];
  state: Optional<Snapshot>;
  actions: Actions;
  reports: Report[];
  lines: LogLine[];
  history: number[];
  best: Optional<PersonalBest>;
  busy: boolean;
  error: string;
  boot: Optional<BootStage[]>;
}

function initialView(): RunView {
  return {
    actions: {},
    best: null,
    boot: null,
    busy: true,
    error: "",
    history: [],
    journal: [],
    lines: [],
    reports: [],
    state: null,
  };
}

function post(worker: Worker, request: WorkerRequest) {
  worker.postMessage(request);
}

function openWorker() {
  try {
    return { worker: new Worker("/worker.js") };
  } catch (error) {
    return { error };
  }
}

async function recordScore(key: string, state: Snapshot, values: number[]) {
  if (!state.over || state.failed || values.length !== state.days + 1) {
    return;
  }
  if (!state.final) {
    throw new Error("Completed run is missing its final score");
  }
  const score = state.final.reward;
  await withRunLock(key, () => {
    const previous = readRecord(localStorage.getItem(key));
    if (!previous || score > previous.score) {
      localStorage.setItem(key, JSON.stringify({ score, values }));
    }
  });
}

function reportsFor(data: SimulatorResult, entries: Entry[], offset: number): Report[] {
  if (data.receipts.length !== entries.length) {
    throw new Error("Simulator returned a different receipt count");
  }
  return data.receipts.map((receipt, i) => {
    const entry = entries[i];
    if (!entry) {
      throw new Error("Simulator returned a receipt without a command");
    }
    return observation(receipt, entry.move, offset + i + 1, entry.line);
  });
}

/** Keeps the selected run's simulator, journal and comparison record in sync. */
export function useRun(release: Release, slot: string, onView: (id: View) => void) {
  const [view, setView] = useState<RunView>(initialView);
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [saveIssue, setSaveIssue] = useState<SaveIssue>("");
  const [runtimeError, setRuntimeError] = useState("");
  const [epoch, setEpoch] = useState(0);
  const worker = useRef<Optional<Worker>>(null);
  const pending = useRef<Optional<{ entry: Entry; destination: ResponseDestination }>>(null);
  const saveKey = runKey(release, slot);
  const bestKey = recordKey(release);
  const setError = useCallback((error: string) => setView((old) => ({ ...old, error })), []);
  const clearSaveIssue = useCallback(() => setSaveIssue(""), []);

  const startWorker = useCallback(() => {
    const abort = new AbortController();
    const opened = openWorker();
    if (!hasValue(opened.worker)) {
      const startError = opened.error;
      queueMicrotask(() => {
        if (abort.signal.aborted) {
          return;
        }
        setRuntimeError(errorToString(startError));
        setView({ ...initialView(), busy: false });
      });
      return () => abort.abort();
    }
    const current = opened.worker;
    worker.current = current;
    let serialized: Optional<string> = null;
    let opponent: Optional<PersonalBest> = null;
    let balances: number[] = [];
    let first = false;
    let entries: Entry[] = [];
    let timeline: Optional<RunTimeline> = undefined;
    let playerMoves = true;
    pending.current = null;

    const fail = (error: unknown) => {
      if (abort.signal.aborted) {
        return;
      }
      abort.abort();
      current.terminate();
      worker.current = null;
      pending.current = null;
      setRuntimeError(errorToString(error));
      setView((old) => ({ ...old, busy: false, error: "" }));
    };

    function replay() {
      first = !localStorage.getItem("vendix.booted");
      serialized = localStorage.getItem(saveKey);
      if (!hasValue(serialized)) {
        throw new Error("Saved run not found");
      }
      const saved = readRun(serialized, readRecord(localStorage.getItem(bestKey)));
      ({ opponent, timeline } = saved);
      playerMoves = !isReferenceResult(saved.parent, release);
      entries = saved.moves;
      balances = [];
      pending.current = null;
      post(current, { moves: entries.map((e) => e.move), release });
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
            saveRun(localStorage, saveKey, serialized, {
              finished: data.state.over,
              moves: next,
              opponent,
              timeline,
            }),
          );
        } catch (error) {
          if (abort.signal.aborted) {
            return;
          }
          setSaveIssue(
            error instanceof Error && error.message === "changed" ? "saveConflict" : "saveFailed",
          );
          setEpoch((n) => n + 1);
          setView(initialView());
          onView("suppliers");
          replay();
          return;
        }
        if (abort.signal.aborted) {
          return;
        }
        entries = next;
      } else {
        if (!previousTimeline && hasValue(serialized)) {
          try {
            serialized = await withRunLock(saveKey, () =>
              saveRun(localStorage, saveKey, serialized, {
                finished: data.state.over,
                moves: entries,
                opponent,
                timeline,
              }),
            );
          } catch (error) {
            if (abort.signal.aborted) {
              return;
            }
            if (error instanceof Error && error.message === "changed") {
              replay();
              return;
            }
            setSaveIssue("saveFailed");
          }
        }
        if (first) {
          localStorage.setItem("vendix.booted", "1");
        }
      }
      if (data.state.over && playerMoves) {
        try {
          await recordScore(bestKey, data.state, balances);
        } catch {
          if (!abort.signal.aborted) {
            setSaveIssue("saveFailed");
          }
        }
      }
      if (abort.signal.aborted) {
        return;
      }
      pending.current = null;
      setView((old) => {
        const replayBoot: Optional<BootStage[]> = first ? [...(old.boot ?? []), "ready"] : null;
        return {
          ...old,
          actions: data.actions,
          best: opponent,
          boot: entry ? old.boot : replayBoot,
          busy: false,
          history: balances,
          journal: entries,
          lines: entry ? [...old.lines, ...reports] : reports,
          reports: entry ? [...old.reports, ...reports] : reports,
          state: data.state,
        };
      });
      // A finished run opens the result screen instead of a receipt.
      if (
        !data.state.over &&
        request &&
        reports[0] &&
        shouldOpenReceipt(reports[0], request.destination)
      ) {
        onView(reports[0].id);
      }
    }

    current.addEventListener("error", (e) => fail(e.message), { signal: abort.signal });
    current.addEventListener(
      "message",
      async (event: MessageEvent<unknown>) => {
        if (abort.signal.aborted) {
          return;
        }
        try {
          const data = parseWorkerReply(event.data);
          if ("error" in data) {
            fail(data.error);
            return;
          }
          if ("boot" in data) {
            if (first) {
              setView((old) => ({ ...old, boot: [...(old.boot ?? []), data.boot] }));
            }
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
    let stop = startWorker();
    function hidePage() {
      stop();
    }
    function restorePage(event: PageTransitionEvent) {
      if (!event.persisted) {
        return;
      }
      setRuntimeError("");
      setView((old) => ({ ...old, busy: true }));
      stop = startWorker();
    }
    globalThis.addEventListener("pagehide", hidePage);
    globalThis.addEventListener("pageshow", restorePage);
    return () => {
      globalThis.removeEventListener("pagehide", hidePage);
      globalThis.removeEventListener("pageshow", restorePage);
      stop();
    };
  }, [startWorker]);

  useEffect(() => {
    const abort = new AbortController();
    Promise.all(release.rivals.map((rival) => loadRival(rival, abort.signal)))
      .then((data) => {
        if (!abort.signal.aborted) {
          setRivals(data);
        }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) {
          setError(errorToString(error));
        }
      });
    return () => abort.abort();
  }, [release, setError]);

  function submit(entry: Entry, destination: ResponseDestination): boolean {
    if (view.busy || !view.state || view.state.over || pending.current || !worker.current) {
      return false;
    }
    pending.current = { destination, entry };
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
                day: old.state.day,
                id: `help-${old.lines.length}`,
                line,
                localText,
                minute: old.state.minute,
              },
            ],
          },
    );
  }
  return {
    ...view,
    appendLocal,
    clearSaveIssue,
    epoch,
    rivals,
    runtimeError,
    saveIssue,
    setError,
    submit,
  };
}
