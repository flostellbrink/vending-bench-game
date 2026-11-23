"use client";

import { first } from "games-common/language";
import { useMemo, useState, useSyncExternalStore } from "react";

import { msg } from "@/dictionary";
import { locales, type Locale } from "@/dictionary/runtime";
import { releases } from "@/game/releases";
import { readRecord, readRun, recordKey, runKey, saveRun, withRunLock } from "@/game/runs";

import "./session-setup.css";

interface Props {
  lang: Locale;
  initialRevision?: string;
  compact?: boolean;
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

function useStoredText(key: string) {
  return useSyncExternalStore<string | null | undefined | typeof unavailable>(
    subscribeToStorage,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return unavailable;
      }
    },
    () => undefined,
  );
}

export default function SessionSetup({ lang, initialRevision, compact = false }: Props) {
  const urlRevision = useSyncExternalStore(
    subscribeToNavigation,
    () => new URL(location.href).searchParams.get("bench"),
    () => null,
  );
  const [choice, setChoice] = useState<string>();
  const revision = choice ?? initialRevision ?? urlRevision;
  const current = releases.find((release) => release.revision === revision) ?? first(releases);
  const raw = useStoredText(runKey(current));
  const record = useStoredText(recordKey(current));
  const details = useMemo(() => {
    if (raw === unavailable || record === unavailable) return null;
    if (raw === undefined || record === undefined) return undefined;
    try {
      const best = readRecord(record);
      return { raw, finished: readRun(raw, best).finished, best: best?.score };
    } catch {
      return null;
    }
  }, [raw, record]);
  const [issue, setProblem] = useState<"conflict" | "unavailable">();
  const problem = details === null ? "unavailable" : issue;
  const [sending, setSending] = useState(false);
  const options = { locale: lang };
  const money = new Intl.NumberFormat(lang, { style: "currency", currency: current.currency });
  const hasSave = details != null && details.raw !== null;
  const disabled = sending || details == null || problem === "unavailable";
  const params = new URLSearchParams({ bench: current.revision });
  const destination = "/" + lang + "/run/?" + params;
  async function begin() {
    if (disabled || !details) return;
    if (hasSave && !details.finished && !window.confirm(msg.session.discard({}, options))) return;
    setSending(true);
    try {
      const key = runKey(current);
      await withRunLock(key, () => {
        const latestBest = readRecord(localStorage.getItem(recordKey(current)));
        saveRun(localStorage, key, details.raw, [], latestBest);
      });
      location.assign(destination);
    } catch (error) {
      if (error instanceof Error && error.message === "changed") {
        setProblem("conflict");
      } else setProblem("unavailable");
      setSending(false);
    }
  }

  const setup = (
    <section className="session-setup" aria-label={msg.session.choose({}, options)}>
      <header>
        {compact ? <h2>{msg.session.next({}, options)}</h2> : <h1>Vending Bench</h1>}
        {!compact && (
          <nav aria-label="Language / Idioma / Sprache">
            {locales.map((locale) => (
              <a
                key={locale}
                href={"/" + locale + "/?" + params}
                lang={locale}
                aria-current={locale === lang ? "page" : undefined}
              >
                {locale.toUpperCase()}
              </a>
            ))}
          </nav>
        )}
      </header>
      {!compact && <p>{msg.session.aim({}, options)}</p>}
      <label className="session-version">
        {msg.session.version({}, options)}
        <select
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
        {details?.best != null && (
          <div>
            <dt>{msg.session.record({}, options)}</dt>
            <dd>{money.format(details.best)}</dd>
          </div>
        )}
      </dl>
      {!current.rivals.some((r) => r.kind === "model") && (
        <p className="session-note">{msg.session.noAI({}, options)}</p>
      )}
      <div className="session-actions">
        {hasSave && !(compact && details?.finished && current.revision === initialRevision) && (
          <a href={destination}>
            {details?.finished ? msg.session.reopen({}, options) : msg.session.resume({}, options)}
          </a>
        )}
        <button type="button" disabled={disabled} onClick={begin}>
          {hasSave ? msg.session.again({}, options) : msg.session.start({}, options)}
        </button>
      </div>
      {problem && (
        <p role="alert">
          {problem === "conflict"
            ? msg.session.conflict({}, options)
            : msg.session.unavailable({}, options)}
        </p>
      )}
    </section>
  );
  return compact ? setup : <main className="session-screen">{setup}</main>;
}
