# Vending Bench

Run six vending machines for 30 simulated days. Commands spend time. Reading the screen does not. The score is the final bank balance on a completed run. An unfinished or bankrupt run scores zero.

## Run locally

Use Node 26 and the pnpm version in the package manifest.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:5173> to read the operating brief and start or resume a run. Select **Suppliers** to search for a supplier and request a quote. Placing an order pays immediately at current prices. The console accepts the same tool names and arguments as the benchmark, for example `read_notes {"key":"orders"}`. Use `help` for the command reference.

All cabinets share one depot and mailbox. Select **Depot** to inspect shared stock, or select a cabinet below it to service its slots. Select **Suppliers** to search; each supplier page holds its own orders. Selecting a room thumbnail opens a cabinet or the shared depot without spending time. No map clicks are necessary.

Select the bank balance to review daily balances and their receipts. After day 30, compare your score with the scripted operator and published solo model runs. A new run keeps the best completed trace for the same challenge in this browser.

## Saved runs

All saves for a challenge share one tree. Select **New** under **Day 1**, then **Start**, to play from scratch. To play from a later morning, select its box, then **Continue**. A box under **Day 2** holds the business as it stood after day 1. The top track is the scripted reference. Continuing a reference day restores its orders, deliveries, stock and prices.

Selection does not change a save. When a different path reaches the next day, its checkpoint appears below the source track. The original path remains available. The closing balance after the last day is a result, not another playable morning.

## Static export

Run `pnpm build`. Serve `apps/web/out/` with a static web server or use it as the output directory for Cloudflare Pages. The export includes the Python runtime and the simulation. Play needs no server code, external service or API key.

## Workspace

The pnpm workspace contains one application and two shared packages. `apps/web/src/app` owns the localized Next.js routes. Components render the workbench; hooks own interaction and simulator lifecycle; game modules handle commands and observations; scene modules draw the office. The worker runs in its own TypeScript environment and bundles to a classic worker for Pyodide.

`packages/common` owns shared types and schemas for the worker protocol, published data and saves. `packages/localize` generates page-specific messages. The app’s generators and tests live in `apps/web/scripts`. Run `pnpm quality:check` before committing. Run `pnpm build` and `pnpm --filter vending-bench-game test:export` to check the deployable files.

## Benchmark versions

The full [Vending Bench repository](https://github.com/ProsusAI/vending-bench) is a Git submodule. The `submodule` entry in `releases.json` selects its checked-out commit. Retain each released commit hash in the same list so its saves remain playable after an update. Two commits with the same upstream version get distinct entries.

The build reads each selected Git snapshot, not local edits to the submodule. It generates the engine archive, challenge conditions, briefing and tool descriptions. It runs the upstream scripted operator to obtain daily balances and checks the result against the published calibration when one exists. A new major version needs a compatible browser adapter. No native Python installation is required.

The v3 challenge includes the [solo runs from the two-agent study](https://github.com/ProsusAI/vending-bench/tree/0d9e1a1e/results/two-agent-seed1). Compare the latest solo attempt per model under matching conditions, not the best attempt. Exclude worker-assisted runs and other horizons. The study published final balances but not daily trajectories, so its entries appear as endpoints, not curves.

## Languages

The static language routes are `/en/`, `/es/` and `/de/`. The URL selects the language. The entry page uses the saved preference or browser language. All three routes share the same saved run. Games Localize generates message functions and collects the current route’s used translations during export. The simulator returns its original English mail and command reports.
