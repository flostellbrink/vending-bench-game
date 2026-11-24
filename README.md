# Vending Bench

Run six vending machines for 30 simulated days. Commands spend time. Reading the screen does not. The score is the final bank balance on a completed run. An unfinished or bankrupt run scores zero.

## Run locally

Use Node 26 and the pnpm version in the package manifest.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:5173>, select the benchmark version, then start or resume a run. Type `help` or press Tab at the empty prompt. `brief` opens the operating rules. Use `find snacks` to search for suppliers, or open the depot and use its supplier directory. A supplier’s quote doubles as an order slip. Its price applies to the quoted quantity; placing the order pays immediately. The map follows the address you type; no map clicks are necessary.

Use `balance` to review daily balances, `tabs` to list receipts, or `view <result>` to reopen one. The office remains visible above the report. After day 30, `scores` compares your score with the reference operator. A new run keeps the best completed trace for the same challenge in this browser.

## Saved runs

Each new run gets its own slot in this browser. In **Saved runs**, select the diamond to resume a run at its latest command. Select a numbered day to start a separate branch from that morning. The original run, its later days and other branches remain available. A branch uses the same benchmark revision and seed as its parent.

Older saves appear alongside new slots. Resume an older save once to reconstruct its morning checkpoints from its command journal.

## Static export

Run `pnpm build`. Serve `apps/web/out/` with a static web server or use it as the output directory for Cloudflare Pages. The export includes the Python runtime and the simulation. Play needs no server code, external service or API key.

## Workspace

The pnpm workspace contains one application and two shared packages. `apps/web/src/app` owns the localized Next.js routes. Components render the workbench; hooks own interaction and simulator lifecycle; game modules handle commands and observations; scene modules draw the office. The worker runs in its own TypeScript environment and bundles to a classic worker for Pyodide.

`packages/common` owns shared types and schemas for the worker protocol, published data and saves. `packages/localize` generates page-specific messages. The app’s generators and tests live in `apps/web/scripts`. Run `pnpm quality:check` before committing. Run `pnpm build` and `pnpm --filter vending-bench-game test:export` to check the deployable files.

## Benchmark versions

The full [Vending Bench repository](https://github.com/ProsusAI/vending-bench) is a Git submodule. The `submodule` entry in `releases.json` selects its checked-out commit. Retain each released commit hash in the same list so its saves remain playable after an update. Two commits with the same upstream version get distinct entries.

The build reads each selected Git snapshot, not local edits to the submodule. It generates the engine archive, challenge conditions, briefing and tool descriptions. It runs the upstream scripted operator to obtain daily balances and checks the result against the published calibration when one exists. A new major version needs a compatible browser adapter. No native Python installation is required.

The playable challenge uses v3 and its scripted reference run. Model trials must match the engine, configuration, seed and horizon to count as rivals. Recorded daily balances form a trace; a final score alone gives only an endpoint.

## Languages

The static language routes are `/en/`, `/es/` and `/de/`. The URL selects the language. The entry page uses the saved preference or browser language. All three routes share the same saved run. Games Localize generates message functions and collects the current route’s used translations during export. The simulator returns its original English mail and command reports.
