import type { Release } from "games-common/benchmark";

import { useLocale } from "games-localize/react";

import type { ParentBalance } from "@/game/runs";

import { msg } from "@/dictionary";
import { locales } from "@/dictionary/runtime";
import { useCommandLine } from "@/hooks/useCommandLine";
import { useNavigation } from "@/hooks/useNavigation";
import { useRun } from "@/hooks/useRun";
import { useCurrency } from "@/localization/formatters";
import { isLang } from "@/localization/locale";
import { type Lang } from "@/localization/messages";

import { OperatorTerminal } from "./OperatorTerminal";
import { Settlement } from "./Settlement";
import { Workspace } from "./Workspace";
interface Props {
  newRun: boolean;
  release: Release;
  slot: string;
  parentBalance?: ParentBalance;

  changeLang: (locale: Lang) => void;
}
export function Station({ release, slot, parentBalance, changeLang, newRun }: Props) {
  const lang = useLocale();
  const nav = useNavigation(newRun ? "brief" : "suppliers"),
    run = useRun(release, slot, nav.setTab);
  const currency = useCurrency(release.currency);
  const money = (value: number) => currency.format(value);
  const shell = useCommandLine(run, nav, release);
  const { state, rivals, busy, history } = run;
  const opponent = rivals.find((r) => r.kind === "model") ?? rivals[0],
    day = history.length - 1,
    closing = history[day],
    rivalClose = opponent?.values?.[day];
  const gap =
    day > 0 && closing !== undefined && rivalClose !== undefined ? closing - rivalClose : null;
  if (state?.over) return <Settlement {...{ run, release, slot, money, parentBalance }} />;
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
            <span>{opponent.kind === "script" ? msg.fields.bot() : opponent.name}</span>
            <b>
              {gap === null
                ? money(opponent.score)
                : msg.operator.day() + " " + day + " · " + (gap > 0 ? "+" : "") + money(gap)}
            </b>
          </button>
        )}
        <select
          aria-label="Language / Idioma / Sprache"
          value={lang}
          disabled={busy}
          onChange={(e) => {
            if (isLang(e.target.value)) changeLang(e.target.value);
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
        <OperatorTerminal {...{ release, money, run, shell }} setTab={nav.setTab} />
        <Workspace {...{ run, nav, shell, release, money, parentBalance }} />
      </div>
      <footer>
        <span>
          {state?.final
            ? msg.operator.score() + " · " + money(state.final.reward)
            : "Vending Bench / " + release.id + " · Seed " + release.seed}
        </span>
        <a href={"../?" + new URLSearchParams({ bench: release.revision, slot })}>
          {msg.session.mainMenu()}
        </a>
      </footer>
    </main>
  );
}
