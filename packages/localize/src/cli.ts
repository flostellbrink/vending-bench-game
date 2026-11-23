#!/usr/bin/env node
import { type Optional, hasValue } from "games-common/language";
import { load } from "js-yaml";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import * as v from "valibot";

import { generateClient } from "./generate.ts";
import { normalizeDictionary } from "./normalize.ts";
import { rootNodeSchema } from "./schema.ts";
import { validateLexicon } from "./validate.ts";

function optionalArg(flag: string): Optional<string> {
  const flagIndex = process.argv.indexOf(flag);
  const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
  if (!hasValue(value) || value.trim() === "") {
    return undefined;
  }
  return value;
}

function requiredArg(flag: string): string {
  const value = optionalArg(flag);
  if (!hasValue(value)) {
    throw new Error(`Missing ${flag} argument.`);
  }
  return value;
}

async function run() {
  // TODO: default to dictionary naming
  const inputPath = path.join(process.cwd(), requiredArg("--input"));
  const outputDir = path.join(process.cwd(), requiredArg("--output"));

  // TODO: add management commands. set commands per locale that insert new keys as necessary. should accept mf2

  const root = v.parse(rootNodeSchema, load(await readFile(inputPath, "utf8")));

  // TODO: move into separate lint command
  validateLexicon(root);

  const packageJson: unknown = JSON.parse(
    await readFile(path.join(process.cwd(), "package.json"), "utf8"),
  );
  const dictionary = v.parse(v.object({ name: v.string() }), packageJson).name;

  const normalized = normalizeDictionary(root);
  const files = generateClient(normalized, dictionary);

  // A dev server caches a missing file as "not found", also when it was gone only for a moment.
  // So write only the files that changed, and remove only the files that are gone.
  const wanted = new Map(
    Array.from(files, (file) => [path.join(outputDir, file.path), file.lines.join("\n")]),
  );
  for (const filePath of await listFiles(outputDir)) {
    if (!wanted.has(filePath)) {
      await rm(filePath);
    }
  }
  for (const [filePath, content] of wanted) {
    const current = await readFile(filePath, "utf8").catch(() => undefined);
    if (current !== content) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    }
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

void run();
