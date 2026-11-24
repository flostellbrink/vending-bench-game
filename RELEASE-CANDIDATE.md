# Release candidate

The static export is ready for desktop playtesting. Desktop Chrome has gameplay and performance evidence. Cross-device release sign-off is still open.

## Competition and fidelity

The game uses v3.0.0. The briefing, tool descriptions, engine, costs and rival data come from the submodule’s Git snapshot. Only the scripted reference ships. No v2 scores are included. A future model result must match the engine, configuration, horizon and seed.

The generator reproduced the 30-day, seed-1 scripted result of €3,302.96 from the upstream bot. A synthetic publication test exercises both recorded daily balances and an endpoint-only model result. Synthetic trials are not shipped. See the [upstream results](https://github.com/ProsusAI/vending-bench/tree/60794b49932294a0fcb3fcf9a5ca3aaaa0c8a282/results).

## Player reviews

- **Before revision:** One reviewer found the objective in the welcome letter, bought chocolate and water, and finished with €1,284.90. The other ordered stock but stopped on day 2 before it arrived. Both noticed that the simulator told them to type tool names the shell did not accept.
- **After revision:** Two new reviewers independently got products selling in about two minutes. Both understood the final bank balance objective from the opening screen. One compared water and cola before buying 160 bottles; the first five sales earned €8.75. The other stocked one slot before expanding and saw that the first day's revenue did not cover the site fee.
- **Replay:** A returning reviewer tested €2.00 instead of €1.50 for water on the same seed, leaving the order, timing, slots and chocolate price unchanged. On day 6, water sales went from one to zero; chocolate stayed at one bar. Gross revenue fell from €3.30 to €1.80. This is evidence for that day, not a claim about the full run.
- **Art and interaction:** A reviewer valued seeing the terminal and lounge together, but could not explain why a quiet day cost €12. The day-end statement now reconciles opening cash, net bank credits, site fees and closing cash. The office remains visible.
- **Purchase slip:** A reviewer changed the quantity for a new quote, then accidentally bought the old quantity. The revised form calls the field “Units for new quote” and blocks purchase until the quote matches. On retest, refreshing took 25 minutes without debiting cash. A pointer purchase of 40 tortilla chips at €2.34 debited exactly €93.60 and gave the delivery day. The previous control overlap did not recur.

These are independent agent playtests of the live game, not human usability studies.

Two reviewers started at New in the day-selection tree. One put 18 chocolate bars on sale in 2 minutes 43 seconds, choosing the 20% discount. The other stocked ten sparkling waters in 3 minutes 2 seconds and chose Main Lounge for its higher footfall. Both saw the refill receipt but mistook the earlier empty-slot inspection for the present reading. In the revised cabinet editor, a refill from 0/10 to 3/10 now shows 3/10 beside the slot, with a link to the refill receipt. Reopening the original inspection still shows 0/10.

With the receipt and caption hidden, a reviewer identified the cabinet the attendant approached. The spiral shelves distinguished the snack machine from the bottle machine. The walking motion alone did not distinguish inspection from refill. In reduced-motion mode, the clock went straight to the receipt time and the selected cabinet stayed lit.

At 1280×720 without labels, a reviewer identified the break room from its sofa and bookshelf, the workspace from its desks and monitors, and the depot from its pallet truck and loading door. The Main Lounge’s repeated benches also suggested a corridor; the revised room has facing seats around a table with a pendant light. During a three-cola refill, only the right-hand drinks cabinet opened. The clock advanced from 09:00 to 09:45 without moving the selected slot or changing the terminal draft.

For an inspection at 16:55, the attendant was visible until 16:59 and gone at the 17:00 close. The scene then passed through night and reached 09:00 in 3.07 seconds from dispatch. With reduced motion on, a second inspection at 16:55 reached morning within 194 ms without a visible overnight sequence.

## Follow-up design studies

The [last-hour study](design/CONCEPTS.md) tests whether players can see which action an inspection postpones. In the save tree, New is below Day 1, and the scripted reference occupies the first track. Day 2 selects the state after day 1. Selection does not start play.

Continuing from the reference on day 12 produced no new box until day 13 opened at €793.99. Continuing from that box and spending €2 produced a second day-14 balance of €856.85 below the original €858.85. Both paths remained playable.

A supplier reviewer could find an offer but needed shell help to send a letter. On the revised slip, drafting cost nothing, sending cost 25 simulated minutes, and the next morning’s letter confirmed improved terms without disclosing new prices. In a seed-1 run, a second paid quote for 20 colas showed €0.96 per unit against the earlier €1.18. The slip compares observed prices at the same quantity; it does not promise an unobserved discount.

## Engineering checks

In a fresh day-6 playtest, the depot held 100 stroopwafels and 100 large cola bottles. Small slot A1 offered the stroopwafels but not the cola. Drafting a refill for 12 packs left the clock at 09:50. Dispatch moved it to 10:35 and produced a 12/18 cabinet reading. The previous depot receipt still showed 100; a new inspection showed 88.

The integrated path exercised supplier discovery, offer lookup, purchase, delivery, depot inspection, refill, price setting and sales. A requested refill of 100 packs loaded 18. The receipt showed both the partial fill and the missing price. A matching quote showed a projected €76.80 purchase; after expiry the estimate disappeared. Looking at an existing quote did not spend time.

A completed €1,099.20 run was followed by a €1,140.00 run. The scorecard showed a €40.80 improvement against the previous record, including after switching to German and reloading. A stale tab could not overwrite a newer command; it restored the saved run and reported the conflict.

A live branch that spent €20 showed €1,456 at the day-2 close against the original track’s €1,476. In a separate browser check, closing the reference operator’s last day showed €3,302.96 on the settlement screen. The closing receipt included €5.04 of final card payments. Continuing from day 29 left the completed result unchanged.

On day 20, a reviewer requested Main Lounge’s sales report and opened its day-18 row. The €202.89 in sales appeared beside links to the two relevant refill receipts. Opening a receipt did not advance the clock. The report does not attribute individual sales to either refill.

The static build passed. The replay and localized export checks also passed before this release pass on the same host. No previously passing check failed. New checks cover source provenance, a changed site fee, score-versus-balance handling, frozen comparison records, stale quotes and separated overnight notices. The local runs have no hosted CI run links.

Generated files are ignored. The static export includes the Python runtime and has no backend. Nothing was published.

## Performance and remaining risks

The full-screen CRT effect was removed. The M4 browser did not reproduce the reported lag, but those measurements did not qualify the effect on target phones. The flatter display keeps the game controls and scene without the filter. See [performance measurements](PERFORMANCE.md) for timing, memory, cache state and device details.

Physical iOS and mid-range Android gameplay, the open mobile keyboard, and desktop Safari and Firefox remain unverified. Phone-sized Chrome is not a substitute. The game’s interface has English, Spanish and German routes; correspondence and the upstream operating brief retain the simulator’s English. A human art and play review remains distinct from automated checks.
