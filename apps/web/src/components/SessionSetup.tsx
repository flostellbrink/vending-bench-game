"use client";
import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import { first } from "games-common/language";
import { useState } from "react";

import { msg } from "@/dictionary";
import { rankedModels } from "@/game/model-rivals";
import { releases } from "@/game/releases";
import { readRecord, recordKey } from "@/game/runs";
import { unavailable, useLocationSearch, useStoredText } from "@/hooks/useSessionStorage";
import { useCurrency } from "@/localization/formatters";

import "./session-setup.css";

interface Props {
  initialRevision?: string;
  activeSlot?: string;
  compact?: boolean;
  renderPage?: (release: Release, setup: ReactElement, slot?: string) => ReactElement;
}

export default function SessionSetup({
  initialRevision,
  activeSlot,
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
  const money = useCurrency(current.currency);
  const models = rankedModels(current.rivals);
  const savedParams = new URLSearchParams({ bench: current.revision });
  const selectedSlot =
    current.revision === (initialRevision ?? urlRevision)
      ? (activeSlot ?? params.get("slot"))
      : null;
  if (selectedSlot) savedParams.set("slot", selectedSlot);
  const setupTitle = compact
    ? msg.session.next()
    : releases.length === 1
      ? msg.session.setup()
      : msg.session.choose();
  const setup = (
    <section className="session-setup" aria-label={setupTitle}>
      <header>
        <h2>{setupTitle}</h2>
      </header>
      {releases.length === 1 ? (
        <div className="session-version">
          {msg.session.version()} <b>{current.id}</b>
        </div>
      ) : (
        <label className="session-version">
          {msg.session.version()}
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
          <dt>{msg.session.opening()}</dt>
          <dd>{money.format(current.startingBalance)}</dd>
        </div>
        <div>
          <dt>{msg.session.term()}</dt>
          <dd>{current.days}</dd>
        </div>
        <div>
          <dt>{msg.session.seed()}</dt>
          <dd>{current.seed}</dd>
        </div>
      </dl>
      <h3>{msg.session.target()}</h3>
      <dl className="session-scores">
        {[...models, ...current.rivals.filter((r) => r.kind === "script")].map((r) => (
          <div key={r.source}>
            <dt>
              <a href={r.source}>{r.kind === "script" ? msg.session.reference() : r.name}</a>
            </dt>
            <dd>{money.format(r.score)}</dd>
          </div>
        ))}
        {typeof record === "string" && (
          <div>
            <dt>{msg.session.record()}</dt>
            <dd>{money.format(Number(record))}</dd>
          </div>
        )}
      </dl>
      <p className="session-note">
        {models.length ? msg.session.soloSeed({ seed: current.seed }) : msg.session.noAI()}
      </p>
      {!renderPage && (
        <p className="save-library-link">
          <a href={"../?" + savedParams}>{msg.session.mainMenu()}</a>
        </p>
      )}
      {!renderPage && record === unavailable && <p role="alert">{msg.session.unavailable()}</p>}
    </section>
  );
  return renderPage ? renderPage(current, setup, selectedSlot ?? undefined) : setup;
}
