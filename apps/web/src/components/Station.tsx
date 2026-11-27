import type { Release } from "games-common/benchmark";

import { hasValue, includes, type Optional } from "games-common/language";
import { useLocale } from "games-localize/react";

import type { ParentBalance, RunOrigin } from "@/game/runs.ts";

import { msg } from "@/dictionary/index.ts";
import { locales } from "@/dictionary/runtime.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { useCommandLine } from "@/hooks/useCommandLine.ts";
import { useNavigation } from "@/hooks/useNavigation.ts";
import { useRun } from "@/hooks/useRun.ts";
import { useCurrency } from "@/localization/formatters.ts";
import { type Lang } from "@/localization/messages.ts";

import { OperatorTerminal } from "./OperatorTerminal.tsx";
import { Settlement } from "./Settlement.tsx";
import { Workspace } from "./Workspace.tsx";
interface Props {
  newRun: boolean;
  release: Release;
  slot: string;
  parentBalance?: ParentBalance;
  origin: Optional<RunOrigin>;

  changeLang: (locale: Lang) => void;
}
export function Station({ release, slot, parentBalance, origin, changeLang, newRun }: Props) {
  const lang = useLocale();
  const nav = useNavigation(newRun ? "brief" : "suppliers");
  const run = useRun(release, slot, nav.showResult);
  const currency = useCurrency(release.currency);
  const money = (value: number) => currency.format(value);
  const shell = useCommandLine(run, nav, release);
  const { state, rivals, busy, history } = run;
  const [opponent] = rankedModels(rivals);
  const day = history.length - 1;
  const closing = history[day];
  const rivalClose = opponent?.values?.[day];
  const gap = day > 0 && hasValue(closing) && hasValue(rivalClose) ? closing - rivalClose : null;
  if (state?.over) {
    return (
      <Settlement
        money={money}
        origin={origin}
        parentBalance={parentBalance}
        release={release}
        run={run}
        slot={slot}
      />
    );
  }
  return (
    <main className="station">
      <header className="mast">
        <h1>
          <i className="brand-mark" aria-hidden />
          Vending Bench
        </h1>
        <span className="operator">{msg.landing.human()}</span>
        <i className="vent" aria-hidden />
        {opponent && (
          <button className="pace-key" onClick={() => nav.setTab("scores")}>
            <span>{opponent.name}</span>
            <b>
              {hasValue(gap)
                ? `${msg.operator.day()} ${day} · ${gap > 0 ? "+" : ""}${money(gap)}`
                : `${msg.fields.score()} · ${money(opponent.score)}`}
            </b>
          </button>
        )}
        <select
          aria-label="Language / Idioma / Sprache"
          value={lang}
          disabled={busy}
          onChange={(e) => {
            if (includes(locales, e.target.value)) {
              changeLang(e.target.value);
            }
          }}
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          className="bank-key"
          aria-label={msg.operator.bank()}
          onClick={() => nav.setTab("world")}
        >
          <strong>{state ? money(state.cash) : "—"}</strong>
        </button>
      </header>
      <div className="desk">
        <OperatorTerminal
          money={money}
          release={release}
          run={run}
          shell={shell}
          setTab={nav.setTab}
        />
        <Workspace
          money={money}
          nav={nav}
          parentBalance={parentBalance}
          release={release}
          run={run}
          shell={shell}
        />
      </div>
      <footer>
        <span>
          {state?.final
            ? `${msg.operator.score()} · ${money(state.final.reward)}`
            : `Vending Bench / ${release.id} · Seed ${release.seed}`}
        </span>
        <a href={`/${lang}?${new URLSearchParams({ bench: release.revision, slot })}`}>
          {msg.session.mainMenu()}
        </a>
      </footer>
    </main>
  );
}
