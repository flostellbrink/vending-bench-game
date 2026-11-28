"use client";
import { hoursPerDay } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { release } from "@/game/release.ts";
import { useLocationSearch } from "@/hooks/useSessionStorage.ts";
import { useCurrency } from "@/localization/formatters.ts";
import { clock } from "@/scene/clock.ts";
import Office from "@/scene/Office.tsx";

import { OperatorBrief } from "./OperatorBrief.tsx";
import { SaveLibrarySection } from "./SaveLibrarySection.tsx";
import SessionSetup from "./SessionSetup.tsx";
import { StationFrame } from "./StationFrame.tsx";
import "./benchmark-landing.css";

const minutesPerDay = hoursPerDay * 60;
/** The length of a short Git commit hash. */
const shortRevision = 7;

export default function BenchmarkLanding() {
  const slot = new URLSearchParams(useLocationSearch()).get("slot") ?? undefined;
  const money = useCurrency(release.currency);
  const scored = rankedModels(release.rivals).length > 0;
  const source = `https://github.com/ProsusAI/vending-bench/tree/${release.revision}`;
  return (
    <StationFrame slot={slot}>
      <div className="desk landing-desk">
        <article className="shell landing-console">
          <div className="landing-intro">
            <h1>
              {scored
                ? msg.landing.lead({ days: release.days })
                : msg.landing.fallback({ days: release.days })}
            </h1>
            <p>{msg.landing.context()}</p>
            <a className="landing-repo" href="https://github.com/flostellbrink/vending-bench-game">
              {msg.landing.gameSource()}
            </a>
          </div>
          <SessionSetup />
        </article>
        <section className="workspace landing-workspace">
          <div className="surface landing-room">
            <Office
              site="lounge"
              phase={release.network.opens / minutesPerDay}
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
            <a href={`${source}/tasks/vending-bench/instruction.md`}>{msg.landing.source()}</a>
          </div>
        </section>
        <SaveLibrarySection release={release} slot={slot} />
      </div>
      <footer className="landing-footer">
        <span>{msg.landing.local()}</span>
        <a href={source}>
          {release.version} @ {release.revision.slice(0, shortRevision)}
        </a>
      </footer>
    </StationFrame>
  );
}
