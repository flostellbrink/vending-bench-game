import type { PyodideInterface, loadPyodide as loadRuntime } from "pyodide";

import {
  actionsSchema,
  adapterReceiptSchema,
  progressSchema,
  snapshotSchema,
  workerRequestSchema,
  type Receipt,
  type Release,
  type WorkerReply,
  type WorkerRequest,
} from "games-common/benchmark";
import * as v from "valibot";

declare const self: DedicatedWorkerGlobalScope;
declare const loadPyodide: typeof loadRuntime;

let runtime: PyodideInterface | undefined;

function send(value: WorkerReply) {
  self.postMessage(value);
}

async function openRuntime(release: Release) {
  send({ boot: "runtime" });
  const base = new URL("/python/", self.location.href).href;
  self.importScripts(base + "pyodide.js");
  const python = await loadPyodide({ indexURL: base });
  send({ boot: "mount" });
  const [archive, adapter] = await Promise.all([
    fetch("/" + release.engineArchive),
    fetch("/" + release.adapter),
  ]);
  if (!archive.ok || !adapter.ok) throw Error("Missing release");
  python.unpackArchive(await archive.arrayBuffer(), "zip");
  python.runPython(await adapter.text());
  return python;
}

function call(python: PyodideInterface, name: string, ...args: (string | number)[]): unknown {
  const fn: unknown = python.globals.get(name);
  if (!(fn instanceof python.ffi.PyCallable)) throw Error("Missing simulator function: " + name);
  try {
    return fn(...args);
  } finally {
    fn.destroy();
  }
}

function readJSON(python: PyodideInterface, name: string): unknown {
  const value = call(python, name);
  if (typeof value !== "string") throw Error("Invalid simulator response: " + name);
  return JSON.parse(value);
}

async function receive({ release, moves }: WorkerRequest) {
  if (release) {
    runtime ??= await openRuntime(release);
    call(runtime, "start", release.seed);
  }
  if (!runtime) throw Error("Simulator has not started");
  const python = runtime;
  const current = () => v.parse(progressSchema, readJSON(python, "progress"));
  let before = current();
  const history = [before.cash];
  const receipts: Receipt[] = [];
  const timing = v.parse(snapshotSchema, readJSON(python, "snapshot"));
  for (const [tool, args] of moves) {
    const output = call(python, "act", tool, JSON.stringify(args));
    if (typeof output !== "string") throw Error("Invalid command response: " + tool);
    const after = current();
    const result = v.parse(adapterReceiptSchema, readJSON(python, "receipt"));
    receipts.push({
      ...result,
      output,
      day: before.day,
      minute: before.minute,
      endDay: after.day,
      endMinute: after.minute,
      openingCash: before.cash,
      closingCash: after.cash,
      minutes:
        tool === "wait_for_next_day"
          ? timing.closes - before.minute
          : (timing.costs[tool] ?? timing.defaultCost),
    });
    if (after.day !== before.day || after.over) history.push(after.cash);
    before = after;
  }
  const state = moves.length ? v.parse(snapshotSchema, readJSON(python, "snapshot")) : timing;
  send({ state, history, receipts, actions: v.parse(actionsSchema, readJSON(python, "actions")) });
}

self.addEventListener("message", async (event: MessageEvent<unknown>) => {
  try {
    await receive(v.parse(workerRequestSchema, event.data));
  } catch (error) {
    send({ error: error instanceof Error ? error.message : String(error) });
  }
});
