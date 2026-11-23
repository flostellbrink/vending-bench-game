import { useMemo } from "react";

import { inspectionCommand, type ReadoutContext } from "@/game/readout-route";
import { knownOrders } from "@/game/reports";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";

import type { WorkspaceProps } from "./Workspace";

import { BalanceScope } from "./BalanceScope";
import { CommandIndex } from "./CommandIndex";
import DispatchDesk from "./DispatchDesk";
import ObservationView from "./ObservationView";
import { OperatorBrief } from "./OperatorBrief";
import { OrderRegister } from "./OrderRegister";
import { ReportList } from "./ReportList";
import { Scorecard } from "./Scorecard";
import SiteDesk from "./SiteDesk";

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
}: Props) {
  const { state, reports } = run;
  const { tab, setTab } = nav;
  const orders = useMemo(() => knownOrders(reports), [reports]);
  const disabled = run.busy || !state || state.over;
  const controls = {
    t,
    lang,
    money,
    reports,
    disabled,
    runCommand: shell.runCommand,
    commandLine: shell.line,
    stageCommand: shell.edit,
  };
  if (tab === "desk")
    return (
      <DispatchDesk
        {...controls}
        state={state}
        orders={orders}
        onSite={nav.openSite}
        onView={setTab}
        onCloseDraft={() => {
          if (shell.line.trim() === "close") shell.runCommand("close", true);
          else shell.edit("close");
        }}
      />
    );
  if (tab === "world")
    return (
      <BalanceScope
        history={run.history}
        rivals={run.rivals}
        best={run.best}
        release={release}
        {...{ lang, t }}
        playerName={msg.fields.player({}, { locale: lang })}
        scriptName={msg.fields.bot({}, { locale: lang })}
        selected={nav.balanceDay}
        setSelected={nav.setBalanceDay}
        showReceipts={(day) => {
          nav.setBalanceDay(day);
          setTab("day:" + day);
        }}
      />
    );
  if (context.selected && state)
    return <ObservationView {...controls} report={context.selected} state={state} />;
  if (typeof tab === "string" && tab.startsWith("past:"))
    return (
      <ReportList
        reports={context.history}
        title={t("history") + " · " + context.object.replace(/^(machine|supplier|site):/, "")}
        {...{ t, money }}
        open={setTab}
      />
    );
  const cmd = inspectionCommand(tab);
  if (cmd && state)
    return (
      <section className="sheet">
        <h2>{context.name ?? t(context.label)}</h2>
        <button disabled={disabled} onClick={() => shell.runCommand(cmd)}>
          {cmd} · {timeLabel(cmd.split(" ")[0] ?? "", state, t)}
        </button>
      </section>
    );
  if (state && (tab === "suppliers" || (typeof tab === "string" && tab.startsWith("site:"))))
    return (
      <SiteDesk
        {...controls}
        site={tab === "suppliers" ? "depot" : tab.slice(5)}
        state={state}
        openReport={setTab}
      />
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
        {...{ state, lang, t, screen, reports, money }}
        rivals={run.rivals}
        best={run.best}
        archives={release.archives}
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
