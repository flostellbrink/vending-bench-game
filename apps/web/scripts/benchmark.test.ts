import { actionsSchema, parseReleases, replaySchema, snapshotSchema } from "games-common/benchmark";
import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

import { pythonJSON, readReleases, readSnapshot, sourceRivalSchema } from "./benchmark-source.ts";

const root = new URL("../../../", import.meta.url);
const app = new URL("../", import.meta.url);
const catalog = parseReleases(
  JSON.parse(await readFile(new URL("src/generated/releases.json", app), "utf8")),
);
const pinned = assertValue(catalog[0]).revision;
const git = (...args: string[]) =>
  execFileSync("git", ["-C", "vendor/vending-bench", ...args], { cwd: root, encoding: "utf8" });

await test("each model shows its latest published attempt once, with daily balances", async () => {
  const revision = pinned;
  const release = assertValue((await readReleases([{ revision }]))[0]);
  const resultSchema = v.object({
    model_requested: v.string(),
    timestamp_utc: v.string(),
    horizon_days: v.number(),
    seed: v.number(),
    days_operated: v.number(),
    final_balance: v.number(),
    reward: v.number(),
  });
  const trial = (path: string) =>
    v.parse(resultSchema, JSON.parse(git("show", revision + ":" + path)));
  const published = git("ls-tree", "-r", "--name-only", revision, "--", "results")
    .trim()
    .split("\n")
    .filter((p) => /^results\/baselines\/models-.*\/result\.json$/.test(p));
  const latest = new Map<string, string>();
  for (const path of published) {
    const { model_requested: model, timestamp_utc: time, horizon_days, seed } = trial(path);
    if (horizon_days !== release.days || seed !== release.seed) continue;
    if (time > (latest.get(model) ?? "")) latest.set(model, time);
  }
  assert.equal(latest.size, 5);
  const models = release.rivals;
  const shown = new Map<string, string>();
  for (const model of models) {
    const result = trial(model.sourcePath);
    shown.set(result.model_requested, result.timestamp_utc);
    assert.equal(model.score, result.reward);
    assert.equal(model.endDay, result.days_operated);
    assert.equal(model.finalBalance, result.final_balance);
    const values = assertValue(model.values);
    assert.equal(values.length, release.days + 1);
    assert.equal(values[0], release.startingBalance);
    assert.equal(values.at(-1), result.final_balance);
  }
  assert.equal(models.length, shown.size);
  assert.deepEqual(shown, latest);
});
await test("quote defaults come from the published MCP signature, not a frontend constant", async () => {
  const python = await readSnapshot(pinned);
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
await test("a saved command sequence replays to the same final score", async () => {
  const release = assertValue(catalog[0]);
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

await test("the reference run reproduces each morning and its published score in the browser engine", async () => {
  for (const release of catalog) {
    const rival = assertValue(release.rivals.find((r) => r.replay));
    const journal = v.parse(
      replaySchema,
      JSON.parse(await readFile(new URL("public/" + assertValue(rival.replay), app), "utf8")),
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
        checkpoints: replaySchema.entries.checkpoints,
        final: v.object({ reward: v.number(), final_balance: v.number(), completed: v.boolean() }),
      }),
      replay,
    );
    assert.deepEqual(result.checkpoints, journal.checkpoints);
    assert.deepEqual(
      result.checkpoints.map((point) => point.cash),
      assertValue(rival.values).slice(0, result.checkpoints.length),
    );
    assert.equal(result.final.reward, rival.score);
    assert.equal(result.final.final_balance, rival.finalBalance);
    if (result.final.completed) assert.equal(result.checkpoints.length, release.days);
  }
});

await test("the briefing comes from the selected Git revision", () => {
  for (const release of catalog) {
    assert.equal(
      release.brief,
      git("show", release.revision + ":tasks/vending-bench/instruction.md").trim(),
    );
  }
});

await test("different commits sharing one release version remain distinct; duplicate pins collapse", async () => {
  const previous = git("rev-parse", pinned + "^").trim();
  const releases = await readReleases([pinned, previous, pinned].map((revision) => ({ revision })));
  assert.equal(releases.length, 2);
  assert.equal(assertValue(releases[0]).version, assertValue(releases[1]).version);
  assert.notEqual(assertValue(releases[0]).id, assertValue(releases[1]).id);
  assert.deepEqual(
    releases.map((r) => r.revision),
    [pinned, previous],
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

await test("a changed upstream site fee regenerates the brief", async () => {
  const release = assertValue(catalog[0]);
  const python = await readSnapshot(release.revision);
  const changed = v.parse(
    v.object({ brief: v.string(), fee: v.number(), symbol: v.string() }),
    pythonJSON(
      python,
      `
config.DAILY_SPOT_FEE += 1
json.dumps({
    "brief": json.loads(metadata())["brief"],
    "fee": config.DAILY_SPOT_FEE,
    "symbol": config.CURRENCY_SYMBOL,
})
`,
    ),
  );
  assert.notEqual(changed.brief, release.brief);
  assert.ok(changed.brief.includes(changed.symbol + changed.fee));
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
