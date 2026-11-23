# Vending Bench: player experience

## Player and objective

You are the remote operator, not a person walking between machines. Finish the challenge with the highest bank balance you can. Purchasing too much stock ties up cash. A cheap inspection can save an expensive trip. Time passes when a business command runs, not while you think.

## The working screen

Keep one persistent command buffer on the left. Pin the prompt below the transcript. On the right, show the winter office campus as an orthographic drawing. It is a view, not a control surface. Typing a machine address identifies it in the drawing. No action requires a map click. Use the same prompt on small screens.

Use a graphite enclosure and slate keys. Show depth through the light and shadow on a key, not a different background hue for each panel. Reserve pale green phosphor for live readings and keyboard focus. Keep daylight and material colors in the office drawing. Separate comparison traces by line pattern as well as tone.

Use a real shell prompt, command echo and a receipt after execution. On first launch, print the VENDIX/OS mark while the runtime starts. Do not delay the prompt for an animation. Later launches restore scrollback. Keep the completion list closed on an empty prompt until the player presses Tab.

Show each cabinet as a separate display over the office drawing. A cabinet with no observation is not an empty cabinet. Only inspections and successful operations change its known slot state. Operating time and the daily balance graph have different scales.

## Decisions the interface must support

- **Find a supplier.** Start with a searchable directory, not a list of secret supplier IDs. A search receipt gives the operator a result tab. Complete a supplier ID from that observation, compare its offer prices and minimum, then place an order without losing the quote.
- **Fill and price a machine.** Inspect the depot for delivered stock. Inspect the cabinet to learn its capacity and contents. Keep both observations open. Complete a slot address and product, review the time cost, refill, then set a price. A full but unpriced slot earns nothing.
- **Spend the afternoon.** Before execution, show the command cost. While executing, ease the clock and office light toward the actual new simulator time. Closing a day crosses the night. Receipts report what happened; a preview is never a promise of success.
- **Compare performance.** Plot the bank balance after each day beside recorded runs of the same rules, seed and horizon. Show older final scores separately. Do not invent daily trajectories.
- **Resume.** Restore the run, discovered identifiers and previous observations without charging for the same command twice.

## Commands and results

Tab completes the current word; Enter executes. History recall edits a copy, not the earlier command. Use short verbs such as `find`, `quote`, `order`, `inspect`, `refill` and `price`. A syntax error costs nothing. A valid command that the simulator refuses can cost time. Show the distinction.

Each paid observation has a timestamp and remains readable. Local commands for help, tabs and the world view cost nothing. Grid headings sort displayed rows, not the underlying simulation. Keep the original report with the grid so a summary cannot hide order conditions or overnight notices. The prompt stays usable over any result.

## Version boundary

The release selects its engine, adapter, available tools, costs, geometry and comparable traces. The operator vocabulary describes the business, not the transport. Completions use public machine addresses and previously observed results; they do not expose the engine's private supplier catalogue or current inventory.
