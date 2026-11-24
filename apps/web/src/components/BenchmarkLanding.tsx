"use client";
import type { Release } from "games-common/benchmark";
import type { ReactElement } from "react";

import { msg } from "@/dictionary";
import { useCurrency } from "@/localization/formatters";
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
  slot?: string;
}

function LandingDesk({ release, setup, slot }: Props) {
  const money = useCurrency(release.currency);
  const leader = release.rivals
    .filter((rival) => rival.kind === "model")
    .toSorted((a, b) => b.score - a.score)[0];
  const source = "https://github.com/ProsusAI/vending-bench/tree/" + release.revision;
  return (
    <StationFrame revision={release.revision} slot={slot}>
      <div className="desk landing-desk">
        <article className="shell landing-console">
          <div className="landing-intro">
            <h1>
              {leader?.name ? msg.landing.lead({ model: leader.name }) : msg.landing.fallback()}
            </h1>
            <p>{msg.landing.context()}</p>
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
              {msg.session.term()}: {release.days}
            </b>
            <span>
              {clock(release.network.opens)}–{clock(release.network.closes)}
            </span>
            <span>
              {msg.operator.fee()}: {money.format(release.network.fee)}
            </span>
          </div>
          <div className="readout landing-readout" tabIndex={0}>
            <OperatorBrief
              release={release}
              state={null}

              money={(value) => money.format(value)}
            />
            <a href={source + "/tasks/vending-bench/instruction.md"}>{msg.landing.source()}</a>
          </div>
        </section>
        <SaveLibrarySection release={release} slot={slot} />
      </div>
      <footer className="landing-footer">
        <span>{msg.landing.local()}</span>
        <a href={source}>
          {release.version} @ {release.revision.slice(0, 7)}
        </a>
      </footer>
    </StationFrame>
  );
}

export default function BenchmarkLanding() {
  return (
    <SessionSetup
      renderPage={(release, setup, slot) => <LandingDesk {...{ release, setup, slot }} />}
    />
  );
}
