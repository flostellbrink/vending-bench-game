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
      if (segment === "") {
        const form = html.match(
          /<form\b(?=[^>]*class="session-actions")[^>]*>[\s\S]*?<\/form>/,
        )?.[0];
        assert.ok(form, "Missing native setup form");
        assert.ok(
          form.includes('action="/' + locale + '/run/"'),
          "Start must navigate without landing-page JavaScript",
        );
        assert.ok(form.includes('name="slot"') && form.includes('value="new"'));
        assert.ok(
          !form.match(/<button\b[^>]*\bdisabled/),
          "A fresh exported start must not depend on the save tree hydrating",
        );
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
      assert.equal("SLTR0014" in messages, segment === "saves/", "Wrong save-library scope");
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
