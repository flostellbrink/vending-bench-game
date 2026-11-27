# Project structure

Use the pnpm workspace and catalog. The game client is in `apps/web`. Keep Next.js routes thin. Put rendering in components and scene modules, interaction and worker lifecycle in hooks, and simulation-facing operations in game modules. Keep reusable contracts and boundary schemas in `packages/common`. Use `packages/localize` for localized routes and messages.

Write first-party client, worker, generator and test code in strict TypeScript. Use TSX for React components. Import the type from its owner. Validate external data at the boundary; do not use a type assertion or checker suppression in place of validation. The vendored benchmark and its browser adapter remain Python. Do not edit or track generated dictionaries, catalogs, worker bundles or export files.

Run `pnpm quality:check`, `pnpm build` and `pnpm --filter vending-bench-game test:export`. The export has no backend. Do not add game-server infrastructure, screenshot pipelines or a 3D renderer.

# Pull requests

A PR title is a plain title, without a conventional commit prefix. The description is two lines, `What: <the change>` and `Why: <the reason>`, one sentence or two each, followed by the signature line.
