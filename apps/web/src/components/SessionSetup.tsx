"use client";
import { hasValue } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { release } from "@/game/release.ts";
import { readRecord, recordKey } from "@/game/runs.ts";
import { useStoredText } from "@/hooks/useSessionStorage.ts";
import { useCurrency } from "@/localization/formatters.ts";

import "./session-setup.css";

export default function SessionSetup() {
  const record = useStoredText(() => {
    const best = readRecord(localStorage.getItem(recordKey(release)));
    return hasValue(best) ? String(best.score) : null;
  });
  const money = useCurrency(release.currency);
  const models = rankedModels(release.rivals);
  const title = msg.session.setup();
  return (
    <section className="session-setup" aria-label={title}>
      <header>
        <h2>{title}</h2>
      </header>
      <div className="session-version">
        {msg.session.version()} <b>{release.version}</b>
      </div>
      <dl className="session-terms">
        <div>
          <dt>{msg.session.opening()}</dt>
          <dd>{money.format(release.startingBalance)}</dd>
        </div>
        <div>
          <dt>{msg.session.term()}</dt>
          <dd>{release.days}</dd>
        </div>
        <div>
          <dt>{msg.session.seed()}</dt>
          <dd>{release.seed}</dd>
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
        {models.length ? msg.session.soloSeed({ seed: release.seed }) : msg.session.noAI()}
      </p>
    </section>
  );
}
