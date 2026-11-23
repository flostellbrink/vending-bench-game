import { execFileSync } from "node:child_process";
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
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide } from "pyodide";

const root = fileURLToPath(new URL("../", import.meta.url));
const upstream = join(root, "vendor/vending-bench");
const publicDir = join(root, "public");
const engine = "tasks/vending-bench/environment/sim-server";
const repoURL = "https://github.com/ProsusAI/vending-bench/blob/";

function git(...args) {
  return execFileSync("git", ["-C", upstream, ...args], { maxBuffer: 128 * 1024 * 1024 });
}

function writeJSON(path, data) {
  const temporary = path + ".tmp-" + process.pid;
  writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
  renameSync(temporary, path);
}

function sourceFiles(revision) {
  const paths = git("ls-tree", "-r", "--name-only", "-z", revision).toString().split("\0");
  return paths.filter(
    (path) =>
      (path.startsWith(engine + "/") && /\.(py|toml)$/.test(path)) ||
      [
        "scripts/local_run.py",
        "scripts/sync_config.py",
        "tasks/vending-bench/task.toml",
        "tasks/vending-bench/instruction.md",
        "tasks/vending-bench/instruction.template.md",
        "tasks/vending-bench/solution/reference_bot.py",
        "results/baselines/scripted-reference/results.json",
      ].includes(path) ||
      (path.startsWith("results/baselines/models-") &&
        [
          "README.md",
          "aggregate.json",
          "manifest.json",
          "result.json",
          "config.json",
          "evaluation-source.zip",
          "evaluation-source.sha256",
          "conversation.jsonl",
        ].includes(basename(path))),
  );
}

export async function readSnapshot(revision) {
  const python = await loadPyodide();
  const archive = git("archive", "--format=zip", revision, "--", ...sourceFiles(revision));
  python.unpackArchive(new Uint8Array(archive), "zip", { extractDir: "/upstream" });
  python.runPython(readFileSync(join(root, "reference.py"), "utf8"));
  return python;
}

async function metadata(revision) {
  const python = await readSnapshot(revision);
  const release = JSON.parse(python.runPython("metadata()"));
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(release.version)) {
    throw Error("Invalid upstream task version: " + release.version);
  }
  return release;
}

function assets(release) {
  const { revision, adapter } = release;
  const folder = "benchmarks/" + revision;
  mkdirSync(join(publicDir, folder), { recursive: true });
  const source = (path) => repoURL + revision + "/" + path;
  const rivals = release.rivals.map(({ values, sourcePath, ...rival }, i) => {
    const result = { ...rival, source: source(sourcePath) };
    if (values) {
      result.balances = folder + "/rival-" + i + ".json";
      writeJSON(join(publicDir, result.balances), values);
    }
    return result;
  });
  const archives = release.archives.map(({sourcePath,...cohort})=>({...cohort,source:source(sourcePath)}));
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
  return { ...release, engineArchive, adapter: adapterAsset, archives, rivals };
}

export async function readReleases(pins) {
  if (!pins.length) throw Error("Configure at least one benchmark source in releases.json.");
  if (!existsSync(join(upstream, ".git"))) {
    throw Error(
      "The Vending Bench submodule is missing. Run git submodule update --init --recursive.",
    );
  }
  const releases = [];
  for (const pin of pins) {
    if (pin.revision !== "submodule" && !/^[0-9a-f]{40}$/.test(pin.revision)) {
      throw Error("A historical release requires a full commit hash: " + pin.revision);
    }
    const ref = pin.revision === "submodule" ? "HEAD" : pin.revision;
    let revision;
    try {
      revision = git("rev-parse", "--verify", ref + "^{commit}")
        .toString()
        .trim();
    } catch (error) {
      throw new Error("Missing submodule commit " + ref + ". Fetch the submodule history.", {
        cause: error,
      });
    }
    if (releases.some((r) => r.revision === revision)) continue;
    try {
      const release = await metadata(revision);
      const adapter = "v" + release.version.split(".")[0] + ".py";
      if (!existsSync(join(publicDir, adapter))) throw Error("Missing browser adapter: " + adapter);
      releases.push({ ...release, revision, adapter });
    } catch (error) {
      throw new Error("Cannot build the Vending Bench catalog at " + revision, { cause: error });
    }
  }
  return releases.map((release) => {
    const collision = releases.some((r) => r !== release && r.version === release.version);
    const id = collision ? release.version + "+" + release.revision.slice(0, 12) : release.version;
    return { ...release, id };
  });
}

if (import.meta.main) {
  const pins = JSON.parse(readFileSync(join(root, "releases.json"), "utf8"));
  const releases = await readReleases(pins);
  const catalog = releases.map(assets);
  const oldCatalog = join(publicDir, "releases.json");
  if (existsSync(oldCatalog)) {
    for (const old of JSON.parse(readFileSync(oldCatalog))) {
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
  const destination = join(root, "src/generated");
  mkdirSync(destination, { recursive: true });
  mkdirSync(join(publicDir, "python"), { recursive: true });
  for (const file of [
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
  ]) {
    cpSync(join(root, "node_modules/pyodide", file), join(publicDir, "python", file));
  }
  for (const file of ["NOTICE", "LICENSE"]) {
    cpSync(join(publicDir, "benchmarks", catalog[0].revision, file), join(publicDir, file));
  }
  writeJSON(join(destination, "releases.json"), catalog);
  writeJSON(join(publicDir, "releases.json"), catalog);
}
