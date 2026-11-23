import { archiveSchema, releaseSchema, rivalSchema } from "games-common/benchmark";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

export const pinSchema = v.object({ revision: v.string() });
type Pin = v.InferOutput<typeof pinSchema>;
export const sourceRivalSchema = v.object({
  ...v.omit(rivalSchema, ["source", "balances", "values"]).entries,
  sourcePath: v.string(),
  values: v.nullish(v.array(v.number())),
});
export const sourceArchiveSchema = v.object({
  ...v.omit(archiveSchema, ["source"]).entries,
  sourcePath: v.string(),
});
const metadataSchema = v.object({
  ...v.pick(releaseSchema, [
    "version",
    "days",
    "seed",
    "startingBalance",
    "currency",
    "brief",
    "network",
    "tools",
  ]).entries,
  rivals: v.array(sourceRivalSchema),
  archives: v.array(sourceArchiveSchema),
});
type Metadata = v.InferOutput<typeof metadataSchema>;
export interface SnapshotRelease extends Metadata {
  revision: string;
  adapter: string;
  id: string;
}

export function pythonJSON(
  python: Awaited<ReturnType<typeof loadPyodide>>,
  expression: string,
): unknown {
  const json: unknown = python.runPython(expression);
  return JSON.parse(v.parse(v.string(), json));
}

export const app = fileURLToPath(new URL("../", import.meta.url));
export const root = fileURLToPath(new URL("../../../", import.meta.url));
const upstream = join(root, "vendor/vending-bench");
export const publicDir = join(app, "public");
export const engine = "tasks/vending-bench/environment/sim-server";

export function git(...args: string[]) {
  return execFileSync("git", ["-C", upstream, ...args], { maxBuffer: 128 * 1024 * 1024 });
}

function sourceFiles(revision: string) {
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

export async function readSnapshot(revision: string) {
  const python = await loadPyodide();
  const archive = git("archive", "--format=zip", revision, "--", ...sourceFiles(revision));
  python.unpackArchive(new Uint8Array(archive), "zip", { extractDir: "/upstream" });
  python.runPython(readFileSync(join(root, "reference.py"), "utf8"));
  return python;
}

async function metadata(revision: string) {
  const python = await readSnapshot(revision);
  const release = v.parse(metadataSchema, pythonJSON(python, "metadata()"));
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(release.version)) {
    throw Error("Invalid upstream task version: " + release.version);
  }
  return release;
}

export async function readReleases(pins: Pin[]): Promise<SnapshotRelease[]> {
  if (!pins.length) throw Error("Configure at least one benchmark source in releases.json.");
  if (!existsSync(join(upstream, ".git"))) {
    throw Error(
      "The Vending Bench submodule is missing. Run git submodule update --init --recursive.",
    );
  }
  const releases: Omit<SnapshotRelease, "id">[] = [];
  for (const pin of pins) {
    if (pin.revision !== "submodule" && !/^[0-9a-f]{40}$/.test(pin.revision)) {
      throw Error("A historical release requires a full commit hash: " + pin.revision);
    }
    const ref = pin.revision === "submodule" ? "HEAD" : pin.revision;
    let revision: string;
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
