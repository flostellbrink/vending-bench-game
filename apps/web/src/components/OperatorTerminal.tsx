import type { Release, SlotObservation } from "games-common/benchmark";

import { useEffect, useMemo, useRef } from "react";

import type { CommandLine, Run } from "@/hooks/useCommandLine";

import { msg } from "@/dictionary";
import { syntax, toolFor, address } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import {
  commandLabel,
  type Lang,
  type Money,
  type ScreenTranslate,
  type Translate,
} from "@/localization/messages";
import { clock } from "@/scene/clock";

import { PlanEvidence } from "./PlanEvidence";
import { Receipts } from "./Receipts";
import { ShiftPlan } from "./ShiftPlan";
interface Props {
  release: Release;
  lang: Lang;
  t: Translate;
  screen: ScreenTranslate;
  money: Money;
  run: Run;
  shell: CommandLine;
  setTab: (id: number) => void;
}
export function OperatorTerminal({ release, lang, t, screen, money, run, shell, setTab }: Props) {
  const { busy, boot, lines, error, saveIssue, reports, state } = run;
  const {
    browse,
    choices,
    pick,
    complete,
    line,
    edit,
    prompt,
    tool,
    verb,
    setCaret,
    keys,
    orderEstimate,
  } = shell;
  const estimate = timeLabel(verb, state, t),
    log = useRef<HTMLDivElement>(null),
    follow = useRef(true);
  const observations = useMemo(() => {
    const bySlot: Record<string, SlotObservation & { day: number; minute: number }> = {};
    for (const r of reports) {
      for (const [key, v] of Object.entries(r.slots)) {
        const id = address(key);
        bySlot[id] = {
          ...v,
          capacity: v.capacity ?? bySlot[id]?.capacity ?? null,
          day: r.day,
          minute: r.minute,
        };
      }
    }
    return bySlot;
  }, [reports]);
  useEffect(() => {
    if (lines.length && follow.current && log.current)
      log.current.scrollTop = log.current.scrollHeight;
  }, [lines]);
  return (
    <aside className="shell">
      <header>
        <b>{t("terminal")}</b>
        <span className={"lamp" + (busy ? " working" : "")}>TTY / 01</span>
      </header>
      <div
        className="scrollback"
        ref={log}
        onClick={(e) => {
          if (
            e.target instanceof Element &&
            !e.target.closest("button,textarea,select,a") &&
            !window.getSelection()?.toString()
          )
            prompt.current?.focus();
        }}
        onScroll={(e) => {
          const n = e.currentTarget;
          follow.current = n.scrollHeight - n.clientHeight - n.scrollTop < 24;
        }}
      >
        {boot && (
          <div className="boot">
            <pre aria-label="VENDIX/OS">{` .-------.    VENDIX/OS
 | o o o |    Unattended Retail Systems
 | o o o |
 | [___] |
 '-------'`}</pre>
            <div role="status">
              {boot.map((stage) => (
                <div key={stage}>{t(stage)}</div>
              ))}
            </div>
          </div>
        )}
        {!lines.length && (
          <>
            <p>{msg.operator.objective({ days: release.days }, { locale: lang })}</p>
            {!release.rivals.some((r) => r.kind === "model") && <p>{t("noRivals")}</p>}
            <p>{t("hint")}</p>
          </>
        )}
        <Receipts lines={lines} lang={lang} openReport={setTab} money={money} />
      </div>
      <div className="input-zone">
        {state && shell.steps.length > 0 && <ShiftPlan {...{ state, shell, busy, t }} />}
        {state && shell.steps.length > 0 && (
          <PlanEvidence
            line={shell.line || shell.steps[0]?.line || ""}
            reports={reports}
            state={state}
            openReport={setTab}
            t={t}
          />
        )}
        {browse && choices.length > 0 && (
          <div className="completion">
            {choices.slice(Math.floor(pick / 5) * 5, Math.floor(pick / 5) * 5 + 5).map((s) => (
              <button
                key={s}
                className={choices[pick] === s ? "active" : ""}
                onClick={() => complete(s)}
              >
                {s}
                <small>
                  {observations[s]
                    ? observations[s].qty +
                      "/" +
                      (observations[s].capacity ?? "—") +
                      " · " +
                      t("day") +
                      " " +
                      observations[s].day +
                      " " +
                      clock(observations[s].minute)
                    : commandLabel(toolFor(s), lang)}
                </small>
              </button>
            ))}
          </div>
        )}
        {tool && (
          <div className="plan-edit">
            <small>
              {syntax(verb)} · {estimate}
            </small>
            {!state?.over && (
              <button onClick={shell.stage} disabled={busy} title={"Ctrl+Enter · " + t("noCharge")}>
                {shell.editing === null ? t("addPlan") : t("savePlan")}
              </button>
            )}
          </div>
        )}
        {shell.editing !== null && (
          <div className="plan-edit">
            <small>{t("editPlan")} · Enter / Esc</small>
            <button onClick={shell.cancelEdit}>{t("cancelPlan")}</button>
          </div>
        )}
        {orderEstimate && (
          <div className="order-estimate">
            <b>{t(orderEstimate.status)}</b>
            {orderEstimate.cost != null && (
              <>
                {" "}
                · {money(orderEstimate.cost)} · {t("afterOrder")}: {money(orderEstimate.remaining)}
              </>
            )}
            {orderEstimate.status === "belowMinimum" && (
              <>
                {" "}
                · {t("shortBy")}: {money(orderEstimate.minimum - orderEstimate.cost)}
              </>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {run.runtimeError && (
          <div role="alert">
            <p>{run.runtimeError}</p>
            <button onClick={() => location.reload()}>{t("resumeSavedRun")}</button>
          </div>
        )}
        {saveIssue && <p role="alert">{t(saveIssue)}</p>}
        <div className="command-line">
          <span aria-hidden="true">›</span>
          <textarea
            autoFocus
            rows={1}
            id="prompt"
            disabled={Boolean(run.runtimeError)}
            ref={prompt}
            value={line}
            aria-label={t("query")}
            aria-description={t("hint")}
            enterKeyHint="send"
            autoComplete="off"
            spellCheck="false"
            autoCapitalize="none"
            onChange={(e) => edit(e.target.value, e.target.selectionStart)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={keys}
          />
        </div>
      </div>
      <div className="terminal-keys">
        <small>
          {busy
            ? screen("loading")
            : "Tab " + t("completeKey") + " · Enter " + t("execute") + " · ↑ " + t("history")}
        </small>
      </div>
    </aside>
  );
}
