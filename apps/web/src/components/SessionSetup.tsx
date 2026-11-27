"use client";
import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import { first, hasValue } from "games-common/language";
import { useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { releases } from "@/game/releases.ts";
import { readRecord, recordKey } from "@/game/runs.ts";
import { useLocationSearch, useStoredText } from "@/hooks/useSessionStorage.ts";
import { useCurrency } from "@/localization/formatters.ts";

import "./session-setup.css";

interface Props {
  renderPage: (release: Release, setup: ReactElement, slot?: string) => ReactElement;
}

export default function SessionSetup({ renderPage }: Props) {
  const search = useLocationSearch();
  const params = new URLSearchParams(search);
  const urlRevision = params.get("bench");
  const [choice, setChoice] = useState<string>();
  const revision = choice ?? urlRevision;
  const current =
    releases.find((release) => release.revision === revision) ??
    releases.find((release) => release.rivals.length) ??
    first(releases);
  const record = useStoredText(() => {
    const best = readRecord(localStorage.getItem(recordKey(current)));
    return hasValue(best) ? String(best.score) : null;
  });
  const money = useCurrency(current.currency);
  const models = rankedModels(current.rivals);
  const selectedSlot = current.revision === urlRevision ? params.get("slot") : null;
  const title = releases.length === 1 ? msg.session.setup() : msg.session.choose();
  const setup = (
    <section className="session-setup" aria-label={title}>
      <header>
        <h2>{title}</h2>
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
        {models.map((r) => (
          <div key={r.source}>
            <dt>
              <a href={r.source}>{r.name}</a>
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
    </section>
  );
  return renderPage(current, setup, selectedSlot ?? undefined);
}
