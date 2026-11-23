import type { Report, Snapshot } from "games-common/benchmark";

import type { Translate } from "@/localization/messages";

import { address } from "@/game/commands";
import { clock } from "@/scene/clock";

interface Props {
  line: string;
  reports: Report[];
  state: Snapshot | null;
  openReport: (id: number) => void;
  t: Translate;
}

/** Link a proposed service call to the observations that can support it. */
export function PlanEvidence({ line, reports, state, openReport, t }: Props) {
  const [verb, target, product] = line.trim().toLowerCase().split(/\s+/);
  if (!state || !target || !["inspect", "refill", "price", "swap", "clear"].includes(verb ?? ""))
    return null;
  const slot = state.slots.find((id) => address(id) === target || id.toLowerCase() === target);
  const machine = state.machines.find(
    (id) => address(id) === target || id.toLowerCase() === target,
  );
  const observation = reports.findLast((r) =>
    slot
      ? Object.hasOwn(r.slots, slot)
      : machine &&
        r.tool === "get_machine_inventory" &&
        Object.keys(r.slots).some((key) => key.startsWith(machine + ":")),
  );
  const depot = product ? reports.findLast((r) => r.tool === "get_storage_inventory") : undefined;
  const depotRow = depot?.rows.find(([id]) => id === product);
  const observedSlot = slot && observation?.slots[slot];
  if (!observation && !depotRow) return null;
  return (
    <div className="plan-evidence">
      <small>{t("seen")}</small>
      {observation && (
        <button onClick={() => openReport(observation.id)}>
          {target}
          {observedSlot ? " · " + observedSlot.qty + "/" + (observedSlot.capacity ?? "—") : ""}
          <small>
            {t("day")} {observation.day} · {clock(observation.minute)}
          </small>
        </button>
      )}
      {depot && depotRow && (
        <button onClick={() => openReport(depot.id)}>
          {t("depot")} · {depotRow[3]} × {product}
          <small>
            {t("day")} {depot.day} · {clock(depot.minute)}
          </small>
        </button>
      )}
    </div>
  );
}
