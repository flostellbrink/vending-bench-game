import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import * as v from "valibot";

import { locales } from "../src/dictionary/runtime.ts";

const directory = new URL("../out/", import.meta.url);
const messageSubset = v.record(v.string(), v.record(v.string(), v.string()));
const flightRecord = v.tuple([
  v.unknown(),
  v.unknown(),
  v.unknown(),
  v.object({ translations: v.object({ "vending-bench-game": messageSubset }) }),
]);

await test("each exported page ships only its own localized messages", async () => {
  const chunks = new URL("_next/static/chunks/", directory);
  const files = await readdir(chunks, { recursive: true });
  const scripts = await Promise.all(
    files.filter((f) => f.endsWith(".js")).map((f) => readFile(new URL(f, chunks), "utf8")),
  );
  for (const locale of locales)
    for (const [segment, landmarkId] of [
      ["", "SX000001"],
      ["run/", "VBBOOT03"],
      ["saves/", "SLTR0014"],
    ] as const) {
      const route = new URL(locale + "/" + segment, directory);
      const html = await readFile(new URL("index.html", route), "utf8");
      assert.ok(html.includes('<html lang="' + locale + '">'));
      if (segment !== "run/") {
        const headings = assertValue(html.match(/class="save-map-head"[^>]*>(.*?)<\/div>/s)?.[1]);
        assert.ok(!headings.includes("<button"), "The day headings must not contain the New box");
        const firstTrack = assertValue(html.match(/class="save-map-row"[^>]*>(.*?)<\/div>/s)?.[1]);
        const nodes = [...firstTrack.matchAll(/<button\b[^>]+>/g)].map(([button]) => button);
        assert.ok(assertValue(nodes[0]).includes('data-checkpoint="new:1"'));
        assert.ok(assertValue(nodes[1]).includes('data-checkpoint="scripted-reference:2"'));
        const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
          .map(([form]) => form)
          .filter((form) => form.includes('action="/' + locale + '/run/"'));
        assert.equal(forms.length, 1, "Only the timeline starts a new game");
        const form = assertValue(forms[0]);
        const id = assertValue(form.match(/\bid="([^"]+)"/)?.[1]);
        assert.ok(form.includes('name="slot"') && form.includes('value="new"'));
        const buttons = [...html.matchAll(/<button\b[^>]*>/g)]
          .map(([button]) => button)
          .filter((button) => button.includes('form="' + id + '"'));
        assert.equal(buttons.length, 1, "The selected checkpoint has one launch control");
        assert.ok(assertValue(buttons[0]).includes('type="submit"'));
        assert.ok(!assertValue(buttons[0]).includes("disabled"), "Start works before hydration");
      }
      const flight = await readFile(new URL("index.txt", route), "utf8");
      const line = flight
        .split("\n")
        .find((l) => l.includes('"translations":{"vending-bench-game"'));
      assert.ok(line, "Missing client translations for " + route.pathname);
      const record = v.parse(flightRecord, JSON.parse(line.slice(line.indexOf(":") + 1)));
      const dictionary = record[3].translations["vending-bench-game"];
      assert.deepEqual(Object.keys(dictionary), [locale]);
      const messages = assertValue(dictionary[locale]);
      const landmark = assertValue(messages[landmarkId]);
      assert.equal("VBBOOT03" in messages, segment === "run/", "Wrong boot-hint scope");
      assert.equal("SLTR0014" in messages, segment !== "run/", "Wrong save-library scope");
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
});
