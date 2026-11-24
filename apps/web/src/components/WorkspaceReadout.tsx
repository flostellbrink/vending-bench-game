import { useMemo } from "react";

import { inspectionCommand, type ReadoutContext } from "@/game/readout-route";
import { knownOrders } from "@/game/reports";
import { timeLabel } from "@/game/time-label";

import type { WorkspaceProps } from "./Workspace";

import { BalanceScope } from "./BalanceScope";
import { Mailbox, SalesReports } from "./BusinessReports";
import { CommandIndex } from "./CommandIndex";
import DispatchDesk from "./DispatchDesk";
import ObservationView from "./ObservationView";
import { OperatorBrief } from "./OperatorBrief";
import { OrderRegister } from "./OrderRegister";
import { ReportList } from "./ReportList";
import { Scorecard } from "./Scorecard";
import { SupplierDirectory } from "./SupplierDirectory";

interface Props extends WorkspaceProps {
  context: ReadoutContext;
}
export function WorkspaceReadout({
  run,
  nav,
  shell,
  release,
  lang,
  t,
  screen,
  money,
  context,
  parentBalance,
}: Props) {
  const { state, reports } = run;
  const { tab, setTab } = nav;
  const orders = useMemo(() => knownOrders(reports), [reports]);
  const disabled = run.busy || Boolean(run.runtimeError) || !state || state.over;
  const controls = { t, lang, money, reports, disabled, runCommand: shell.runCommand };
  if (tab === "desk")
    return <DispatchDesk {...controls} state={state} orders={orders} onView={setTab} />;
  if (tab === "world")
    return (
      <BalanceScope
        history={run.history}
        parentBalance={parentBalance}
        rivals={run.rivals}
        best={run.best}
        release={release}
        {...{ lang, t }}
        selected={nav.balanceDay}
        setSelected={nav.setBalanceDay}
        showReceipts={(day) => {
          nav.setBalanceDay(day);
          setTab("day:" + day);
        }}
      />
    );
  if (state && tab === "suppliers")
    return <SupplierDirectory {...controls} state={state} openObject={nav.openObject} />;
  const cmd = inspectionCommand(tab);
  if (
    state &&
    typeof tab === "string" &&
    (tab.startsWith("machine:") || tab.startsWith("supplier:") || tab === "site:depot") &&
    cmd
  ) {
    const report = context.selected;
    const scoped =
      report && tab.startsWith("machine:") && !report.args.machine_id
        ? {
            ...report,
            rows: report.rows.filter((row) => String(row[0]).startsWith(tab.slice(8) + ":")),
          }
        : report;
    const verb = cmd.split(" ")[0] ?? "";
    const action = (
      <button
        className="asset-check"
        disabled={disabled}
        data-clock-verb={verb}
        onClick={() => shell.runCommand(cmd, false, true)}
      >
        {verb === "quote" ? t("reprice") : t("inspectNow")} · {timeLabel(verb, state, t)}
      </button>
    );
    return scoped ? (
      <ObservationView
        {...controls}
        report={scoped}
        state={state}
        openReport={setTab}
        action={action}
      />
    ) : (
      <section className="sheet asset-actions">{action}</section>
    );
  }
  if (state && tab === "mail") return <Mailbox {...controls} state={state} openReport={setTab} />;
  if (state && tab === "sales")
    return <SalesReports {...controls} state={state} openReport={setTab} />;
  if (context.selected && state)
    return (
      <ObservationView {...controls} report={context.selected} state={state} openReport={setTab} />
    );
  if (typeof tab === "string" && tab.startsWith("past:"))
    return (
      <ReportList
        reports={context.history}
        title={t("history") + " · " + context.object.replace(/^(machine|supplier|site):/, "")}
        {...{ t, money }}
        open={setTab}
      />
    );
  if (cmd && state)
    return (
      <section className="sheet">
        <h2>{context.name ?? t(context.label)}</h2>
        <button disabled={disabled} onClick={() => shell.runCommand(cmd)}>
          {cmd} · {timeLabel(cmd.split(" ")[0] ?? "", state, t)}
        </button>
      </section>
    );
  if (tab === "orders") return <OrderRegister {...{ orders, t, money }} open={setTab} />;
  if (tab === "help")
    return (
      <CommandIndex
        actions={run.actions}
        {...{ state, lang, t }}
        openBrief={() => setTab("brief")}
      />
    );
  if (tab === "brief") return <OperatorBrief {...{ release, state, t, money }} />;
  if (tab === "scores")
    return (
      <Scorecard
        history={run.history}
        reviewDay={(day) => {
          nav.setBalanceDay(day);
          setTab("day:" + day);
        }}
        {...{ state, lang, t, screen, reports, money }}
        rivals={run.rivals}
        best={run.best}
        openReport={setTab}
      />
    );
  const byDay = typeof tab === "string" && tab.startsWith("day:");
  return (
    <ReportList
      reports={byDay ? reports.filter((r) => r.day === nav.balanceDay) : reports}
      {...{ t, money }}
      open={setTab}
      title={byDay ? t("results") + " · " + t("day") + " " + nav.balanceDay : t("results")}
      backToBalance={byDay ? () => setTab("world") : undefined}
    />
  );
}
