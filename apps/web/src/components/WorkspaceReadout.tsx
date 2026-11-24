import type { ObservedSupplier } from "@/game/suppliers";

import { msg } from "@/dictionary";
import { inspectionCommand, type ReadoutContext } from "@/game/readout-route";

import type { WorkspaceProps } from "./Workspace";

import { BalanceScope } from "./BalanceScope";
import { Mailbox, SalesReports } from "./BusinessReports";
import { CommandIndex } from "./CommandIndex";
import { DepotStock } from "./DepotStock";
import { EmailComposer } from "./EmailComposer";
import { GuiToolInfo } from "./GuiToolInfo";
import ObservationView from "./ObservationView";
import { OperationsDesk } from "./OperationsDesk";
import { OperatorBrief } from "./OperatorBrief";
import { OrderRegister } from "./OrderRegister";
import { OrderSlip, QuoteRequest } from "./OrderSlip";
import { ReportList } from "./ReportList";
import { Scorecard } from "./Scorecard";
import { UninspectedMachine } from "./SlotInstrument";
import { SupplierDirectory } from "./SupplierDirectory";

interface Props extends WorkspaceProps {
  context: ReadoutContext;
  suppliers: ObservedSupplier[];
}
export function WorkspaceReadout({
  run,
  nav,
  shell,
  release,
  money,
  context,
  suppliers,
  parentBalance,
}: Props) {
  const { state, reports } = run;
  const { tab, setTab } = nav;
  const disabled = run.busy || Boolean(run.runtimeError) || !state || state.over;
  const controls = { money, reports, disabled, runCommand: shell.runCommand };
  if (
    state &&
    (tab === "status" ||
      tab === "payments" ||
      tab === "marketing" ||
      tab === "notes" ||
      tab === "reminders")
  )
    return <OperationsDesk {...controls} desk={tab} {...{ release, state }} openReport={setTab} />;
  if (tab === "world")
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
        showReceipts={(day) => {
          nav.setBalanceDay(day);
          setTab("day:" + day);
        }}
      />
    );
  if (state && tab === "suppliers")
    return (
      <SupplierDirectory
        {...controls}
        state={state}
        suppliers={suppliers}
        openObject={nav.openObject}
      />
    );
  const cmd = inspectionCommand(tab);
  if (
    state &&
    typeof tab === "string" &&
    (tab.startsWith("machine:") || tab === "machines" || tab === "site:depot") &&
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
      <GuiToolInfo verb={verb}>
        <button
          className="asset-check"
          disabled={disabled}
          data-clock-verb={verb}
          onClick={() => shell.runCommand(cmd, false, true)}
        />
      </GuiToolInfo>
    );
    const instrument = scoped ? (
      <ObservationView
        {...controls}
        report={scoped}
        state={state}
        openReport={setTab}
        action={action}
      />
    ) : tab.startsWith("machine:") ? (
      <UninspectedMachine
        machine={tab.slice(8)}
        {...{ state, reports, disabled, action }}
        runCommand={shell.runCommand}
      />
    ) : (
      <section className="sheet asset-actions">{action}</section>
    );
    if (tab === "site:depot")
      return <DepotStock report={report} action={action} openReport={setTab} {...{ money }} />;
    return instrument;
  }
  if (state && typeof tab === "string" && tab.startsWith("supplier:")) {
    const report = context.selected;
    const supplier = tab.slice(9);
    const contact = suppliers.find((entry) => entry.id === supplier);
    const purchases = contact?.orders ?? [];
    const compose = contact?.email && (
      <EmailComposer to={contact.email} {...{ state, disabled, reports }} send={shell.runCommand} />
    );
    return (
      <article className="supplier-desk">
        {contact?.email && (
          <div className="supplier-contact">
            <span>{contact.email}</span>
            {compose}
          </div>
        )}
        <QuoteRequest
          report={report?.terms?.minimum !== undefined ? report : undefined}
          supplier={supplier}
          state={state}
          {...controls}
          supplierView
        />
        <OrderSlip
          {...controls}
          report={report?.terms?.minimum !== undefined ? report : undefined}
          supplier={supplier}
          state={state}
          openReport={setTab}
          supplierView
        />
        {purchases.length > 0 && (
          <section className="supplier-orders">
            <h3>
              {msg.operator.orders()} <small>{purchases.length}</small>
            </h3>
            <OrderRegister
              {...{ money, reports }}
              supplier={contact?.name ?? supplier}
              orders={purchases}
            />
          </section>
        )}
      </article>
    );
  }
  if (state && tab === "mail")
    return <Mailbox {...controls} release={release} state={state} openReport={setTab} />;
  if (state && tab === "sales")
    return <SalesReports {...controls} release={release} state={state} openReport={setTab} />;
  if (context.selected && state)
    return (
      <ObservationView
        {...controls}
        report={context.selected}
        state={state}
        openReport={setTab}
        openSupplier={(id) => nav.openObject("supplier:" + id)}
      />
    );
  if (typeof tab === "string" && tab.startsWith("past:"))
    return <ReportList reports={context.history} {...{ money }} open={setTab} />;
  if (cmd && state)
    return (
      <section className="sheet">
        <GuiToolInfo verb={cmd.split(" ")[0] ?? ""}>
          <button disabled={disabled} onClick={() => shell.runCommand(cmd)}>
            {cmd}
          </button>
        </GuiToolInfo>
      </section>
    );
  if (tab === "help")
    return <CommandIndex actions={run.actions} release={release} {...{ state }} />;
  if (tab === "brief") return <OperatorBrief embedded {...{ release, state, money }} />;
  if (tab === "scores")
    return (
      <Scorecard
        embedded
        history={run.history}
        reviewDay={(day) => {
          nav.setBalanceDay(day);
          setTab("day:" + day);
        }}
        {...{ state, reports, money }}
        rivals={run.rivals}
        best={run.best}
        openReport={setTab}
      />
    );
  const byDay = typeof tab === "string" && tab.startsWith("day:");
  return (
    <ReportList
      reports={byDay ? reports.filter((r) => r.day === nav.balanceDay) : reports}
      {...{ money }}
      open={setTab}
      backToBalance={byDay ? () => setTab("world") : undefined}
    />
  );
}
