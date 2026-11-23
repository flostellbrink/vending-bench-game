let runtime;
self.onmessage = async ({ data }) => {
  try {
    if (data.release) {
      postMessage({boot:'runtime'});
      const base = new URL('python/', self.location.href).href;
      importScripts(base + 'pyodide.js');
      runtime = await loadPyodide({ indexURL: base });
      postMessage({boot:'mount'});
      const release = data.release;
      const [archive, adapter] = await Promise.all([
        fetch(release.id + '.zip'), fetch(release.adapter)
      ]);
      if (!archive.ok || !adapter.ok) throw Error('Missing release');
      runtime.unpackArchive(await archive.arrayBuffer(), 'zip');
      runtime.runPython(await adapter.text());
      runtime.globals.get('start')(release.seed);
    }
    const call = (name, ...args) => {
      const fn = runtime.globals.get(name);
      try { return fn(...args); } finally { fn.destroy(); }
    };
    const state = () => JSON.parse(call('snapshot'));
    const history = [state().cash];
    const receipts = [];
    let output = '';
    for (const [name, args] of data.moves) {
      const before = state();
      output = call('act', name, JSON.stringify(args));
      const after = state();
      receipts.push({output, day:before.day, minute:before.minute,
        endDay:after.day, endMinute:after.minute});
      if (after.day !== before.day || after.over) history.push(after.cash);
    }
    postMessage({ state: state(), output, history, receipts, actions: JSON.parse(call('actions')) });
  } catch (error) {
    postMessage({ error: error.message });
  }
};
