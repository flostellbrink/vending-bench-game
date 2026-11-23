"use client";

import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import { first } from "games-common/language";
import { useId, useState, useSyncExternalStore } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { releases } from "@/game/releases";
import { forkRun, readRecord, readSlotSnapshot, recordKey, slotSnapshot } from "@/game/runs";

import SaveTree from "./SaveTree";
import "./session-setup.css";

interface Props {
  lang: Locale;
  initialRevision?: string;
  activeSlot?: string;
  initialDay?: number;
  compact?: boolean;
  renderPage?: (release: Release, setup: ReactElement) => ReactElement;
}

const unavailable = Symbol("unavailable");

function subscribeToNavigation(update: () => void) {
  window.addEventListener("popstate", update);
  return () => window.removeEventListener("popstate", update);
}

function subscribeToStorage(update: () => void) {
  window.addEventListener("storage", update);
  return () => window.removeEventListener("storage", update);
}

function useStoredText(read: () => string | null) {
  return useSyncExternalStore<string | null | undefined | typeof unavailable>(
    subscribeToStorage,
    () => {
      try {
        return read();
      } catch {
        return unavailable;
      }
    },
    () => undefined,
  );
}

export default function SessionSetup({
  lang,
  initialRevision,
  activeSlot,
  initialDay,
  compact = false,
  renderPage,
}: Props) {
  const search = useSyncExternalStore(
    subscribeToNavigation,
    () => location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const urlRevision = params.get("bench");
  const [choice, setChoice] = useState<string>();
  const revision = choice ?? initialRevision ?? urlRevision;
  const current =
    releases.find((release) => release.revision === revision) ??
    releases.find((release) => release.rivals.some((r) => r.kind === "model")) ??
    first(releases);
  const snapshot = useStoredText(() => slotSnapshot(localStorage, current));
  const slots = typeof snapshot === "string" ? readSlotSnapshot(snapshot) : [];
  const record = useStoredText(() => {
    const best = readRecord(localStorage.getItem(recordKey(current)));
    return best === null ? null : String(best.score);
  });
  const [issue, setProblem] = useState<"branchFailed" | "unavailable">();
  const problem = snapshot === unavailable ? "unavailable" : issue;
  const [sending, setSending] = useState(false);
  const options = { locale: lang };
  const money = new Intl.NumberFormat(lang, { style: "currency", currency: current.currency });
  const disabled = sending || typeof snapshot !== "string";
  const startForm = useId();
  function branch(id: string, day: number) {
    if (disabled) return;
    setSending(true);
    try {
      const slot = forkRun(localStorage, current, id, day);
      location.assign(
        "/" + lang + "/run/?" + new URLSearchParams({ bench: current.revision, slot }),
      );
    } catch {
      setProblem("branchFailed");
      setSending(false);
    }
  }

  const setup = (
    <section className="session-setup" aria-label={msg.session.choose({}, options)}>
      <header>
        {compact ? (
          <h2>{msg.session.next({}, options)}</h2>
        ) : (
          <h2>{msg.session.choose({}, options)}</h2>
        )}
      </header>
      <label className="session-version">
        {msg.session.version({}, options)}
        <select
          name="bench"
          form={startForm}
          value={current.revision}
          disabled={sending}
          onChange={(event) => {
            setChoice(event.currentTarget.value);
            setProblem(undefined);
          }}
        >
          {releases.map((release) => (
            <option key={release.revision} value={release.revision}>
              {release.id}
            </option>
          ))}
        </select>
      </label>
      <dl className="session-terms">
        <div>
          <dt>{msg.session.opening({}, options)}</dt>
          <dd>{money.format(current.startingBalance)}</dd>
        </div>
        <div>
          <dt>{msg.session.term({}, options)}</dt>
          <dd>{current.days}</dd>
        </div>
        <div>
          <dt>{msg.session.seed({}, options)}</dt>
          <dd>{current.seed}</dd>
        </div>
      </dl>
      <h3>{msg.session.target({}, options)}</h3>
      <dl className="session-scores">
        {current.rivals.map((r) => (
          <div key={r.source}>
            <dt>
              <a href={r.source}>
                {r.kind === "script" ? msg.session.reference({}, options) : r.name}
              </a>
            </dt>
            <dd>{money.format(r.score)}</dd>
          </div>
        ))}
        {typeof record === "string" && (
          <div>
            <dt>{msg.session.record({}, options)}</dt>
            <dd>{money.format(Number(record))}</dd>
          </div>
        )}
      </dl>
      {!current.rivals.some((r) => r.kind === "model") && (
        <p className="session-note">{msg.session.noAI({}, options)}</p>
      )}
      <form id={startForm} className="session-actions" method="get" action={"/" + lang + "/run/"}>
        <input name="slot" type="hidden" value="new" />
        <button type="submit" disabled={sending}>
          {slots.length ? msg.session.again({}, options) : msg.session.start({}, options)}
        </button>
      </form>
      <SaveTree
        key={current.revision + ":" + (initialDay ?? "latest")}
        release={current}
        slots={slots}
        lang={lang}
        compact={compact}
        activeSlot={
          current.revision === (initialRevision ?? urlRevision)
            ? (activeSlot ?? params.get("slot") ?? undefined)
            : undefined
        }
        initialDay={current.revision === initialRevision ? initialDay : undefined}
        disabled={disabled}
        branch={branch}
      />
      {problem && (
        <p role="alert">
          {problem === "branchFailed"
            ? msg.session.branchFailed({}, options)
            : msg.session.unavailable({}, options)}
        </p>
      )}
    </section>
  );
  return renderPage ? renderPage(current, setup) : setup;
}
