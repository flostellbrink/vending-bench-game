import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadPyodide } from 'pyodide';

test('a saved command sequence replays to the same day-30 score', async () => {
  const python = await loadPyodide();
  python.unpackArchive(new Uint8Array(await readFile('public/3.0.0.zip')), 'zip');
  python.runPython(await readFile('public/v3.py', 'utf8'));
  const play = () => JSON.parse(python.runPython(`
start(1)
act("get_machine_inventory", '{"machine_id":"AI-LOUNGE:SNACK"}')
for _ in range(30):
    act("wait_for_next_day", "{}")
snapshot()
`));
  const result = play();
  assert.deepEqual(play(), result);
  assert.equal(result.day, 30);
  assert.equal(result.over, true);
  assert.equal(result.failed, false);
  assert.equal(result.cash, 1140);
});
