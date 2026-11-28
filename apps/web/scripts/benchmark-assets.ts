import type { Release } from "games-common/benchmark";

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  app,
  publicDir,
  engine,
  git,
  readRelease,
  type SnapshotRelease,
} from "./benchmark-source.ts";

const repoURL = "https://github.com/ProsusAI/vending-bench/blob/";
const hashPrefixLength = 16;

function writeJSON(path: string, data: unknown) {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(temporary, path);
}

function assets({ browserTools, ...release }: SnapshotRelease): Release {
  const { revision, adapter } = release;
  const folder = `benchmarks/${revision}`;
  mkdirSync(join(publicDir, folder), { recursive: true });
  const source = (path: string) => `${repoURL}${revision}/${path}`;
  const rivals = release.rivals.map(({ values, sourcePath, replay, ...rival }, i) => {
    const published = { ...rival, source: source(sourcePath) };
    if (replay && !values) {
      throw new Error(`A replayed run needs its daily balances: ${sourcePath}`);
    }
    if (!values) {
      return published;
    }
    const balances = `${folder}/rival-${i}.json`;
    writeJSON(join(publicDir, balances), values);
    if (!replay) {
      return { ...published, balances };
    }
    const moves = `${folder}/replay-${i}.json`;
    writeJSON(join(publicDir, moves), { revision, ...replay });
    return { ...published, balances, replay: moves, values };
  });
  const mtime = git("show", "-s", "--format=%cI", revision).toString().trim();
  const engineArchive = `${folder}/engine.zip`;
  const zip = join(publicDir, engineArchive);
  const temporary = `${zip}.tmp-${process.pid}`;
  git(
    "archive",
    "--format=zip",
    `--mtime=${mtime}`,
    `--output=${temporary}`,
    `${revision}:${engine}`,
    "vending",
  );
  renameSync(temporary, zip);
  for (const notice of ["LICENSE", "NOTICE"]) {
    writeFileSync(join(publicDir, folder, notice), git("show", `${revision}:${notice}`));
  }
  const adapterSource = `${readFileSync(join(publicDir, adapter), "utf8")}\n${browserTools}\n`;
  const hash = createHash("sha256").update(adapterSource).digest("hex");
  const adapterAsset = `${folder}/adapter-${hash.slice(0, hashPrefixLength)}.py`;
  writeFileSync(join(publicDir, adapterAsset), adapterSource);
  return { ...release, adapter: adapterAsset, engineArchive, rivals };
}

if (import.meta.main) {
  const release = assets(await readRelease());
  const benchmarks = join(publicDir, "benchmarks");
  for (const folder of existsSync(benchmarks) ? readdirSync(benchmarks) : []) {
    if (folder !== release.revision) {
      rmSync(join(benchmarks, folder), { force: true, recursive: true });
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
  writeJSON(join(destination, "release.json"), release);
}
