import type { Release } from "games-common/benchmark";

import { useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { Run } from "@/hooks/useCommandLine";
import type { Money } from "@/localization/messages";

import { msg } from "@/dictionary";
import { useNavigation } from "@/hooks/useNavigation";

import { BalanceScope } from "./BalanceScope";
import { DayStatement } from "./DayStatement";
import ObservationView from "./ObservationView";
import { ReportList } from "./ReportList";
import { ResultDialog, resultTitle } from "./ResultDialog";
import { Scorecard } from "./Scorecard";
import SessionSetup from "./SessionSetup";
import { StationFrame } from "./StationFrame";

interface Props {
  parentBalance?: ParentBalance;
  slot: string;
  run: Run;
  release: Release;

  money: Money;
}
export function Settlement({ run, release, slot, money, parentBalance }: Props) {
  const [balanceDay, setBalanceDay] = useState<number | null>(null);
  const nav = useNavigation("scores");
  const { state, rivals, best, reports, history } = run;
  const finalReceipt = reports.at(-1);
  const openDay = (day: number) => nav.setTab("day:" + day);
  return (
    <StationFrame revision={release.revision} slot={slot} page="run">
      <div className="dossier settlement-desks">
        <section className="bench-paper">
          <Scorecard
            seed={release.seed}
            {...{ state, rivals, best, reports, money, history }}
            reviewDay={openDay}
            openReport={nav.setTab}
          />
          {finalReceipt && (
            <button
              className="receipt-link"
              aria-haspopup="dialog"
              onClick={() => nav.setTab(finalReceipt.id)}
            >
              {msg.operator.openReceipt()} #{finalReceipt.id} ·{" "}
              {resultTitle(finalReceipt.id, finalReceipt)}
            </button>
          )}
          <BalanceScope
            {...{ history, rivals, best, parentBalance, release }}
            selected={
              balanceDay ??
              (parentBalance ? Math.min(parentBalance.values.length, history.length) - 1 : null)
            }
            setSelected={setBalanceDay}
            showReceipts={openDay}
          />
          {state &&
            nav.path.slice(1).map((view) => {
              const day = typeof view === "string" ? Number(view.slice(4)) : null;
              const entries = day === null ? [] : reports.filter((r) => r.day === day);
              const closing = entries.find((r) => r.endDay !== r.day);
              const receipt =
                typeof view === "number" ? reports.find((r) => r.id === view) : undefined;
              return (
                <ResultDialog
                  key={view}
                  title={resultTitle(view, receipt)}
                  close={nav.leaveDetail}
                  covered={view !== nav.tab}
                >
                  {receipt ? (
                    <>
                      <p className="result-balance">
                        {msg.operator.bank()}: {money(receipt.openingCash)} →{" "}
                        {money(receipt.closingCash)}
                      </p>
                      <ObservationView
                        report={receipt}
                        {...{ reports, state, money }}
                        disabled
                        openReport={nav.setTab}
                      />
                    </>
                  ) : (
                    <>
                      {closing && (
                        <DayStatement
                          report={closing}
                          {...{ reports, state, money }}
                          openReport={nav.setTab}
                        />
                      )}
                      <ReportList reports={entries} money={money} open={nav.setTab} />
                    </>
                  )}
                </ResultDialog>
              );
            })}
        </section>
        <aside className="launch-bay">
          <SessionSetup initialRevision={release.revision} activeSlot={slot} compact />
        </aside>
      </div>
    </StationFrame>
  );
}
