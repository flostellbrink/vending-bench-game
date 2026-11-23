// Old saves contain only moves. Their original comparison record cannot be recovered.
export function readRun(serialized, record) {
  if (serialized === null) return { moves: [], opponent: record };
  const saved = JSON.parse(serialized);
  if (Array.isArray(saved)) {
    const moves = saved.map((entry) =>
      Array.isArray(entry) ? { move: entry, line: entry[0] } : entry,
    );
    return { moves, opponent: null };
  }
  if (saved?.format !== 1 || !Array.isArray(saved.moves)) throw new Error("Unsupported save");
  return { moves: saved.moves, opponent: saved.opponent ?? null };
}

export function saveRun(storage, key, expected, moves, opponent) {
  if (storage.getItem(key) !== expected) throw new Error("changed");
  const next = JSON.stringify({ format: 1, moves, opponent });
  storage.setItem(key, next);
  return next;
}

export function withRunLock(key, operation) {
  if (navigator.locks) return navigator.locks.request(key, operation);
  return Promise.resolve().then(operation);
}
