import { actionsSchema, parseReleases, snapshotSchema } from "games-common/benchmark";
import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

import {
  pinSchema,
  pythonJSON,
  readReleases,
  readSnapshot,
  sourceRivalSchema,
} from "./benchmark-source.ts";

const root = new URL("../../../", import.meta.url);
const app = new URL("../", import.meta.url);
const catalog = parseReleases(
  JSON.parse(await readFile(new URL("src/generated/releases.json", app), "utf8")),
);
const pins = v.parse(
  v.array(pinSchema),
  JSON.parse(await readFile(new URL("releases.json", root), "utf8")),
);
const retained = assertValue(pins.find((pin) => pin.revision !== "submodule")).revision;
const calibrationSchema = v.object({
  seed: v.number(),
  sim_days: v.number(),
  version: v.string(),
  reward: v.number(),
  final_balance: v.number(),
  completed: v.boolean(),
});
await test("a saved command sequence replays to the same final score", async () => {
  const release = assertValue(catalog.find((r) => r.revision === retained));
  const python = await loadPyodide();
  python.unpackArchive(
    new Uint8Array(await readFile(new URL("public/" + release.engineArchive, app))),
    "zip",
  );
  python.runPython(await readFile(new URL("public/" + release.adapter, app), "utf8"));
  python.globals.set("seed", release.seed);
  const play = () =>
    v.parse(
      snapshotSchema,
      pythonJSON(
        python,
        `
start(seed)
act("get_machine_inventory", json.dumps({"machine_id": config.machine_ids()[0]}))
for _ in range(config.SIM_DAYS):
    act("wait_for_next_day", "{}")
snapshot()
`,
      ),
    );
  const result = play();
  assert.deepEqual(play(), result);
  assert.equal(result.day, release.days);
  assert.equal(result.over, true);
  assert.equal(result.failed, false);
  assert.equal(
    result.cash,
    release.startingBalance -
      release.days * v.parse(v.number(), python.runPython("config.DAILY_SPOT_FEE")),
  );
  assert.deepEqual(
    Object.keys(v.parse(actionsSchema, pythonJSON(python, "actions()"))).toSorted(),
    Object.keys(release.tools).toSorted(),
  );
});

await test("published scripted calibration and briefing come from the selected Git revision", async () => {
  for (const release of catalog) {
    const show = (path: string) =>
      execFileSync("git", ["-C", "vendor/vending-bench", "show", release.revision + ":" + path], {
        cwd: root,
        encoding: "utf8",
      });
    assert.equal(release.brief, show("tasks/vending-bench/instruction.md").trim());
    const rival = assertValue(release.rivals.find((r) => r.kind === "script"));
    const balances = v.parse(
      v.array(v.number()),
      JSON.parse(await readFile(new URL("public/" + assertValue(rival.balances), app), "utf8")),
    );
    assert.equal(balances[0], release.startingBalance);
    if (rival.source.endsWith("/results.json")) {
      const calibration = assertValue(
        v
          .parse(
            v.array(calibrationSchema),
            JSON.parse(show("results/baselines/scripted-reference/results.json")),
          )
          .find(
            (r) =>
              r.seed === release.seed &&
              r.sim_days === release.days &&
              r.version === release.version,
          ),
      );
      assert.equal(rival.score, calibration.reward);
      assert.equal(balances.at(-1), calibration.final_balance);
      if (calibration.completed) assert.equal(balances.length, release.days + 1);
    }
  }
});

await test("different commits sharing one release version remain distinct; duplicate pins collapse", async () => {
  const previous = execFileSync(
    "git",
    ["-C", "vendor/vending-bench", "rev-parse", retained + "^"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const releases = await readReleases(
    [retained, previous, retained].map((revision) => ({ revision })),
  );
  assert.equal(releases.length, 2);
  assert.equal(assertValue(releases[0]).version, assertValue(releases[1]).version);
  assert.notEqual(assertValue(releases[0]).id, assertValue(releases[1]).id);
  assert.deepEqual(
    releases.map((r) => r.revision),
    [retained, previous],
  );
});

await test("model endpoints need matching source and conditions; only recorded closings become a trace", async () => {
  const release = assertValue(catalog[0]);
  const python = await readSnapshot(release.revision);
  const batch = "/upstream/results/baselines/models-30d";
  const trial = batch + "/example";
  python.FS.mkdirTree(trial);
  const write = (path: string, data: unknown) => python.FS.writeFile(path, JSON.stringify(data));
  const fingerprint = v.parse(
    v.string(),
    python.runPython(`
from io import BytesIO
source = BytesIO()
digest = hashlib.sha256()
with ZipFile(source, "w") as files:
    for path in sorted(SERVER.rglob("*")):
        if path.suffix in (".py", ".toml"):
            name = path.relative_to(ROOT).as_posix()
            data = path.read_bytes()
            files.writestr(name, data)
            digest.update(name.encode())
            digest.update(data)
digest.hexdigest()
`),
  );
  python.globals.set("fixture_zip", batch + "/evaluation-source.zip");
  python.runPython("Path(fixture_zip).write_bytes(source.getvalue())");
  python.FS.writeFile(batch + "/evaluation-source.sha256", fingerprint);
  write(batch + "/manifest.json", { source_sha256: fingerprint });
  const result = {
    seed: release.seed,
    horizon_days: release.days,
    version: release.version,
    completed: true,
    model_requested: "example/model",
    reward: 2476,
    final_balance: 2476,
    benchmark_sha256: fingerprint,
  };
  write(trial + "/result.json", result);
  write(batch + "/aggregate.json", {
    leaderboard: [{ ...result, display_name: "Example model", result_path: "example/result.json" }],
  });
  const settingsSchema = v.looseObject({ capital: v.looseObject({ daily_spot_fee: v.number() }) });
  const config = v.parse(settingsSchema, pythonJSON(python, "json.dumps(config.CONFIG)"));
  write(trial + "/config.json", config);
  const models = () =>
    v.parse(
      v.array(sourceRivalSchema),
      pythonJSON(python, "json.dumps(model_results(" + JSON.stringify(release.version) + "))"),
    );
  assert.deepEqual(
    models().map((r) => [r.name, r.score, r.values]),
    [["Example model", 2476, null]],
  );
  const receipt = "[Day 2/" + release.days + " — Tue 06 Jan 2026 09:00 — balance €1,481.25]";
  write(trial + "/conversation.jsonl", [
    { role: "assistant", content: receipt.replace("1,481.25", "9,999.99") },
    { role: "tool", content: receipt },
  ]);
  assert.deepEqual(assertValue(models()[0]).values, [release.startingBalance, 1481.25]);
  config.capital.daily_spot_fee++;
  write(trial + "/config.json", config);
  assert.deepEqual(models(), []);
});

await test("a changed upstream site fee regenerates the brief and recalibrates the reference", async () => {
  const release = assertValue(catalog[0]);
  const python = await readSnapshot(release.revision);
  const changed = v.parse(
    v.object({ brief: v.string(), fee: v.number(), symbol: v.string(), script: sourceRivalSchema }),
    pythonJSON(
      python,
      `
config.DAILY_SPOT_FEE += 1
updated = json.loads(metadata())
json.dumps({
    "brief": updated["brief"],
    "fee": config.DAILY_SPOT_FEE,
    "symbol": config.CURRENCY_SYMBOL,
    "script": updated["rivals"][0],
})
`,
    ),
  );
  assert.notEqual(changed.brief, release.brief);
  assert.ok(changed.brief.includes(changed.symbol + changed.fee));
  assert.match(changed.script.sourcePath, /reference_bot\.py$/);
  assert.equal(assertValue(changed.script.values).length, release.days + 1);
});
