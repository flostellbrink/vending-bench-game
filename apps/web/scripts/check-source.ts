import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
const unchecked = files
  .split("\0")
  .filter((file) => /\.(?:js|jsx|cjs|mjs)$/.test(file) && existsSync(join(root, file)));
if (unchecked.length) {
  throw new Error(`First-party JavaScript bypasses the TypeScript check:\n${unchecked.join("\n")}`);
}
