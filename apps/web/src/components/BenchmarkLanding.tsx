"use client";

import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { clock } from "@/scene/clock";
import Office from "@/scene/Office";

import { OperatorBrief } from "./OperatorBrief";
import { SaveLibrarySection } from "./SaveLibrarySection";
import SessionSetup from "./SessionSetup";
import { StationFrame } from "./StationFrame";
import "./benchmark-landing.css";

interface Props {
  release: Release;
  setup: ReactElement;
  lang: Locale;
}

function LandingDesk({ release, setup, lang }: Props) {
  const options = { locale: lang };
  const money = new Intl.NumberFormat(lang, { style: "currency", currency: release.currency });
  const leader = release.rivals
    .filter((rival) => rival.kind === "model")
    .toSorted((a, b) => b.score - a.score)[0];
  const source = "https://github.com/ProsusAI/vending-bench/tree/" + release.revision;
  const labels = { rules: msg.operator.rules, day: msg.operator.day, fee: msg.operator.fee };
  return (
    <StationFrame lang={lang} revision={release.revision} label={msg.landing.human({}, options)}>
      <div className="desk landing-desk">
        <article className="shell landing-console">
          <div className="landing-intro">
            <h1>
              {leader?.name
                ? msg.landing.lead({ model: leader.name }, options)
                : msg.landing.fallback({}, options)}
            </h1>
            <p>{msg.landing.context({}, options)}</p>
          </div>
          {setup}
        </article>
        <section className="workspace landing-workspace">
          <div className="surface landing-room">
            <Office
              site="lounge"
              phase={release.network.opens / 1440}
              light={0.8}
              slots={release.network.slots}
              depotCases={null}
              stock={null}
              focus={null}
              visit={null}
              service={null}
            />
          </div>
          <div className="transport landing-conditions">
            <b>
              {msg.session.term({}, options)}: {release.days}
            </b>
            <span>
              {clock(release.network.opens)}–{clock(release.network.closes)}
            </span>
            <span>
              {msg.operator.fee({}, options)}: {money.format(release.network.fee)}
            </span>
          </div>
          <div className="readout landing-readout" tabIndex={0}>
            <OperatorBrief
              release={release}
              state={null}
              t={(key) => labels[key]({}, options)}
              money={(value) => money.format(value)}
            />
            <a href={source + "/tasks/vending-bench/instruction.md"}>
              {msg.landing.source({}, options)}
            </a>
          </div>
        </section>
        <SaveLibrarySection release={release} lang={lang} embedded />
      </div>
      <footer className="landing-footer">
        <span>{msg.landing.local({}, options)}</span>
        <a href={source}>
          {release.version} @ {release.revision.slice(0, 7)}
        </a>
      </footer>
    </StationFrame>
  );
}

export default function BenchmarkLanding({ lang }: { lang: Locale }) {
  return (
    <SessionSetup
      lang={lang}
      renderPage={(release, setup) => <LandingDesk {...{ release, setup, lang }} />}
    />
  );
}
