import {
  actionsSchema,
  parseReleases,
  scriptedReplaySchema,
  snapshotSchema,
} from "games-common/benchmark";
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
const git = (...args: string[]) =>
  execFileSync("git", ["-C", "vendor/vending-bench", ...args], { cwd: root, encoding: "utf8" });

await test("the published solo study contributes one final score per model, using the latest attempt", async () => {
  const revision = "0d9e1a1e34f04091a315943b6ca74f800869bf5c";
  const release = assertValue((await readReleases([{ revision }]))[0]);
  const study = "results/two-agent-seed1/single-agent";
  const trials = git(
    "ls-tree",
    "-r",
    "--name-only",
    revision,
    "--",
    study + "/30d",
    study + "/30d-gpt-rerun",
  )
    .trim()
    .split("\n")
    .filter((path) => path.endsWith("/result.json"));
  const resultSchema = v.object({
    model_requested: v.string(),
    timestamp_utc: v.string(),
    days_operated: v.number(),
    final_balance: v.number(),
    reward: v.number(),
  });
  const latest = new Map<string, { path: string; trial: v.InferOutput<typeof resultSchema> }>();
  for (const path of trials) {
    const trial = v.parse(resultSchema, JSON.parse(git("show", revision + ":" + path)));
    const previous = latest.get(trial.model_requested);
    if (!previous || trial.timestamp_utc > previous.trial.timestamp_utc)
      latest.set(trial.model_requested, { path, trial });
  }
  assert.equal(latest.size, 5);
  assert.equal(trials.length, 6);
  const models = release.rivals.filter((r) => r.kind === "model");
  assert.equal(models.length, latest.size);
  for (const { path, trial } of latest.values()) {
    const model = assertValue(models.find((r) => r.sourcePath === path));
    assert.equal(model.score, trial.reward);
    assert.equal(model.endDay, trial.days_operated);
    assert.equal(model.finalBalance, trial.final_balance);
    assert.equal(model.values == null, true);
  }
});
await test("quote defaults come from the published MCP signature, not a frontend constant", async () => {
  const python = await readSnapshot(retained);
  const path = v.parse(v.string(), python.runPython('str(SERVER / "server.py")'));
  python.FS.writeFile(
    path,
    [
      "@mcp.tool()",
      "def check_offers(supplier_id: str, quantity: int = 37):",
      '    """Quote this quantity."""',
    ].join("\n"),
  );
  assert.deepEqual(pythonJSON(python, "json.dumps(tool_metadata())"), [
    { check_offers: "Quote this quantity." },
    { check_offers: { quantity: 37 } },
  ]);
  assert.equal(
    python.runPython(`
import inspect
scope = {}
exec(browser_tools(), scope)
str(inspect.signature(scope["tools"]["check_offers"]))
`),
    "(supplier_id: str, quantity: int = 37)",
  );
});
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

await test("the scripted journal reproduces each morning and the final score in the browser engine", async () => {
  for (const release of catalog) {
    const journal = v.parse(
      scriptedReplaySchema,
      JSON.parse(await readFile(new URL("public/" + release.scriptedReplay, app), "utf8")),
    );
    assert.equal(journal.revision, release.revision);
    assert.equal(journal.seed, release.seed);
    const python = await loadPyodide();
    python.unpackArchive(
      new Uint8Array(await readFile(new URL("public/" + release.engineArchive, app))),
      "zip",
    );
    python.runPython(await readFile(new URL("public/" + release.adapter, app), "utf8"));
    python.globals.set("encoded_moves", JSON.stringify(journal.moves));
    python.globals.set("seed", journal.seed);
    const replay = pythonJSON(
      python,
      `
start(seed)
mornings = [{"day": 1, "moveCount": 0, "cash": engine.s["balance"]}]
for count, (tool, args) in enumerate(json.loads(encoded_moves), 1):
    day = engine.s["day"]
    act(tool, json.dumps(args))
    if day != engine.s["day"] and not engine.over:
        assert engine.s["minute"] == config.DAY_START_MINUTE
        mornings.append({"day": engine.s["day"], "moveCount": count, "cash": engine.s["balance"]})
json.dumps({"checkpoints": mornings, "final": json.loads(snapshot())["final"]})
`,
    );
    const result = v.parse(
      v.object({
        checkpoints: scriptedReplaySchema.entries.checkpoints,
        final: v.object({ reward: v.number(), final_balance: v.number(), completed: v.boolean() }),
      }),
      replay,
    );
    assert.deepEqual(result.checkpoints, journal.checkpoints);
    const rival = assertValue(release.rivals.find((r) => r.kind === "script"));
    assert.equal(result.final.reward, rival.score);
    assert.equal(result.final.final_balance, rival.finalBalance);
    if (result.final.completed) assert.equal(result.checkpoints.length, release.days);
  }
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
  const release = assertValue(catalog.find((entry) => entry.revision === retained));
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

await test("GUI report limits follow the selected benchmark, independently of MCP defaults", async () => {
  const release = assertValue(catalog[0]);
  const python = await readSnapshot(release.revision);
  assert.deepEqual(
    pythonJSON(
      python,
      `
config.EMAIL_LIST_LIMIT_MAX += 3
config.SALES_REPORT_MAX_DAYS += 7
json.dumps(json.loads(metadata())["reportLimits"])
`,
    ),
    {
      mailCount: release.reportLimits.mailCount + 3,
      salesDays: release.reportLimits.salesDays + 7,
    },
  );
});
