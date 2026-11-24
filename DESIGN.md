# Vending Bench: player experience

## Player and objective

You are the remote operator, not a person walking between machines. Finish the challenge with the highest bank balance you can. Purchasing too much stock ties up cash. A cheap inspection can save an expensive trip. Time passes when a business command runs, not while you think.

## The working screen

Keep one persistent command buffer at the foot of the terminal. The prompt has no box or submit button. Completions appear above it and do not move it. Enter runs the command; Shift+Enter inserts a continuation line. Keep the page inside the viewport; scroll the transcript and reports independently.

The upper-right display shows the selected office. All site thumbnails stay in a fixed order. Selecting an office opens a cabinet there; selecting a cabinet opens that cabinet and lights it in the scene. Selecting the depot opens shared inventory. Selection costs no time and does not inspect anything. All destinations are also available from the directory.

The lower display holds one instrument. Each form owns its inputs. Editing an order, price, letter or search must not change the terminal draft, and typing a command must not change a form. Both interfaces produce the same receipt when the player executes an action.

Use a graphite enclosure and slate keys. Show depth through the light and shadow on a key, not a different background hue for each panel. Reserve pale green phosphor for live readings and keyboard focus. Keep daylight and material colors in the office drawing. Separate comparison traces by line pattern as well as tone.

Use a real shell prompt, command echo and a receipt after execution. On first launch, print the VENDIX/OS mark while the runtime starts. Do not delay the prompt for an animation. Later launches restore scrollback. Keep the completion list closed on an empty prompt until the player presses Tab.

Keep both rear walls at full height. Cut down only the walls nearest the viewer. Draw two tiles of pavement outside the room, on the same ground plane. The street must be visible around the building, not only through a window.

Draw the office, street tiles, furniture, stock and cabinet doors in the same orthographic projection. Show the last observed products behind the glass. Do not display live inventory counts on the map. When a refill succeeds, animate the service visit and hinged door during the simulated trip. The clock, daylight and shadows follow operating time; the balance graph uses days.

Use a flat display. The enclosure, controls, type and illustration supply the workstation’s character without a full-screen distortion filter.

## Decisions the interface must support

- **Find a supplier.** Start with a searchable directory, not a list of secret supplier IDs. Open an offer from the search result, compare its prices and minimum, then place an order without losing the quote.
- **Fill and price a machine.** Inspect the depot for delivered stock. Inspect the cabinet to learn its capacity and contents. Keep both observations open. Complete a slot address and product, review the time cost, refill, then set a price. A full but unpriced slot earns nothing.
- **Spend the afternoon.** Before execution, show the command cost. While executing, ease the clock and office light toward the actual new simulator time. Closing a day crosses the night. Receipts report what happened; a preview is never a promise of success.
- **Compare performance.** At the end of the run, show the score and its difference from the reference operator. Retain the best completed balance trace for these rules, seed and horizon. Do not show scores from different rules or invent daily trajectories.
- **Resume.** Restore the run, discovered identifiers and previous observations without charging for the same command twice.

## Commands and results

The shift strip is optional. Ctrl+Enter or Cmd+Enter places the current command on the strip without spending time. Move, edit or remove a step to see what fits before closing. The timing comes from the selected benchmark. The strip does not predict future inventory, reserve prices or run commands automatically. Execute the first step to spend its time. Keep dated evidence beside the proposed action.

Tab completes the current word; Enter executes. History recall edits a copy, not the earlier command. Use short verbs such as `find`, `quote`, `order`, `inspect`, `refill` and `price`. A syntax error costs nothing. A valid command that the simulator refuses can cost time. Show the distinction.

Use the same synopsis in help, completion guidance and syntax errors: `<slot>` is required, `[quantity]` is optional, and `[<product> <quantity>]...` is a repeatable group. Type the values without brackets. For example, `order zuidas-groothandel stroopwafel-2pk 120` orders one product; append another product and quantity to include it in the same order.

Each paid observation records its start time, end time and work cost. Reading it again costs nothing. Present mail as correspondence, a wholesale offer as an editable order slip, and closing as a bank statement. Keep the offer’s quantity, minimum, expiry and non-reserved price together. Overnight notices appear alongside the transaction that advanced the day. Show warnings where the player makes the decision, not behind a raw-output switch. Keyboard and graphical actions call the same simulator command. The prompt stays usable over any result.

## Version boundary

The release selects its engine, adapter, available tools, costs, geometry and comparable traces. The operator vocabulary describes the business, not the transport. Completions use public machine addresses and previously observed results; they do not expose the engine's private supplier catalogue or current inventory.
