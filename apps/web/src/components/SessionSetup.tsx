"use client";

import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import { first } from "games-common/language";
import { useState } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { releases } from "@/game/releases";
import { readRecord, recordKey } from "@/game/runs";
import { unavailable, useLocationSearch, useStoredText } from "@/hooks/useSessionStorage";

import "./session-setup.css";

interface Props {
  lang: Locale;
  initialRevision?: string;
  activeSlot?: string;
  initialDay?: number;
  compact?: boolean;
  renderPage?: (release: Release, setup: ReactElement) => ReactElement;
}

export default function SessionSetup({
  lang,
  initialRevision,
  activeSlot,
  initialDay,
  compact = false,
  renderPage,
}: Props) {
  const search = useLocationSearch();
  const params = new URLSearchParams(search);
  const urlRevision = params.get("bench");
  const [choice, setChoice] = useState<string>();
  const revision = choice ?? initialRevision ?? urlRevision;
  const current =
    releases.find((release) => release.revision === revision) ??
    releases.find((release) => release.rivals.some((r) => r.kind === "model")) ??
    first(releases);
  const record = useStoredText(() => {
    const best = readRecord(localStorage.getItem(recordKey(current)));
    return best === null ? null : String(best.score);
  });
  const options = { locale: lang };
  const money = new Intl.NumberFormat(lang, { style: "currency", currency: current.currency });
  const savedParams = new URLSearchParams({ bench: current.revision });
  const selectedSlot =
    current.revision === (initialRevision ?? urlRevision)
      ? (activeSlot ?? params.get("slot"))
      : null;
  if (selectedSlot) savedParams.set("slot", selectedSlot);
  if (initialDay !== undefined && current.revision === initialRevision)
    savedParams.set("day", String(initialDay));
  const setupTitle = compact
    ? msg.session.next({}, options)
    : releases.length === 1
      ? msg.session.setup({}, options)
      : msg.session.choose({}, options);
  const setup = (
    <section className="session-setup" aria-label={setupTitle}>
      <header>
        <h2>{setupTitle}</h2>
      </header>
      {releases.length === 1 ? (
        <div className="session-version">
          {msg.session.version({}, options)} <b>{current.id}</b>
        </div>
      ) : (
        <label className="session-version">
          {msg.session.version({}, options)}
          <select
            value={current.revision}
            onChange={(event) => {
              setChoice(event.currentTarget.value);
            }}
          >
            {releases.map((release) => (
              <option key={release.revision} value={release.revision}>
                {release.id}
              </option>
            ))}
          </select>
        </label>
      )}
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
      {!renderPage && (
        <p className="save-library-link">
          <a href={"/" + lang + "/saves/?" + savedParams}>
            {msg.session.library({}, options)}
            {savedParams.has("day") &&
              " · " + msg.session.dayNumber({ day: Number(savedParams.get("day")) }, options)}
          </a>
        </p>
      )}
      {!renderPage && record === unavailable && (
        <p role="alert">{msg.session.unavailable({}, options)}</p>
      )}
    </section>
  );
  return renderPage ? renderPage(current, setup) : setup;
}
