import {
  adapterReceiptSchema,
  progressSchema,
  snapshotSchema,
  parseReleases,
  type CommandArgs,
} from "games-common/benchmark";
import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

import { pythonJSON } from "../benchmark-source.ts";

const root = new URL("../../", import.meta.url);
const releases = parseReleases(
  JSON.parse(await readFile(new URL("src/generated/releases.json", root), "utf8")),
);
const revision = "60794b49932294a0fcb3fcf9a5ca3aaaa0c8a282";
const release = assertValue(releases.find((entry) => entry.revision === revision));
const python = await loadPyodide();
const asset = (name: string) => new URL("public/" + name, root);
python.unpackArchive(new Uint8Array(await readFile(asset(release.engineArchive))), "zip");
python.runPython(await readFile(asset(release.adapter), "utf8"));
const state = () => v.parse(progressSchema, pythonJSON(python, "progress()"));
const product = "stroopwafel-2pk";
const supplier = "zuidas-groothandel";
const machine = "MAIN-LOUNGE:SNACK";
const slot = machine + ":A1";

function call(tool: string, args: CommandArgs = {}) {
  const before = state();
  python.globals.set("study_tool", tool);
  python.globals.set("study_args", JSON.stringify(args));
  const raw = v.parse(v.string(), python.runPython("act(study_tool,study_args)"));
  const receipt = v.parse(adapterReceiptSchema, pythonJSON(python, "receipt()"));
  return { tool, args, before, after: state(), receipt, raw };
}

function play(inspect: boolean) {
  python.globals.set("study_seed", release.seed);
  python.runPython("start(study_seed)");
  const setup: ReturnType<typeof call>[] = [];
  const record = (tool: string, args: CommandArgs = {}) => {
    const entry = call(tool, args);
    setup.push(entry);
    return entry;
  };
  record("check_offers", { supplier_id: supplier, quantity: 160 });
  const order = record("order_goods", { supplier_id: supplier, items: { [product]: 160 } });
  const { delivery_day } = v.parse(
    v.object({ delivery_day: v.number() }),
    JSON.parse(order.receipt.body),
  );
  assert.ok(delivery_day > 1);
  while (
    !assertValue(setup.at(-1)).receipt.notices.some((notice) =>
      notice.includes("arrived in storage"),
    )
  ) {
    record("wait_for_next_day");
  }
  record("get_storage_inventory");
  const { machines } = v.parse(snapshotSchema, pythonJSON(python, "snapshot()"));
  for (const machine_id of machines) record("get_machine_inventory", { machine_id });
  for (const supplier_id of [
    "zuidas-groothandel",
    "kanaal-cash-carry",
    "premium-vend-partners",
    "bakker-en-zoon",
    "noordzee-dranken",
    "gadget-import-nl",
  ])
    record("check_offers", { supplier_id, quantity: 160 });
  for (const location of ["AI-HOUSE", "AI-LOUNGE", "MAIN-LOUNGE"]) {
    record("get_sales_report", { location, days: 1 });
  }
  record("list_emails");
  record("get_status");
  record("list_reminders");
  record("read_notes");
  const decision = state();
  assert.equal(decision.minute, 16 * 60);
  const steps = [];
  if (inspect) steps.push(call("get_machine_inventory", { machine_id: machine }));
  steps.push(call("restock_machine", { slot, product_id: product, quantity: 18 }));
  steps.push(call("set_price", { slot, price: 1.5 }));
  if (state().day === decision.day) steps.push(call("wait_for_next_day"));
  const report = call("get_sales_report", { days: 1 });
  const totals = report.receipt.body.match(/Total: (\d+) units, €([\d,.]+)/);
  assert.ok(totals);
  const outcome = {
    cash: report.before.cash,
    units: Number(assertValue(totals[1])),
    revenue: Number(assertValue(totals[2]).replaceAll(",", "")),
  };
  return { setup, decision, branch: { steps, report, outcome } };
}

const direct = play(false);
const inspection = play(true);
assert.deepEqual(direct.setup, inspection.setup);
assert.ok(
  direct.branch.outcome.units > inspection.branch.outcome.units,
  JSON.stringify(direct.branch.steps.map((step) => step.raw)),
);
console.log(
  JSON.stringify(
    {
      revision,
      seed: release.seed,
      setup: direct.setup,
      decision: direct.decision,
      branches: { direct: direct.branch, inspect: inspection.branch },
    },
    null,
    2,
  ),
);
