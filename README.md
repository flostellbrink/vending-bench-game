# Vending Bench

Run six vending machines for 30 simulated days. Commands spend time. Reading the screen does not. The score is the final bank balance on a completed run. An unfinished or bankrupt run scores zero.

## Run locally

Use Node 26 and the pnpm version in the package manifest.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:5173>. Type `help` or press Tab at the empty prompt. Use `find snacks` to search for suppliers. Inspect a machine with `inspect lounge.snack`. The map follows the address you type; no map clicks are necessary.

## Static export

Run `pnpm build`. Serve the contents of `out/` with a static web server, or use it as the output directory for Cloudflare Pages. The export includes the Python runtime and the simulation. Play needs no server code, external service or API key. Each browser stores its own run.

## Benchmark versions

The complete [Vending Bench repository](https://github.com/ProsusAI/vending-bench) is a Git submodule. Each entry in `releases.json` selects a revision, engine directory, browser adapter, seed, challenge length and rivals. The build reads the selected revision from Git. Updating the submodule does not change existing entries. Keep each released entry and its adapter unchanged so saved commands replay under the original rules.

For each rival, supply daily bank balances from the same revision, seed and challenge length, starting with the opening balance. Set `kind` to `script` for a scripted operator or `model` for a named AI model. Do not infer a daily balance from a final score. The [historical model scores](https://github.com/ProsusAI/vending-bench/tree/main/results/baselines/models-30d) are separate from the active challenge.

## Languages

English, Spanish and German interface messages use the Games Localize package and its YAML dictionary. The simulator returns its original English mail and command reports.
