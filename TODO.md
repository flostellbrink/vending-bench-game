# Player experience queue

## Working pass: correspondence and replay

- [x] Select a scorecard day and branch directly from that morning. Show the active run number in the workstation.
- [x] Keep the original run unchanged. A fresh playtest branched from day 2 of a day 4 run and resumed at 09:00.
- [x] Put a letter composer beside an observed supplier or quote. Make it share its draft and time cost with the terminal.
- [x] Remove the landing page’s dependency on save-list hydration for starting a new slot.
- [x] Check a fresh supplier inquiry through its overnight response and compare the next paid quote at the same quantity.
- [x] A fresh reviewer inspected A1 in the AI Lounge and reached an empty Product ID field. The slot gave no way to check depot stock. Test the cabinet-to-depot lookup at this point.

## Reference checks

The [release review](RELEASE-CANDIDATE.md) records the cold-player, replay and purchase-slip results. The [last-hour study](design/CONCEPTS.md) records the shift-planning decision and its outcome. Keep test coverage separate from artistic approval.

## Coverage gaps

Desktop Safari and Firefox remain untested. Check physical phones when available. Missing phones are not a release gate; use the available time on desktop play.
