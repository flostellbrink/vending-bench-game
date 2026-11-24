import type { Release } from "games-common/benchmark";

import { useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { Run } from "@/hooks/useCommandLine";
import type { Lang, Money, ScreenTranslate, Translate } from "@/localization/messages";

import { clock } from "@/scene/clock";

import { BalanceScope } from "./BalanceScope";
import { DayStatement } from "./DayStatement";
import { Scorecard } from "./Scorecard";
import SessionSetup from "./SessionSetup";
import { StationFrame } from "./StationFrame";

interface Props {
  parentBalance?: ParentBalance;
  slot: string;
  run: Run;
  release: Release;
  lang: Lang;
  t: Translate;
  screen: ScreenTranslate;
  money: Money;
}
export function Settlement({ run, release, slot, lang, t, screen, money, parentBalance }: Props) {
  const [day, setDay] = useState<number | null>(null),
    [balanceDay, setBalanceDay] = useState<number | null>(null),
    [receipt, setReceipt] = useState<number | null>(null);
  const { state, rivals, best, reports, history } = run;
  const selected = reports.find((r) => r.id === receipt);
  const closing = reports.find((r) => r.day === day && r.endDay !== r.day);
  return (
    <StationFrame
      lang={lang}
      revision={release.revision}
      slot={slot}
      label={t("standings")}
      page="run"
    >
      <div className="dossier settlement-desks">
        <section className="bench-paper">
          <Scorecard
            {...{ state, rivals, best, lang, t, screen, reports, money, history }}
            archives={release.archives}
            reviewDay={(d) => {
              setDay(d);
              setReceipt(null);
            }}
            openReport={(id) => {
              setReceipt(id);
              setDay(reports.find((r) => r.id === id)?.day ?? null);
            }}
          />
          <BalanceScope
            {...{ history, rivals, best, parentBalance, release, lang, t }}
            selected={
              balanceDay ??
              (parentBalance ? Math.min(parentBalance.values.length, history.length) - 1 : null)
            }
            setSelected={setBalanceDay}
            showReceipts={(closingDay) => {
              setDay(closingDay);
              setReceipt(null);
            }}
          />
          {day !== null && (
            <section className="finish-evidence">
              <h2>
                {t("day")} {day} · {t("results")}
              </h2>
              {closing && state && (
                <DayStatement
                  report={closing}
                  {...{ reports, state, t, money }}
                  openReport={setReceipt}
                />
              )}
              {reports
                .filter((r) => r.day === day)
                .map((r) => (
                  <button className="catalog" key={r.id} onClick={() => setReceipt(r.id)}>
                    {clock(r.minute)} · {r.line} · {r.minutes} min
                  </button>
                ))}
            </section>
          )}
          {selected && (
            <section className="finish-evidence">
              <h2>
                #{selected.id} · {selected.line}
              </h2>
              <p>
                {t("day")} {selected.day} · {clock(selected.minute)} → {clock(selected.endMinute)} ·{" "}
                {selected.minutes} min
              </p>
              <p>
                {t("bank")}: {money(selected.openingCash)} → {money(selected.closingCash)}
              </p>
              {selected.terms?.order && (
                <p>
                  {selected.terms.order} · {t("expectedClose")} {selected.terms.eta}
                </p>
              )}
              {selected.rows.length > 0 && (
                <table>
                  <tbody>
                    {selected.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected.display && <pre>{selected.display}</pre>}
              {selected.notices.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </section>
          )}
        </section>
        <aside className="launch-bay">
          <SessionSetup
            lang={lang}
            initialRevision={release.revision}
            activeSlot={slot}
            initialDay={day ?? undefined}
            compact
          />
        </aside>
      </div>
    </StationFrame>
  );
}
