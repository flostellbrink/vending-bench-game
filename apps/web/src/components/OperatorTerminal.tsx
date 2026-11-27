import type { Release, SlotObservation } from "games-common/benchmark";

import { entries, hasAny, hasValue } from "games-common/language";
import { useEffect, useMemo, useRef } from "react";

import type { CommandLine, Run } from "@/hooks/useCommandLine.ts";

import { msg } from "@/dictionary/index.ts";
import { syntax, toolFor } from "@/game/commands.ts";
import { useTimeLabel } from "@/game/time-label.ts";
import { commandLabel, orderStatus, type Money } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import { PlanEvidence } from "./PlanEvidence.tsx";
import { Receipts } from "./Receipts.tsx";
import { ShiftPlan } from "./ShiftPlan.tsx";
/** The log keeps following new receipts while the reader is this close to its end, in pixels. */
const followSlack = 24;
const bootStages = {
  mount: msg.operator.mount,
  ready: msg.operator.ready,
  runtime: msg.operator.runtime,
};
interface Props {
  release: Release;

  money: Money;
  run: Run;
  shell: CommandLine;
  setTab: (id: number | "help") => void;
}
export function OperatorTerminal({ release, money, run, shell, setTab }: Props) {
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
  const timeLabel = useTimeLabel();
  const estimate = timeLabel(verb, state);
  const log = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const observations = useMemo(() => {
    const bySlot: Record<string, SlotObservation & { day: number; minute: number }> = {};
    for (const r of reports) {
      for (const [key, v] of entries(r.slots)) {
        const id = JSON.stringify(key);
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
    if (lines.length && follow.current && log.current) {
      log.current.scrollTop = log.current.scrollHeight;
    }
  }, [lines]);
  return (
    <aside className="shell">
      <header>
        <b>{msg.operator.terminal()}</b>
        <span className={`lamp${busy ? " working" : ""}`}>TTY / 01</span>
      </header>
      <div
        className="scrollback"
        ref={log}
        onClick={(e) => {
          if (
            e.target instanceof Element &&
            !e.target.closest("button,textarea,select,a") &&
            !globalThis.getSelection()?.toString()
          ) {
            prompt.current?.focus();
          }
        }}
        onScroll={(e) => {
          const n = e.currentTarget;
          follow.current = n.scrollHeight - n.clientHeight - n.scrollTop < followSlack;
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
                <div key={stage}>{bootStages[stage]()}</div>
              ))}
            </div>
          </div>
        )}
        {!lines.length && (
          <>
            <p>{msg.operator.objective({ days: release.days })}</p>
            {!release.rivals.length && <p>{msg.operator.noRivals()}</p>}
            <p>{msg.operator.hint()}</p>
          </>
        )}
        <Receipts lines={lines} openReport={setTab} money={money} />
      </div>
      <div className="input-zone">
        {state && shell.steps.length > 0 && <ShiftPlan busy={busy} shell={shell} state={state} />}
        {state && shell.steps.length > 0 && (
          <PlanEvidence
            line={shell.line || shell.steps[0]?.line || ""}
            reports={reports}
            state={state}
            openReport={setTab}
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
                    ? `${observations[s].qty}/${
                        observations[s].capacity ?? "—"
                      } · ${msg.operator.day()} ${observations[s].day} ${clock(
                        observations[s].minute,
                      )}`
                    : commandLabel(toolFor(s))}
                </small>
              </button>
            ))}
          </div>
        )}
        {tool && (
          <div className="plan-edit">
            <small>
              {syntax(verb, run.actions)} · {estimate}
            </small>
            {!state?.over && (
              <button
                onClick={shell.stage}
                disabled={busy}
                title={`Ctrl+Enter · ${msg.operator.noCharge()}`}
              >
                {hasValue(shell.editing) ? msg.operator.savePlan() : msg.operator.addPlan()}
              </button>
            )}
          </div>
        )}
        {hasValue(shell.editing) && (
          <div className="plan-edit">
            <small>{msg.operator.editPlan()} · Enter / Esc</small>
            <button onClick={shell.cancelEdit}>{msg.operator.cancelPlan()}</button>
          </div>
        )}
        {orderEstimate && (
          <div className="order-estimate">
            <b>{orderStatus[orderEstimate.status]()}</b>
            {orderEstimate.status !== "needQuote" && orderEstimate.status !== "expiredQuote" && (
              <>
                {" "}
                · {money(orderEstimate.cost)} · {msg.operator.afterOrder()}:{" "}
                {money(orderEstimate.remaining)}
              </>
            )}
            {orderEstimate.status === "belowMinimum" && (
              <>
                {" "}
                · {msg.operator.shortBy()}: {money(orderEstimate.minimum - orderEstimate.cost)}
              </>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {hasAny(run.runtimeError) && (
          <div role="alert">
            <p>{run.runtimeError}</p>
            <button onClick={() => location.reload()}>{msg.operator.resumeSavedRun()}</button>
          </div>
        )}
        {hasAny(saveIssue) && (
          <p role="alert">
            {(saveIssue === "saveConflict" ? msg.operator.saveConflict : msg.operator.saveFailed)()}
          </p>
        )}
        <div className="command-line">
          <span aria-hidden="true">›</span>
          <textarea
            autoFocus
            rows={1}
            id="prompt"
            disabled={hasAny(run.runtimeError)}
            ref={prompt}
            value={line}
            aria-label={msg.operator.query()}
            aria-description={msg.operator.hint()}
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
            ? msg.screen.loading()
            : `Tab ${msg.operator.completeKey()} · Enter ${msg.operator.execute()} · ↑ ${msg.operator.history()}`}
        </small>
        <button type="button" className="terminal-manual-link" onClick={() => setTab("help")}>
          {msg.operator.help()}
        </button>
      </div>
    </aside>
  );
}
