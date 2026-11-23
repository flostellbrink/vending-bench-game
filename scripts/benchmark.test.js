import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPyodide } from "pyodide";
import { execFileSync } from "node:child_process";
import { readReleases, readSnapshot } from "./benchmark-assets.js";

const catalog = JSON.parse(
  await readFile(new URL("../src/generated/releases.json", import.meta.url)),
);
const pins = JSON.parse(await readFile(new URL("../releases.json", import.meta.url)));
const root = new URL("../", import.meta.url);

test("a saved command sequence replays to the same final score", async () => {
  const retained = pins.find((pin) => pin.revision !== "submodule").revision;
  const release = catalog.find((r) => r.revision === retained);
  const python = await loadPyodide();
  python.unpackArchive(
    new Uint8Array(await readFile(new URL("public/" + release.engineArchive, root))),
    "zip",
  );
  python.runPython(await readFile(new URL("public/" + release.adapter, root), "utf8"));
  python.globals.set("seed", release.seed);
  const play = () =>
    JSON.parse(
      python.runPython(`
start(seed)
act("get_machine_inventory", json.dumps({"machine_id": config.machine_ids()[0]}))
for _ in range(config.SIM_DAYS):
    act("wait_for_next_day", "{}")
snapshot()
`),
    );
  const result = play();
  assert.deepEqual(play(), result);
  assert.equal(result.day, release.days);
  assert.equal(result.over, true);
  assert.equal(result.failed, false);
  assert.equal(
    result.cash,
    release.startingBalance - release.days * python.runPython("config.DAILY_SPOT_FEE"),
  );
  assert.deepEqual(
    Object.keys(JSON.parse(python.runPython("actions()"))).sort(),
    Object.keys(release.tools).sort(),
  );
});

test("published scripted calibration and briefing come from the selected Git revision", async () => {
  for (const release of catalog) {
    const show = (path) =>
      execFileSync("git", ["-C", "vendor/vending-bench", "show", release.revision + ":" + path], {
        cwd: root,
        encoding: "utf8",
      });
    assert.equal(release.brief, show("tasks/vending-bench/instruction.md").trim());
    const rival = release.rivals.find((r) => r.kind === "script");
    const balances = JSON.parse(await readFile(new URL("public/" + rival.balances, root)));
    assert.equal(balances[0], release.startingBalance);
    if (rival.source.endsWith("/results.json")) {
      const calibration = JSON.parse(
        show("results/baselines/scripted-reference/results.json"),
      ).find(
        (r) =>
          r.seed === release.seed && r.sim_days === release.days && r.version === release.version,
      );
      assert.equal(rival.score, calibration.reward);
      assert.equal(balances.at(-1), calibration.final_balance);
      if (calibration.completed) assert.equal(balances.length, release.days + 1);
    }
  }
});

test("different commits sharing one release version remain distinct; duplicate pins collapse", async () => {
  const retained = pins.find((p) => p.revision !== "submodule").revision;
  const previous = execFileSync(
    "git",
    ["-C", "vendor/vending-bench", "rev-parse", retained + "^"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const releases = await readReleases(
    [retained, previous, retained].map((revision) => ({ revision })),
  );
  assert.equal(releases.length, 2);
  assert.equal(releases[0].version, releases[1].version);
  assert.notEqual(releases[0].id, releases[1].id);
  assert.deepEqual(
    releases.map((r) => r.revision),
    [retained, previous],
  );
});

test("model endpoints need matching source and conditions; only recorded closings become a trace", async () => {
  const release = catalog[0];
  const python = await readSnapshot(release.revision);
  const batch = "/upstream/results/baselines/models-30d";
  const trial = batch + "/example";
  python.FS.mkdirTree(trial);
  const write = (path, data) => python.FS.writeFile(path, JSON.stringify(data));
  const fingerprint = python.runPython(`
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
`);
  const zip = python.runPython("source.getvalue()").toJs();
  python.FS.writeFile(batch + "/evaluation-source.zip", zip);
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
  const config = JSON.parse(python.runPython("json.dumps(config.CONFIG)"));
  write(trial + "/config.json", config);
  const models = () =>
    JSON.parse(
      python.runPython("json.dumps(model_results(" + JSON.stringify(release.version) + "))"),
    );
  assert.deepEqual(
    models()[0].map((r) => [r.name, r.score, r.values]),
    [["Example model", 2476, null]],
  );
  const receipt = "[Day 2/" + release.days + " — Tue 06 Jan 2026 09:00 — balance €1,481.25]";
  write(trial + "/conversation.jsonl", [
    { role: "assistant", content: receipt.replace("1,481.25", "9,999.99") },
    { role: "tool", content: receipt },
  ]);
  assert.deepEqual(models()[0][0].values, [release.startingBalance, 1481.25]);
  config.capital.daily_spot_fee++;
  write(trial + "/config.json", config);
  const [matching, archives] = models();
  assert.equal(matching.length, 0);
  assert.equal(archives.length,1);
  assert.deepEqual(archives[0].scores, [["Example model", 2476]]);
});
