import type { Release } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";
import { useState } from "react";

import type { ParentBalance, RunOrigin } from "@/game/runs.ts";
import type { Run } from "@/hooks/useCommandLine.ts";
import type { Money } from "@/localization/messages.ts";

import { msg } from "@/dictionary/index.ts";
import { useNavigation } from "@/hooks/useNavigation.ts";

import { BalanceScope } from "./BalanceScope.tsx";
import { DayStatement } from "./DayStatement.tsx";
import ObservationView from "./ObservationView.tsx";
import { ReportList } from "./ReportList.tsx";
import { ResultDialog, resultTitle } from "./ResultDialog.tsx";
import { SaveLibrarySection } from "./SaveLibrarySection.tsx";
import { Scorecard } from "./Scorecard.tsx";
import { StationFrame } from "./StationFrame.tsx";

interface Props {
  parentBalance?: ParentBalance;
  origin: Optional<RunOrigin>;
  slot: string;
  run: Run;
  release: Release;

  money: Money;
}
/** Who made the moves of a run: the player, the player after a model run, or only a model. */
function operatorName(release: Release, origin: Optional<RunOrigin>) {
  if (!origin) {
    return msg.fields.player();
  }
  if (origin.day > release.days) {
    return origin.rival.name;
  }
  return msg.fields.forkedPlayer({ day: origin.day, model: origin.rival.name });
}
export function Settlement({ run, release, slot, money, parentBalance, origin }: Props) {
  const [balanceDay, setBalanceDay] = useState<Optional<number>>(null);
  const nav = useNavigation("scores");
  const { state, best, reports, history } = run;
  const operator = operatorName(release, origin);
  // A run with only a model's moves is that model's result, not a second row beside it.
  const rivals =
    origin && origin.day > release.days
      ? run.rivals.filter((rival) => rival.id !== origin.rival.id)
      : run.rivals;
  const finalReceipt = reports.at(-1);
  const openDay = (day: number) => nav.setTab(`day:${day}`);
  return (
    <StationFrame slot={slot} page="run">
      <div className="dossier settlement-desks">
        <section className="bench-paper">
          <Scorecard
            seed={release.seed}
            best={best}
            history={history}
            money={money}
            operator={operator}
            reports={reports}
            rivals={rivals}
            state={state}
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
            best={best}
            history={history}
            operator={operator}
            parentBalance={parentBalance}
            release={release}
            rivals={rivals}
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
              const entries = hasValue(day) ? reports.filter((r) => r.day === day) : [];
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
                        money={money}
                        reports={reports}
                        state={state}
                        disabled
                        openReport={nav.setTab}
                      />
                    </>
                  ) : (
                    <>
                      {closing && (
                        <DayStatement
                          report={closing}
                          money={money}
                          reports={reports}
                          state={state}
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
        <SaveLibrarySection release={release} />
      </div>
    </StationFrame>
  );
}
