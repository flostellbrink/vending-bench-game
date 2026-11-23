import type { Report, SlotObservation } from "games-common/benchmark";

import { address } from "./commands.ts";

interface SlotChange {
  report: Report;
  observation?: SlotObservation;
  price?: number;
}
/** Read only receipts issued after the inspection. A night passing is not an inventory reading. */
export function slotChanges(reports: readonly Report[], slot: string, since: number) {
  return reports.flatMap<SlotChange>((report) => {
    if (report.id <= since) return [];
    const observation = Object.entries(report.slots).find(([id]) => address(id) === slot)?.[1];
    if (observation) return [{ report, observation, price: undefined }];
    if (
      report.tool === "set_price" &&
      report.args.slot &&
      address(report.args.slot) === slot &&
      report.args.price !== undefined &&
      /^Slot .+ is now /.test(report.display)
    ) {
      return [{ report, observation: undefined, price: report.args.price }];
    }
    return [];
  });
}
