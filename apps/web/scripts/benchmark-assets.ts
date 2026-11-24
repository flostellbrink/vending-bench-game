import type { Release } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as v from "valibot";

import {
  app,
  root,
  publicDir,
  engine,
  git,
  pinSchema,
  readReleases,
  type SnapshotRelease,
} from "./benchmark-source.ts";

const previousCatalogSchema = v.array(
  v.object({ id: v.string(), revision: v.string(), engineArchive: v.optional(v.string()) }),
);

const repoURL = "https://github.com/ProsusAI/vending-bench/blob/";

function writeJSON(path: string, data: unknown) {
  const temporary = path + ".tmp-" + process.pid;
  writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
  renameSync(temporary, path);
}

function assets(release: SnapshotRelease): Release {
  const { revision, adapter } = release;
  const folder = "benchmarks/" + revision;
  mkdirSync(join(publicDir, folder), { recursive: true });
  const scriptedReplay = folder + "/scripted-replay.json";
  writeJSON(join(publicDir, scriptedReplay), { revision, ...release.scriptedReplay });
  const source = (path: string) => repoURL + revision + "/" + path;
  const rivals = release.rivals.map(({ values, sourcePath, ...rival }, i) => {
    const published = { ...rival, source: source(sourcePath) };
    if (!values) return published;
    const balances = folder + "/rival-" + i + ".json";
    writeJSON(join(publicDir, balances), values);
    return { ...published, balances };
  });
  const mtime = git("show", "-s", "--format=%cI", revision).toString().trim();
  const engineArchive = folder + "/engine.zip";
  const zip = join(publicDir, engineArchive);
  const temporary = zip + ".tmp-" + process.pid;
  git(
    "archive",
    "--format=zip",
    "--mtime=" + mtime,
    "--output=" + temporary,
    revision + ":" + engine,
    "vending",
  );
  renameSync(temporary, zip);
  for (const notice of ["LICENSE", "NOTICE"]) {
    writeFileSync(join(publicDir, folder, notice), git("show", revision + ":" + notice));
  }
  const adapterSource = readFileSync(join(publicDir, adapter));
  const hash = createHash("sha256").update(adapterSource).digest("hex");
  const adapterAsset = folder + "/adapter-" + hash.slice(0, 16) + ".py";
  writeFileSync(join(publicDir, adapterAsset), adapterSource);
  return { ...release, scriptedReplay, engineArchive, adapter: adapterAsset, rivals };
}

if (import.meta.main) {
  const pins = v.parse(
    v.array(pinSchema),
    JSON.parse(readFileSync(join(root, "releases.json"), "utf8")),
  );
  const releases = await readReleases(pins);
  const catalog = releases.map(assets);
  const oldCatalog = join(publicDir, "releases.json");
  if (existsSync(oldCatalog)) {
    for (const old of v.parse(
      previousCatalogSchema,
      JSON.parse(readFileSync(oldCatalog, "utf8")),
    )) {
      if (!old.engineArchive && /^[\w.+-]+$/.test(old.id)) {
        rmSync(join(publicDir, old.id + ".zip"), { force: true });
      }
      if (
        /^[0-9a-f]{40}$/.test(old.revision) &&
        !catalog.some((r) => r.revision === old.revision)
      ) {
        rmSync(join(publicDir, "benchmarks", old.revision), { recursive: true, force: true });
      }
    }
  }
  const destination = join(app, "src/generated");
  mkdirSync(destination, { recursive: true });
  mkdirSync(join(publicDir, "python"), { recursive: true });
  for (const file of [
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
  ]) {
    cpSync(join(app, "node_modules/pyodide", file), join(publicDir, "python", file));
  }
  for (const file of ["NOTICE", "LICENSE"]) {
    cpSync(
      join(publicDir, "benchmarks", assertValue(catalog[0]).revision, file),
      join(publicDir, file),
    );
  }
  writeJSON(join(destination, "releases.json"), catalog);
  writeJSON(join(publicDir, "releases.json"), catalog);
}
