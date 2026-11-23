# The unit of play

The old workbench organized simulator responses. It did not organize decisions. A quote, a stock count and the time left today must be usable together. A new receipt must not evict the evidence behind the purchase.

## Competing concepts

- **An address space.** Navigate a persistent tree of sites, cabinets and suppliers. Each object keeps dated observations; a fresh read has a cost. This solves “where did my quote go?” It does not, by itself, make a decision interesting. Use it for retrieval, not as the premise of the game.
- **A race by correspondence.** Your run and a rival finish on separate paper tapes. With endpoint-only data, the opposing tape ends in a real target, not imaginary daily actions. This gives the finish a clear opponent. If covering the opposing tape never changes a decision, it is a score presentation, not the core interaction.
- **A dispatch program.** Arrange the next few real operations against the remaining working day. The clock costs are known; stock, delivery and sales outcomes are not. Moving an inspection ahead of a refill can push the price change past settlement. This makes scheduling visible without adding a scripting language, invented travel rules or a new economy.
- **An evidence bench.** Keep a dated quote, a depot count and an editable order together. The document is the instrument: editing it writes the same terminal command that typing would issue. Return to evidence without reissuing a paid request. The risk is building accounting software with an office picture attached.

## What to test

Combine the dispatch program with one piece of dated evidence. Keep the office still while the player decides. Animate the actual elapsed simulation time after commitment. Keep the console as an input and an audit trail, not a prerequisite for using the visual instrument.

The local study replays two choices from identical seed-1 state at 16:00. Dispatch first: the slot can be filled and priced before settlement. Inspect first: the refill crosses closing and the stock is still unpriced at settlement. Compare the next morning’s actual receipts. Do not predict either branch’s revenue before the player commits. These are two plays of the benchmark, not two historical AI runs.

Reject the study if a new player can name the operation they clicked but cannot explain what they chose to postpone. Reject a route-and-van metaphor: vehicle capacity, travel times and hourly stockouts are not rules of this benchmark. Do not build a second economy to make a metaphor work.

## Study result

Before opening the outcomes, an independent reviewer identified that the inspection moved pricing to 09:00 tomorrow. They could not tell whether the refill itself took effect before the sale. The strip now distinguishes the two: a successful refill loads stock before overnight sales; the planned price change occurs afterward.

In the recorded plays, pricing before settlement produced three sales and €4.50 in gross revenue. Pricing after settlement produced no sales that night. This supports the timing concept, not a release-quality verdict. The reproducible inputs and receipts come from `apps/web/scripts/studies/last-hour.ts`; the recordings are local study outputs, not shipped levels or rival scores.
