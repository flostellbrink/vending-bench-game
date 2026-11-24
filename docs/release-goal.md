# Release goal

A static, keyboard-first game of Vending Bench. The player selects a benchmark version, runs the business under its rules and tries to beat the published runs. There is no campaign, tutorial, level progression or separate economy.

## Scope

About 24 weeks of work for one skilled developer. This is a size reference, not a deadline. Spend it on faithful operation, useful comparisons, art and responsiveness, not more content.

- **Version selection and competition (4 weeks):** pin each engine with its run conditions and results. Never show another version's score as a target, or the scripted operator as an AI.
- **Workbench (5 weeks):** one command vocabulary for buying, service, pricing, mail and analysis. The player can compare a quote, a depot receipt and a cabinet reading without paying twice.
- **Art and animation (6 weeks):** three offices and a depot that each look like their purpose, and show the day passing and the result of each action.
- **Run review (3 weeks):** link orders, deliveries, service, sales and bank movements by date. The player can answer "why did this site stop earning?"
- **Product finish (3 weeks):** first launch and return, save integrity, long transcripts, translations, static delivery, accessibility.
- **Playtests and revision (3 weeks).**

## Quality bar

- The player thinks about the business, not the interface.
- A routine refill is quick on the fiftieth use: recall the command, change the quantity, run it. No forced wait or focus change.
- Errors are clear. Below the supplier minimum, a nearly full slot or an expired quote: the player sees what happened, what it cost and how to recover.
- All screens agree. If 3 packs fit, the receipt, the cabinet and the record all say 3. Old readings stay dated, not rewritten.
- Art works with the labels covered and in motion, at play size.
- A finished run shows a decision the player can change and test on the same seed.

For each review, name the best moment and the weakest moment, with the exact action.

## Player tests

- Two new reviewers, with only the link, understand the goal, put a product on sale and explain one time or money decision within ten minutes.
- The full business loop works by keyboard.
- A reviewer can identify the serviced cabinet and see time pass without reading the receipt.

## Performance

Desktop with a keyboard comes first. A narrow screen must stay usable. Phone tests are coverage, not a release gate.

- Typing or completion responds within 50 ms at p95 late in a long run.
- 60 frames per second during service visits and overnight transitions. No scene work while time is stopped.
- Measure cold start to prompt and to first command separately, with transfer size and cache state.
- No worker or scene accumulation after a full run and several restarts.
- Support zoom, reduced motion and high contrast.
- Test current desktop Chrome, Firefox and Safari. Do not claim an untested environment.

## How to iterate

1. Start each pass from one observed player problem, with a baseline and a test that can fail.
2. Keep a fast route to the moment under review: a clean start, a supplier choice, a refill, a long run, a final score.
3. Use fresh reviewers who have not read the design. Agent reviews do not replace human taste or real devices.
4. If two attempts leave the same blocker, replace, simplify or cut the approach.

## Exit condition

A playable release candidate with the build, the player reviews, the performance results and the open issues. Separate passed, failed and untested checks.
