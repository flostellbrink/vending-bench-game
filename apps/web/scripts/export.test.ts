import { parseRelease } from "games-common/benchmark";
import { assertValue, keys } from "games-common/language";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import * as v from "valibot";

import { locales } from "../src/dictionary/runtime.ts";
import { referenceRuns, referenceSlotOf } from "../src/game/runs.ts";

const directory = new URL("../out/", import.meta.url);
const release = parseRelease(
  JSON.parse(await readFile(new URL("../src/generated/release.json", import.meta.url), "utf8")),
);
const messageSubset = v.record(v.string(), v.record(v.string(), v.string()));
const flightRecord = v.tuple([
  v.unknown(),
  v.unknown(),
  v.unknown(),
  v.object({ translations: v.object({ "vending-bench-game": messageSubset }) }),
]);

/** @risk impact=2 likelihood=2 */
await test("each exported page ships only its own localized messages", async () => {
  const chunks = new URL("_next/static/chunks/", directory);
  const files = await readdir(chunks, { recursive: true });
  const scripts = await Promise.all(
    files.filter((f) => f.endsWith(".js")).map((f) => readFile(new URL(f, chunks), "utf8")),
  );
  for (const locale of locales) {
    for (const [segment, landmarkId] of [
      ["", "SX000002"],
      ["/run", "VBBOOT03"],
    ] as const) {
      const route = new URL(`${locale}${segment}`, directory);
      const html = await readFile(new URL(`${route.href}.html`), "utf8");
      assert.ok(html.includes(`<html lang="${locale}">`));
      if (segment !== "/run") {
        const headings = assertValue(
          /class="save-map-head"[^>]*>(?<headings>.*?)<\/div>/s.exec(html)?.groups?.headings,
        );
        assert.ok(!headings.includes("<button"), "The day headings must not contain the New box");
        const firstTrack = assertValue(
          /class="save-map-row"[^>]*>(?<track>.*?)<\/div>/s.exec(html)?.groups?.track,
        );
        const [newBox, dayTwo] = [...firstTrack.matchAll(/<button\b[^>]+>/g)].map(([b]) => b);
        const topModel = assertValue(referenceRuns(release)[0]);
        const firstName = /class="save-names-head"[^>]*><\/div><div[^>]*>(?<name>[^<]*)</.exec(html)
          ?.groups?.name;
        assert.equal(firstName, topModel.name, "The first row is the top model run");
        assert.ok(assertValue(newBox).includes('data-checkpoint="new:1"'));
        assert.ok(assertValue(dayTwo).includes(`data-checkpoint="${referenceSlotOf(topModel)}:2"`));
        const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
          .map(([form]) => form)
          .filter((form) => {
            const action = /\baction="(?<action>[^"]+)"/.exec(form)?.groups?.action;
            return action === `/${locale}/run`;
          });
        assert.equal(forms.length, 1, "Only the timeline starts a new game");
        const form = assertValue(forms[0]);
        const id = assertValue(/\bid="(?<id>[^"]+)"/.exec(form)?.groups?.id);
        assert.ok(form.includes('name="slot"') && form.includes('value="new"'));
        const buttons = [...html.matchAll(/<button\b[^>]*>/g)]
          .map(([button]) => button)
          .filter((button) => button.includes(`form="${id}"`));
        assert.equal(buttons.length, 1, "The selected checkpoint has one launch control");
        assert.ok(assertValue(buttons[0]).includes('type="submit"'));
        assert.ok(!assertValue(buttons[0]).includes("disabled"), "Start works before hydration");
      }
      const flight = await readFile(new URL(`${route.href}.txt`), "utf8");
      const line = flight
        .split("\n")
        .find((l) => l.includes('"translations":{"vending-bench-game"'));
      assert.ok(line, `Missing client translations for ${route.pathname}`);
      const record = v.parse(flightRecord, JSON.parse(line.slice(line.indexOf(":") + 1)));
      const dictionary = record[3].translations["vending-bench-game"];
      assert.deepEqual(keys(dictionary), [locale]);
      const messages = assertValue(dictionary[locale]);
      const landmark = assertValue(messages[landmarkId]);
      assert.equal("VBBOOT03" in messages, segment === "/run", "Wrong boot-hint scope");
      assert.ok("SLTR0014" in messages, "The landing and result screens show the save timeline");
      assert.equal(
        "HN000001" in messages,
        segment === "",
        "The benchmark introduction belongs only on the landing page",
      );
      assert.ok(!("VFADD001" in messages), "Unused order-form message shipped");
      assert.ok(
        !scripts.some((s) => s.includes(landmark)),
        "Page message included in shared browser JS",
      );
    }
  }
});
