import type { Report } from "games-common/benchmark";

import { hasAny, hasValue, type Optional } from "games-common/language";

import type { ObservedSupplier } from "@/game/suppliers.ts";

import { msg } from "@/dictionary/index.ts";
import { inspectionCommand, type ReadoutContext } from "@/game/readout-route.ts";

import type { ObservationProps } from "./panel-props.ts";
import type { WorkspaceProps } from "./Workspace.tsx";

import { BalanceScope } from "./BalanceScope.tsx";
import { Mailbox, SalesReports } from "./BusinessReports.tsx";
import { CommandIndex } from "./CommandIndex.tsx";
import { DepotStock } from "./DepotStock.tsx";
import { EmailComposer } from "./EmailComposer.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";
import ObservationView from "./ObservationView.tsx";
import { OperationsDesk } from "./OperationsDesk.tsx";
import { OperatorBrief } from "./OperatorBrief.tsx";
import { OrderRegister } from "./OrderRegister.tsx";
import { OrderSlip, QuoteRequest } from "./OrderSlip.tsx";
import { ReportList } from "./ReportList.tsx";
import { UninspectedMachine } from "./SlotInstrument.tsx";
import { SupplierDirectory } from "./SupplierDirectory.tsx";

interface Props extends WorkspaceProps {
  tab: NavigationView;
  context: ReadoutContext;
  suppliers: ObservedSupplier[];
}
type NavigationView = WorkspaceProps["nav"]["tab"];
const machinePrefix = "machine:";
const supplierPrefix = "supplier:";
const dayPrefix = "day:";

/** One supplier: contact, quote, last reply, order slip and past orders. */
function SupplierDesk({
  supplier,
  contact,
  report,
  state,
  reports,
  money,
  disabled,
  runCommand,
  openReport,
}: Omit<ObservationProps, "report"> & {
  supplier: string;
  contact: Optional<ObservedSupplier>;
  report: Optional<Report>;
  openReport: (id: number) => void;
}) {
  const purchases = contact?.orders ?? [];
  const quote = hasValue(report?.terms?.minimum) ? report : undefined;
  return (
    <article className="supplier-desk">
      {contact?.email && (
        <div className="supplier-contact">
          <span>{contact.email}</span>
          <EmailComposer
            to={contact.email}
            disabled={disabled}
            reports={reports}
            send={runCommand}
          />
        </div>
      )}
      <QuoteRequest
        report={quote}
        supplier={supplier}
        state={state}
        disabled={disabled}
        runCommand={runCommand}
        supplierView
      />
      {report && !hasValue(report.terms?.minimum) && (
        <ObservationView
          disabled={disabled}
          money={money}
          reports={reports}
          runCommand={runCommand}
          report={report}
          state={state}
          openReport={openReport}
        />
      )}
      <OrderSlip
        disabled={disabled}
        money={money}
        reports={reports}
        runCommand={runCommand}
        report={quote}
        supplier={supplier}
        state={state}
        openReport={openReport}
        supplierView
      />
      {purchases.length > 0 && (
        <section className="supplier-orders">
          <h3>
            {msg.operator.orders()} <small>{purchases.length}</small>
          </h3>
          <OrderRegister
            money={money}
            reports={reports}
            supplier={contact?.name ?? supplier}
            orders={purchases}
          />
        </section>
      )}
    </article>
  );
}
export function WorkspaceReadout({
  run,
  nav,
  shell,
  release,
  money,
  context,
  tab,
  suppliers,
  parentBalance,
}: Props) {
  const { state, reports } = run;
  const { setTab } = nav;
  const { runCommand } = shell;
  const disabled = run.busy || hasAny(run.runtimeError) || !state || state.over;
  const showDay = (day: number) => {
    nav.setBalanceDay(day);
    setTab(`${dayPrefix}${day}`);
  };
  if (
    state &&
    (tab === "status" ||
      tab === "payments" ||
      tab === "marketing" ||
      tab === "notes" ||
      tab === "reminders")
  ) {
    return (
      <OperationsDesk
        disabled={disabled}
        money={money}
        reports={reports}
        runCommand={runCommand}
        desk={tab}
        release={release}
        state={state}
        openReport={setTab}
      />
    );
  }
  if (tab === "world") {
    return (
      <BalanceScope
        embedded
        history={run.history}
        parentBalance={parentBalance}
        rivals={run.rivals}
        best={run.best}
        release={release}
        selected={nav.balanceDay}
        setSelected={nav.setBalanceDay}
        showReceipts={showDay}
      />
    );
  }
  if (state && tab === "suppliers") {
    return (
      <SupplierDirectory
        disabled={disabled}
        runCommand={runCommand}
        suppliers={suppliers}
        openObject={nav.showResult}
      />
    );
  }
  const cmd = inspectionCommand(tab);
  if (
    state &&
    typeof tab === "string" &&
    (tab.startsWith(machinePrefix) || tab === "site:depot") &&
    cmd
  ) {
    const report = context.selected;
    const machine = tab.startsWith(machinePrefix) ? tab.slice(machinePrefix.length) : undefined;
    const scoped =
      report && hasValue(machine) && !report.args.machine_id
        ? { ...report, rows: report.rows.filter((row) => String(row[0]).startsWith(`${machine}:`)) }
        : report;
    const verb = cmd.split(" ")[0] ?? "";
    const action = (
      <GuiToolInfo
        verb={verb}
        className="asset-check"
        disabled={disabled}
        onClick={() => runCommand(cmd, "inline")}
      >
        {hasValue(machine) ? (
          <>
            {msg.commands.get_machine_inventory()} · {msg.operator.allMachines()}
          </>
        ) : undefined}
      </GuiToolInfo>
    );
    if (tab === "site:depot") {
      return <DepotStock report={report} action={action} openReport={setTab} money={money} />;
    }
    if (scoped) {
      return (
        <ObservationView
          disabled={disabled}
          money={money}
          reports={reports}
          runCommand={runCommand}
          report={scoped}
          state={state}
          openReport={setTab}
          action={action}
        />
      );
    }
    if (hasValue(machine)) {
      return (
        <UninspectedMachine
          machine={machine}
          state={state}
          reports={reports}
          disabled={disabled}
          action={action}
          runCommand={runCommand}
        />
      );
    }
    return <section className="sheet asset-actions">{action}</section>;
  }
  if (state && typeof tab === "string" && tab.startsWith(supplierPrefix)) {
    const supplier = tab.slice(supplierPrefix.length);
    return (
      <SupplierDesk
        supplier={supplier}
        contact={suppliers.find((entry) => entry.id === supplier)}
        report={context.selected}
        state={state}
        reports={reports}
        money={money}
        disabled={disabled}
        runCommand={runCommand}
        openReport={setTab}
      />
    );
  }
  if (state && tab === "mail") {
    return (
      <Mailbox
        disabled={disabled}
        money={money}
        reports={reports}
        runCommand={runCommand}
        release={release}
        state={state}
        openReport={setTab}
      />
    );
  }
  if (state && tab === "sales") {
    return (
      <SalesReports
        disabled={disabled}
        money={money}
        reports={reports}
        runCommand={runCommand}
        release={release}
        state={state}
        openReport={setTab}
      />
    );
  }
  if (context.selected && state) {
    return (
      <ObservationView
        disabled={disabled}
        money={money}
        reports={reports}
        runCommand={runCommand}
        report={context.selected}
        state={state}
        openReport={setTab}
        openSupplier={(id) => nav.showResult(`${supplierPrefix}${id}`)}
      />
    );
  }
  if (typeof tab === "string" && tab.startsWith("past:")) {
    return <ReportList reports={context.history} money={money} open={setTab} />;
  }
  if (cmd && state) {
    return (
      <section className="sheet">
        <GuiToolInfo
          verb={cmd.split(" ")[0] ?? ""}
          disabled={disabled}
          onClick={() => runCommand(cmd)}
          preview={false}
        >
          {cmd}
        </GuiToolInfo>
      </section>
    );
  }
  if (tab === "help") {
    return <CommandIndex actions={run.actions} release={release} state={state} />;
  }
  if (tab === "brief") {
    return <OperatorBrief embedded release={release} state={state} money={money} />;
  }
  const byDay = typeof tab === "string" && tab.startsWith(dayPrefix);
  return (
    <ReportList
      reports={
        byDay ? reports.filter((r) => r.day === Number(tab.slice(dayPrefix.length))) : reports
      }
      money={money}
      open={setTab}
    />
  );
}
