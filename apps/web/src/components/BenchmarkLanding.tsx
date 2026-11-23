"use client";
import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { clock } from "@/scene/clock";

import SessionSetup from "./SessionSetup";
import { StationFrame } from "./StationFrame";

interface Cohort {
  version: string;
  seed: number;
  days: number;
  matching: boolean;
  source: string;
  scores: ReadonlyArray<readonly [string, number]>;
}
function cohorts(r: Release): Cohort[] {
  const models = r.rivals.filter((x) => x.kind === "model");
  const active = models[0]
    ? [
        {
          version: r.version,
          days: r.days,
          seed: r.seed,
          matching: true,
          source: models[0].source,
          scores: models.map((m) => [m.name ?? "AI", m.score] as const),
        },
      ]
    : [];
  return [...active, ...r.archives.map((a) => ({ ...a, matching: false }))];
}
function Dossier({
  release: r,
  setup,
  lang,
}: {
  release: Release;
  setup: ReactElement;
  lang: Locale;
}) {
  const opts = { locale: lang };
  const formatter = new Intl.NumberFormat(lang, { style: "currency", currency: r.currency });
  const money = (value: number) => formatter.format(value);
  const batches = cohorts(r);
  const featured = batches[0],
    leader = featured?.scores.toSorted((a, b) => b[1] - a[1])[0];
  const reference = r.rivals.find((rival) => rival.kind === "script");
  const repository = "https://github.com/ProsusAI/vending-bench";
  const source = repository + "/tree/" + r.revision;
  return (
    <StationFrame lang={lang} revision={r.revision} label={msg.landing.human({}, opts)}>
      <div className="dossier">
        <article className="bench-paper">
          <header className="bench-intro">
            <h1>
              {featured?.matching && leader
                ? msg.landing.lead({ model: leader[0] }, opts)
                : reference
                  ? msg.landing.referenceChallenge(
                      { score: money(reference.score), days: r.days },
                      opts,
                    )
                  : msg.landing.fallback({}, opts)}
            </h1>
            <p>{msg.landing.context({}, opts)}</p>
          </header>
          {batches.length > 0 && (
            <section className="bench-results">
              <h2>{msg.landing.results({}, opts)}</h2>
              {featured && leader && (
                <p>
                  {msg.landing.best(
                    { model: leader[0], score: money(leader[1]), version: featured.version },
                    opts,
                  )}
                </p>
              )}
              {batches.map((batch) => (
                <section key={batch.source + batch.seed + batch.days}>
                  <header>
                    <b>
                      {msg.landing.conditions(
                        { version: batch.version, days: batch.days, seed: batch.seed },
                        opts,
                      )}
                    </b>
                    <a href={batch.source}>{msg.landing.publication({}, opts)}</a>
                  </header>
                  {!batch.matching && (
                    <p className="cohort-note">
                      {msg.landing.archived({ playable: r.version }, opts)}
                    </p>
                  )}
                  <ol className="score-ladder" aria-label={msg.landing.score({}, opts)}>
                    {batch.scores
                      .toSorted((a, b) => b[1] - a[1])
                      .map(([name, score], i) => (
                        <li key={name}>
                          <span className="ladder-rank">{String(i + 1).padStart(2, "0")}</span>
                          <span>{name}</span>
                          <span className="score-track" aria-hidden>
                            <i
                              style={{
                                width:
                                  (100 * score) / Math.max(1, ...batch.scores.map((s) => s[1])) +
                                  "%",
                              }}
                            />
                          </span>
                          <b>{money(score)}</b>
                        </li>
                      ))}
                  </ol>
                </section>
              ))}
            </section>
          )}
          <section className="bench-method">
            <h2>{msg.landing.method({}, opts)}</h2>
            <p>
              {msg.landing.rules(
                {
                  machines: r.network.machines,
                  sites: r.network.sites,
                  days: r.days,
                  fee: money(r.network.fee),
                },
                opts,
              )}
            </p>
            <p>
              {msg.landing.clock(
                {
                  opens: clock(r.network.opens),
                  closes: clock(r.network.closes),
                  minutes: r.network.refill,
                },
                opts,
              )}
            </p>
            <a href={source + "/tasks/vending-bench/instruction.md"}>
              {msg.landing.source({}, opts)}
            </a>
          </section>
        </article>
        <aside className="launch-bay">
          {setup}
          <div className="runtime-note">
            <code>Python / WebAssembly</code>
            <p>{msg.landing.local({}, opts)}</p>
            <a href={source}>
              {r.version} @ {r.revision.slice(0, 7)}
            </a>
          </div>
        </aside>
      </div>
    </StationFrame>
  );
}
export default function BenchmarkLanding({ lang }: { lang: Locale }) {
  return (
    <SessionSetup
      lang={lang}
      renderPage={(release, setup) => <Dossier {...{ release, setup, lang }} />}
    />
  );
}
