import { releaseSchema, replaySchema, rivalSchema } from "games-common/benchmark";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide } from "pyodide";
import * as v from "valibot";

export const sourceRivalSchema = v.object({
  ...v.omit(rivalSchema, ["source", "balances", "values", "replay"]).entries,
  replay: v.optional(v.omit(replaySchema, ["revision"])),
  sourcePath: v.string(),
  values: v.nullish(v.array(v.number())),
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
    "toolDefaults",
    "toolParameters",
    "reportLimits",
  ]).entries,
  rivals: v.array(sourceRivalSchema),
});
type Metadata = v.InferOutput<typeof metadataSchema>;
export interface SnapshotRelease extends Metadata {
  browserTools: string;
  revision: string;
  adapter: string;
}

export function pythonJSON(
  python: Awaited<ReturnType<typeof loadPyodide>>,
  expression: string,
): unknown {
  const json: unknown = python.runPython(expression);
  return JSON.parse(v.parse(v.string(), json));
}

export const app = fileURLToPath(new URL("../", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const upstream = join(root, "vendor/vending-bench");
export const publicDir = join(app, "public");
export const engine = "tasks/vending-bench/environment/sim-server";

const bytesPerMebibyte = 1_048_576;
const maxGitOutputMebibytes = 128;

export function git(...args: string[]) {
  return execFileSync("git", ["-C", upstream, ...args], {
    maxBuffer: maxGitOutputMebibytes * bytesPerMebibyte,
  });
}

function resolveCommit(ref: string) {
  try {
    return git("rev-parse", "--verify", `${ref}^{commit}`).toString().trim();
  } catch (error) {
    throw new Error(`Missing submodule commit ${ref}. Fetch the submodule history.`, {
      cause: error,
    });
  }
}

function evaluationFile(path: string) {
  return (
    (path.startsWith(`${engine}/`) && /\.(?:py|toml)$/.test(path)) ||
    /^(?:scripts|tests)\/[^/]+\.py$/.test(path) ||
    /^tasks\/vending-bench\/instruction[^/]*\.md$/.test(path)
  );
}

function sourceFiles(revision: string) {
  const paths = git("ls-tree", "-r", "--name-only", "-z", revision).toString().split("\0");
  return paths.filter(
    (path) =>
      evaluationFile(path) ||
      ["tasks/vending-bench/task.toml", "tasks/vending-bench/solution/reference_bot.py"].includes(
        path,
      ) ||
      (path.startsWith("results/baselines/models-") &&
        [
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
    throw new Error(`Invalid upstream task version: ${release.version}`);
  }
  return { ...release, browserTools: v.parse(v.string(), python.runPython("browser_tools()")) };
}

export async function readRelease(): Promise<SnapshotRelease> {
  if (!existsSync(join(upstream, ".git"))) {
    throw new Error(
      "The Vending Bench submodule is missing. Run git submodule update --init --recursive.",
    );
  }
  const revision = resolveCommit("HEAD");
  try {
    const release = await metadata(revision);
    const adapter = `v${release.version.split(".")[0]}.py`;
    if (!existsSync(join(publicDir, adapter))) {
      throw new Error(`Missing browser adapter: ${adapter}`);
    }
    return { ...release, adapter, revision };
  } catch (error) {
    throw new Error(`Cannot read the Vending Bench release at ${revision}`, { cause: error });
  }
}
