# Vending Bench

A browser game of [Prosus Vending Bench](https://github.com/ProsusAI/vending-bench): run six vending machines for 30 simulated days and compare your final balance with the scripted operator and published model runs.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` writes a static site to `apps/web/out/`. It needs no server or API key. `wrangler deploy` publishes it to Cloudflare.

The game supports only the benchmark commit that the submodule pins. The build needs the full submodule history to verify the published study runs.

Design, release goal and status: [docs](docs/).
