import type { Report } from "games-common/benchmark";

import { useState } from "react";

import { address } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

interface Props extends Pick<
  ObservationProps,
  "state" | "t" | "reports" | "runCommand" | "disabled"
> {
  site: string;
  openReport: (id: number) => void;
}

export default function SiteDesk({
  site,
  state,
  t,
  reports,
  runCommand,
  openReport,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const depot = site === "depot";
  const ids = state.machines.filter((id) => address(id).split(".")[0] === site);
  const name = depot ? t("depot") : (ids[0]?.split(":")[0] ?? site);
  function observed(tool: string, id?: string) {
    return reports.findLast(
      (r) => r.tool === tool && (!id || !r.args.machine_id || r.args.machine_id === id),
    );
  }
  function inspection(tool: string, line: string, prior?: Report) {
    return (
      <div className="site-actions">
        <button data-clock-verb={tool} disabled={disabled} onClick={() => runCommand(line)}>
          {t("inspectNow")} · {timeLabel(tool, state, t)}
        </button>
        {prior && (
          <button className="receipt-link" onClick={() => openReport(prior.id)}>
            {t("seen")} · {t("day")} {prior.day}, {clock(prior.minute)} · {t("noCharge")}
          </button>
        )}
      </div>
    );
  }
  return (
    <section className="sheet">
      <h2>{name}</h2>
      {depot ? (
        <>
          {inspection("depot", "depot", observed("get_storage_inventory"))}
          <form
            className="directory-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) runCommand("find " + query.trim());
            }}
          >
            <label>
              {t("searchSuppliers")}{" "}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchExample")}
              />
            </label>
            <button data-clock-verb="find" disabled={disabled || !query.trim()}>
              {t("searchSuppliers")} · {timeLabel("find", state, t)}
            </button>
          </form>
        </>
      ) : (
        ids.map((id) => (
          <article className="machine-entry" key={id}>
            <h3>{address(id)}</h3>
            {inspection("inspect", "inspect " + address(id), observed("get_machine_inventory", id))}
          </article>
        ))
      )}
      <div className="site-actions">
        <button data-clock-verb="inbox" disabled={disabled} onClick={() => runCommand("inbox")}>
          {t("mailbox")} · {timeLabel("inbox", state, t)}
        </button>
      </div>
    </section>
  );
}
