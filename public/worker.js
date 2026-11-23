let runtime;
self.onmessage = async ({ data }) => {
  try {
    if (data.release && !runtime) {
      postMessage({ boot: "runtime" });
      const base = new URL("python/", self.location.href).href;
      importScripts(base + "pyodide.js");
      runtime = await loadPyodide({ indexURL: base });
      postMessage({ boot: "mount" });
      const release = data.release;
      const [archive, adapter] = await Promise.all([
        fetch("/" + release.engineArchive),
        fetch(release.adapter),
      ]);
      if (!archive.ok || !adapter.ok) throw Error("Missing release");
      runtime.unpackArchive(await archive.arrayBuffer(), "zip");
      runtime.runPython(await adapter.text());
    }
    const call = (name, ...args) => {
      const fn = runtime.globals.get(name);
      try {
        return fn(...args);
      } finally {
        fn.destroy();
      }
    };
    if (data.release) call("start", data.release.seed);
    let before = JSON.parse(call("progress"));
    const history = [before.cash];
    const receipts = [];
    let output = "";
    for (const [name, args] of data.moves) {
      output = call("act", name, JSON.stringify(args));
      const after = JSON.parse(call("progress"));
      const { body, notices, demand } = JSON.parse(call("receipt"));
      receipts.push({
        output,
        body,
        notices,
        demand,
        day: before.day,
        minute: before.minute,
        endDay: after.day,
        endMinute: after.minute,
        openingCash: before.cash,
        closingCash: after.cash,
      });
      if (after.day !== before.day || after.over) history.push(after.cash);
      before = after;
    }
    const current = JSON.parse(call("snapshot"));
    for (let i = 0; i < receipts.length; i++) {
      const [tool] = data.moves[i];
      receipts[i].minutes =
        tool === "wait_for_next_day"
          ? current.closes - receipts[i].minute
          : (current.costs[tool] ?? current.defaultCost);
    }
    postMessage({ state: current, history, receipts, actions: JSON.parse(call("actions")) });
  } catch (error) {
    postMessage({ error: error.message });
  }
};
