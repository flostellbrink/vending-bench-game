# Release status

The static export is ready for desktop playtests. Cross-device sign-off is open.

## Open before publication

- A human playtest of the first shift: can the player put a product on sale and say which action cost time?
- Desktop Safari and Firefox.
- Physical iOS and Android phones, including the open phone keyboard. Not a release gate.

## Competition

The game uses v3.0.0. The briefing, tools, engine, costs and rivals come from the pinned submodule commit. The scripted operator reproduces the published €3,302.96 for 30 days on seed 1. The latest solo attempt per model from the [two-agent study](https://github.com/ProsusAI/vending-bench/tree/0d9e1a1e/results/two-agent-seed1) shows as a final balance. No v2 scores ship.

## Playtest results

Agent playtests of the live game, not human usability studies.

- Two new reviewers put a product on sale in about 3 minutes and understood the final-balance goal from the first screen.
- A reviewer tested €2.00 instead of €1.50 for water on the same seed. On day 6, water sales fell from 1 to 0.
- A reviewer could not explain a €12 loss on a quiet day. The day-end statement now reconciles opening cash, credits, site fees and closing cash.
- A reviewer bought an old quote quantity by mistake. The order slip now blocks purchase until the quote matches the quantity.
- Reviewers took an earlier empty-slot reading for the current state. The cabinet now shows the refill result next to the slot, and the old reading stays unchanged.
- Without labels, a reviewer identified each room and the serviced cabinet.

## Known limits

- The interface has English, Spanish and German. Simulator mail and the operating brief stay in English.
- The full-screen CRT effect was removed. A player reported lag with it, and it could not be qualified on target hardware.

Measurements: [performance](performance.md).
