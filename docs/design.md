# Design

The player is a remote operator. The goal is the highest final bank balance. Business commands spend simulated time; reading the screen does not.

## Screen

- The terminal prompt stays at the foot of the screen. Completions appear above it and do not move it. Enter runs a command; Shift+Enter adds a line.
- The upper display shows the selected office. Selecting a site, cabinet or depot costs no time and does not inspect anything.
- The lower display holds one form. A form and the terminal draft never change each other. Both run the same command and produce the same receipt.
- Graphite enclosure, slate keys, pale green only for live readings and focus. Comparison traces differ by line pattern as well as colour. No full-screen filter.
- One orthographic projection for rooms, street, furniture, stock and cabinets. Keep the rear walls at full height and show the street outside. Show the last observed products, never live counts. The clock and light follow operating time.

## Decisions to support

- **Find a supplier:** search a directory, open an offer, order without losing the quote.
- **Fill and price a slot:** inspect the depot and the cabinet, keep both readings open, refill, then set a price. A full but unpriced slot earns nothing.
- **Spend the day:** show the time cost before a command runs. A preview never promises success.
- **Compare:** compare the final score only with runs that have the same rules, seed and horizon. Show recorded daily balances as curves and final-only results as end points. Never invent a daily trajectory. The rivals are the model baseline runs of the pinned benchmark commit. The save timeline replays the highest-scoring run that reproduces exactly in the browser engine.
- **Resume:** restore the run and earlier observations without charging again.

## Commands

- The console accepts the full published MCP signatures and logs each call the GUI makes. Only `help` is local. A syntax error costs nothing; a refused command can cost time.
- Forms, help and completion use the published parameter names, types and defaults.
- The GUI may omit a variant only if another action gives the same information and outcome, at no extra cost or risk. For v3:
  - Inspect all cabinets and read all notes in one call.
  - List the maximum number of emails. Keep the folder and unread filters, because the benchmark filters before the limit.
  - Get the full daily sales history and filter dates locally. Keep the paid period for product totals, because the benchmark sums them before it returns them.
- A paid observation records its start time, end time and cost. Reading it again is free. Show mail as letters, an offer as an order slip and the day's close as a bank statement. Show warnings where the player decides.
- Completions use public addresses and earlier observations. They never expose the hidden supplier catalogue or current stock.

## Shift strip

Ctrl+Enter or Cmd+Enter puts a command on the strip without spending time. The strip shows which steps fit before closing, using the benchmark's time costs. It does not predict stock, sales or prices.

Rejected: a route-and-van metaphor. Vehicle capacity and travel times are not rules of this benchmark.

## Version boundary

The selected release sets the engine, adapter, tools, costs, layout and comparable runs. The operator vocabulary describes the business, not the transport.
