# Vending Bench release goal

Ship a static, keyboard-first frontend for Vending Bench. The player chooses a benchmark version, operates the business under its rules, and tries to beat the published AI runs. The version selector is the only challenge setup. There is no authored campaign, tutorial sequence, level progression or separate game economy. Aim for the craft of a Zachtronics release in how it feels to operate the benchmark.

## Production scope

Use six months of focused work by one highly skilled indie developer as the reference size for the **finished game**, not as a deadline, a maximum or a reason to stretch a prototype. The benchmark engine already exists. Count the design, art, interaction, integration, playtesting and revision needed to make the player-facing game.

The release is a remote-operations game about running a vending business on imperfect information. Its main creative investment is the relationship between three things: what the operator knows, what the buildings are doing, and what the business can afford. The following is a production estimate, not a sequence of feature sprints:

- **Four developer-weeks: version selection and AI competition.** Pin each supported engine and associate it with its actual run conditions and published results. Make it clear who the player is competing against. Plot daily balances when recorded; show final scores as endpoints when that is all the source provides. Never present another version’s score as a target or a scripted operator as an AI. If no comparable AI results exist yet, say so.
- **Five weeks: build the operator’s workbench.** Design one command vocabulary for procurement, service, pricing, correspondence and analysis. Make discovery, completion, correction, recall and repeat operations feel like using a practiced instrument. A player must be able to investigate a discrepancy across a supplier quote, depot receipt and cabinet inspection without losing their place or paying twice to read the same facts.
- **Six weeks: art-direct and animate the business.** Author three identifiable offices and a working depot, their outdoor edges, machine types and service states in a shared visual language. Give each place a recognizable use and composition. Show the passage of a working day and the consequences of operator actions, including quieter periods and night settlement. Budget for composition studies, discarded art and motion passes, not just asset count.
- **Three weeks: turn a run into a story the player can inspect.** Connect orders, arrivals, service, sales and bank movements through dated evidence. Let the player answer “why did this site stop earning?” without reading an undifferentiated log. End with a useful comparison and make the next attempt test a specific idea. A personal best is a reference run, not just a number.
- **Three weeks: finish the product around the game.** Cover first launch and return, save integrity, long transcripts, translated routes and layouts, static delivery, accessibility and hardware costs. Keep desktop first without making the phone version a different game.
- **Three weeks: independent playtests and revision.** Reserve real production effort for watching fresh players, replacing a failed interaction, redrawing a scene that fails at play size, and removing attractive work that makes play worse. Review throughout development; these weeks account for the resulting changes.

This is roughly 24 developer-weeks. Rebalance them when evidence changes the design. Spend that effort on faithful benchmark operation, useful comparisons, artwork, responsiveness and interaction quality rather than adding more content.

## What polish feels like

The player should spend their attention on the business decision, not on translating that decision into interface steps. The office should also be worth looking at when there is nothing to click. Both are release criteria.

Use one ordinary refill as the quality reference. At 10:15 the player sees that B2 held two packs at the last inspection. They start typing. Completion identifies the cabinet and shows the age of the reading; it does not imply there are still two packs. The quote they were comparing stays open. The prompt stays under their fingers. Before Enter, they can see that the trip costs 45 minutes. After Enter, the cabinet door swings from its hinge, the wall clock advances and sunlight moves across the room. At 11:00 the scene settles. The receipt says how many packs actually fit and whether they can sell. The player can type the next command without dismissing anything. **Judge the whole sequence at play speed, not its individual screenshots.**

- **Art has a point of view.** Cover the terminal and labels. The lounge should still look like somewhere people take a break; the depot should look like somewhere goods arrive. In the chosen reference, the sofa faces a table, the cabinets can be serviced from the aisle, and winter pavement continues past the full-height back walls. Those relationships make a place. Four copies of a room with different props do not. Judge silhouette, light, scale and composition at normal play size, with CRT off.
- **The ordinary path feels good on the fiftieth use.** The first refill must be legible; the fiftieth must be quick. The player can recall the command, change only the quantity, and execute it while reading the old receipt. No compulsory animation wait, repeated explanation, focus change or mouse trip. Preserve the pleasure of seeing the action without making the player wait for the presentation.
- **The awkward path gets the same care.** Try to buy below the supplier minimum, refill a nearly full slot, and return to a quote after its expiry. In each case the player can tell what happened, what it cost, what did not change, and how to recover. A raw simulator error followed by a blank prompt is not a finished interaction.
- **Every surface tells the same truth.** If only three packs fit, the receipt reports three, the cabinet shows the observed result, and a previous inspection remains a dated record. Do not silently rewrite history to make the screens agree. Use distinct treatments for a proposed action, an observed fact and an unknown value.
- **The game rewards judgment, not endurance.** A cheap bulk offer should create a real question: buy now, or keep enough cash and working time for the next delivery? Afterward the player should be able to trace a stockout or a late recovery to their own decision. A scorecard that says only “you lost by €400” ends the run but does not invite another one.

For each review, name the strongest moment worth preserving and the weakest moment that still feels like a prototype. Describe the exact action and what broke: “I lost my quote when I asked for help” is actionable; “needs more polish” is not. Fix the weakest consequential moment before adding another effect. Passing technical checks establishes that the game works, not that it feels finished.

## What the player must be able to do

- **Learn without a walkthrough.** Give two independent reviewers a clean save and only the game link. Within ten minutes each, they should understand the objective, get a product on sale, and explain one decision about time or money. Record where they hesitate. Do not tell them the command sequence.
- **Operate without friction.** Complete the business loop by keyboard. Discovery, completion, history and reports must work together. Looking up syntax or rereading an observation must not spend time, move the prompt or hide the world. Make the cost of an action visible before execution and its outcome clear afterward.
- **Read the world.** At actual play size, a reviewer should be able to identify the serviced cabinet and see time pass without reading the receipt. Use a consistent projection, light source, material palette and scale. Keep the full rear walls and the small exterior visible beyond the cutaway. Art must work in motion as well as in a still.
- **Learn from a run.** After finishing, a player should be able to cite an observation, name a decision they would change, and test it on the same seed. Compare against the previous record before replacing it. Keep comparisons between matching rules, seeds and horizons.

## Performance and compatibility

Desktop is the design target. A phone gets the same game, not a reduced menu-driven replacement. Support the static export in current Chrome, Firefox and Safari, including Android and iOS. Test a laptop with integrated graphics at native pixel density, a high-density desktop display, and a mid-range phone. Record actual devices, browsers, viewport sizes and gaps in coverage. Emulation is useful but does not prove real-device performance.

- Target a visible response to typing or completion within 50 ms at the 95th percentile on desktop and 100 ms on the phone. Measure during a late-game run with a long transcript, not only at an empty prompt.
- Target 60 frames per second on desktop and at least 30 on the phone during a service visit or overnight transition. Record frame times, CPU time and available GPU measurements with CRT on and off. A steady animation callback rate alone does not establish low rendering cost. When simulated time stops, stop scene work.
- Measure cold start to the first usable prompt and to the first executable simulation command separately. Report transfer size, cache state, network and device. Report memory after a full run and several restarts; old workers and detached scenes must not accumulate.
- Keep input and results reachable at supported sizes, with zoom and the phone keyboard open. Respect reduced motion and high contrast.
- **CRT is optional.** Keep it only if the curved-glass effect looks convincing at play size and meets the interaction and rendering budgets on actual target hardware. If there is no clear, affordable way to achieve both, remove the effect and its switch. A scanline overlay is not a substitute.
- Keep the engine local, the benchmark pinned, and the deployment static. Verify locale URLs, refresh, save replay and a completed run from the exported files. Do not claim support for an environment that was not tested.

## How to iterate

1. Start each pass with one observed player problem, a baseline, a time budget and a test that could show the idea failed. Queue new feedback in the scratchpad. Reorder work when evidence changes its importance, not because it arrived last.
2. Keep a fast route to the exact moment under review: a clean start, a supplier decision, a refill, a long transcript or a final score. Use reproducible saves for engineering checks and clean saves for discovery reviews. Measure edit-to-play time; fix the development loop if setup or rebuilding takes more time than evaluating the change.
3. Use subagents in parallel at milestones: one plays without the design document; another challenges the interaction, art in motion or performance evidence. Ask what happened, what they expected and what decision they could not make. Source inspection is not a playtest. Agent reviews do not replace human taste or real-device testing.
4. After each substantial pass, record elapsed time, the player-visible difference, the result of the same task and the largest remaining obstacle. If two attempts leave the same blocker, stop tuning that approach. Replace it, simplify it or cut it.

## Exit condition

Deliver a playable release candidate, not a claim of artistic greatness. Include the build, a short account of the cold-player and replay reviews, the performance measurements, and the remaining rough edges. Distinguish passed, failed and untested checks. A reviewer must be able to disagree with the release recommendation using the evidence supplied.
