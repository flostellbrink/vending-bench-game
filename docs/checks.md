# Checks

## Test risk

Put `/** @risk impact=<1-5> likelihood=<1-3> */` directly above each outer test (a `test`, `describe`, `it` or `suite` that no other test holds). Lint fails without it. Tag the fault with the highest impact times likelihood that the test catches. Judge each test alone. When two levels fit, take the lower one.

Impact is what the player loses when the fault ships:

- 5: a run cannot start, continue or finish, a save is lost, or the game shows benchmark data the player has not observed.
- 4: a wrong score, a wrong rival or comparison, or a command result that differs from the benchmark.
- 3: a wrong state that the player notices and can work around.
- 2: a wrong display, such as a layout, a motion or a text, while play goes on.
- 1: a cosmetic fault, or a fault only in tooling.

Likelihood is the chance that a change breaks this code and no other check notices. Other checks are the type check and the export check, not other tests:

- 3: no other check catches the fault, and the code changes often or is complex.
- 2: no other check catches the fault, and the code is stable and simple; or another check catches part of it.
- 1: another check catches the fault, or the test checks fixed data.
