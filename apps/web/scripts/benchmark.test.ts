import { actionsSchema, parseRelease, replaySchema, snapshotSchema } from "games-common/benchmark";
import { assertValue, entries, keys } from "games-common/language";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

import { brief } from "../src/dictionary/msg/benchmark/brief.ts";
import * as tools from "../src/dictionary/msg/benchmark/tools/names.ts";
import { pythonJSON, readRelease, readSnapshot, sourceRivalSchema } from "./benchmark-source.ts";

const root = new URL("../../../", import.meta.url);
const app = new URL("../", import.meta.url);
const release = parseRelease(
  JSON.parse(await readFile(new URL("src/generated/release.json", app), "utf8")),
);
const { revision } = release;
const git = (...args: string[]) =>
  execFileSync("git", ["-C", "vendor/vending-bench", ...args], { cwd: root, encoding: "utf8" });

/** @risk impact=4 likelihood=2 */
await test("each model shows its latest published attempt once, with daily balances", async () => {
  const source = await readRelease();
  const resultSchema = v.object({
    days_operated: v.number(),
    final_balance: v.number(),
    horizon_days: v.number(),
    model_requested: v.string(),
    reward: v.number(),
    seed: v.number(),
    timestamp_utc: v.string(),
  });
  const trial = (path: string) =>
    v.parse(resultSchema, JSON.parse(git("show", `${revision}:${path}`)));
  const published = git("ls-tree", "-r", "--name-only", revision, "--", "results")
    .trim()
    .split("\n")
    .filter((p) => /^results\/baselines\/models-.*\/result\.json$/.test(p));
  const latest = new Map<string, string>();
  for (const path of published) {
    const { model_requested: model, timestamp_utc: time, horizon_days, seed } = trial(path);
    if (horizon_days !== source.days || seed !== source.seed) {
      continue;
    }
    if (time > (latest.get(model) ?? "")) {
      latest.set(model, time);
    }
  }
  assert.equal(latest.size, 5);
  const models = source.rivals;
  const shown = new Map<string, string>();
  for (const model of models) {
    const result = trial(model.sourcePath);
    shown.set(result.model_requested, result.timestamp_utc);
    assert.equal(model.score, result.reward);
    assert.equal(model.endDay, result.days_operated);
    assert.equal(model.finalBalance, result.final_balance);
    const values = assertValue(model.values);
    assert.equal(values.length, source.days + 1);
    assert.equal(values[0], source.startingBalance);
    assert.equal(values.at(-1), result.final_balance);
  }
  assert.equal(models.length, shown.size);
  assert.deepEqual(shown, latest);
});
/** @risk impact=4 likelihood=2 */
await test("quote defaults and parameter order come from the published MCP signature", async () => {
  const python = await readSnapshot(revision);
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
  assert.deepEqual(pythonJSON(python, "json.dumps(tool_parameters())"), {
    check_offers: ["supplier_id", "quantity"],
  });
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
/** @risk impact=5 likelihood=2 */
await test("a saved command sequence replays to the same final score", async () => {
  const python = await loadPyodide();
  python.unpackArchive(
    new Uint8Array(await readFile(new URL(`public/${release.engineArchive}`, app))),
    "zip",
  );
  python.runPython(await readFile(new URL(`public/${release.adapter}`, app), "utf8"));
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
    keys(v.parse(actionsSchema, pythonJSON(python, "actions()"))).toSorted(),
    keys(release.tools).toSorted(),
  );
});

/** @risk impact=3 likelihood=3 */
await test("each model run replay reproduces every morning and its published score in the browser engine", async () => {
  const replayed = release.rivals.filter((r) => r.replay);
  assert.ok(replayed.length > 0, "No model run replays in the browser engine");
  for (const rival of replayed) {
    const journal = v.parse(
      replaySchema,
      JSON.parse(await readFile(new URL(`public/${assertValue(rival.replay)}`, app), "utf8")),
    );
    assert.equal(journal.revision, revision);
    assert.equal(journal.seed, release.seed);
    const python = await loadPyodide();
    python.unpackArchive(
      new Uint8Array(await readFile(new URL(`public/${release.engineArchive}`, app))),
      "zip",
    );
    python.runPython(await readFile(new URL(`public/${release.adapter}`, app), "utf8"));
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
        final: v.object({ completed: v.boolean(), final_balance: v.number(), reward: v.number() }),
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
    if (result.final.completed) {
      assert.equal(result.checkpoints.length, release.days);
    }
  }
});

/** @risk impact=2 likelihood=1 */
await test("the briefing comes from the submodule commit", () => {
  assert.equal(release.brief, git("show", `${revision}:tasks/vending-bench/instruction.md`).trim());
});

const outdated = (key: string) =>
  `The benchmark text of ${key} changed. In apps/web/dictionary.yaml, set its ^en to the ` +
  "expected text below and update its es and de translations to match.";

/** @risk impact=2 likelihood=3 */
await test("the dictionary translates the published brief and tool descriptions", () => {
  const english = { locale: "en" };
  assert.equal(brief(undefined, english), release.brief, outdated("benchmark.brief"));
  const messages = new Map<string, typeof brief>(entries(tools));
  assert.deepEqual(
    [...messages.keys()].toSorted(),
    keys(release.tools).toSorted(),
    "The published tools changed. In apps/web/dictionary.yaml, add or remove benchmark.tools " +
      "entries to match them, each with ^en set to the published description and es and de " +
      "translations.",
  );
  for (const [tool, text] of entries(release.tools)) {
    const message = assertValue(messages.get(tool));
    assert.equal(message(undefined, english), text, outdated(`benchmark.tools.${tool}`));
  }
});

/** @risk impact=4 likelihood=3 */
await test("model endpoints need matching source and conditions; only recorded closings become a trace", async () => {
  const python = await readSnapshot(revision);
  const fixtureScore = 2476;
  const dayTwoMorningBalance = 1481.25;
  const batch = "/upstream/results/baselines/models-30d";
  const trial = `${batch}/example`;
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
  python.globals.set("fixture_zip", `${batch}/evaluation-source.zip`);
  python.runPython("Path(fixture_zip).write_bytes(source.getvalue())");
  python.FS.writeFile(`${batch}/evaluation-source.sha256`, fingerprint);
  write(`${batch}/manifest.json`, { source_sha256: fingerprint });
  const result = {
    benchmark_sha256: fingerprint,
    completed: true,
    final_balance: fixtureScore,
    horizon_days: release.days,
    model_requested: "example/model",
    reward: fixtureScore,
    seed: release.seed,
    version: release.version,
  };
  write(`${trial}/result.json`, result);
  write(`${batch}/aggregate.json`, {
    leaderboard: [{ ...result, display_name: "Example model", result_path: "example/result.json" }],
  });
  const settingsSchema = v.looseObject({ capital: v.looseObject({ daily_spot_fee: v.number() }) });
  const config = v.parse(settingsSchema, pythonJSON(python, "json.dumps(config.CONFIG)"));
  write(`${trial}/config.json`, config);
  const models = () =>
    v.parse(
      v.array(sourceRivalSchema),
      pythonJSON(python, `json.dumps(model_results(${JSON.stringify(release.version)}))`),
    );
  assert.deepEqual(
    models().map((r) => [r.name, r.score, r.values]),
    [["Example model", fixtureScore, null]],
  );
  const receipt = `[Day 2/${release.days} — Tue 06 Jan 2026 09:00 — balance €1,481.25]`;
  write(`${trial}/conversation.jsonl`, [
    { content: receipt.replace("1,481.25", "9,999.99"), role: "assistant" },
    { content: receipt, role: "tool" },
  ]);
  assert.deepEqual(assertValue(models()[0]).values, [
    release.startingBalance,
    dayTwoMorningBalance,
  ]);
  config.capital.daily_spot_fee++;
  write(`${trial}/config.json`, config);
  assert.deepEqual(models(), []);
});

/** @risk impact=2 likelihood=2 */
await test("a changed upstream site fee regenerates the brief", async () => {
  const python = await readSnapshot(revision);
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
  assert.ok(changed.brief.includes(`${changed.symbol}${changed.fee}`));
});

/** @risk impact=3 likelihood=2 */
await test("GUI report limits follow the benchmark, independently of MCP defaults", async () => {
  const python = await readSnapshot(revision);
  const addedMails = 3;
  const addedSalesDays = 7;
  assert.deepEqual(
    pythonJSON(
      python,
      `
config.EMAIL_LIST_LIMIT_MAX += ${addedMails}
config.SALES_REPORT_MAX_DAYS += ${addedSalesDays}
json.dumps(json.loads(metadata())["reportLimits"])
`,
    ),
    {
      mailCount: release.reportLimits.mailCount + addedMails,
      salesDays: release.reportLimits.salesDays + addedSalesDays,
    },
  );
});
