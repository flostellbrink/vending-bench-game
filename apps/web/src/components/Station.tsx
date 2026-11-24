import type { Release } from "games-common/benchmark";

import { useMemo } from "react";

import type { ParentBalance } from "@/game/runs";

import { msg } from "@/dictionary";
import { locales } from "@/dictionary/runtime";
import { useCommandLine } from "@/hooks/useCommandLine";
import { useNavigation } from "@/hooks/useNavigation";
import { useRun } from "@/hooks/useRun";
import { isLang } from "@/localization/locale";
import { operatorLabels, screenLabels, type Lang } from "@/localization/messages";

import { OperatorTerminal } from "./OperatorTerminal";
import { Settlement } from "./Settlement";
import { Workspace } from "./Workspace";
interface Props {
  newRun: boolean;
  release: Release;
  slot: string;
  parentBalance?: ParentBalance;
  lang: Lang;
  changeLang: (locale: Lang) => void;
}
export function Station({ release, slot, parentBalance, lang, changeLang, newRun }: Props) {
  const nav = useNavigation(newRun ? "brief" : "desk"),
    run = useRun(release, slot, nav.setTab);
  const t = useMemo(() => operatorLabels(lang), [lang]),
    screen = useMemo(() => screenLabels(lang), [lang]);
  const money = useMemo(() => {
    const formatter = new Intl.NumberFormat(lang, {
      style: "currency",
      currency: release.currency,
    });
    return (value: number) => formatter.format(value);
  }, [lang, release.currency]);
  const shell = useCommandLine(run, nav, release, lang, t, screen);
  const { state, rivals, busy, history } = run;
  const opponent = rivals.find((r) => r.kind === "model") ?? rivals[0],
    day = history.length - 1,
    closing = history[day],
    rivalClose = opponent?.values?.[day];
  const gap =
    day > 0 && closing !== undefined && rivalClose !== undefined ? closing - rivalClose : null;
  if (state?.over)
    return <Settlement {...{ run, release, slot, lang, t, screen, money, parentBalance }} />;
  return (
    <main className="station">
      <header className="mast">
        <h1>
          <i className="brand-mark" aria-hidden />
          Vending Bench
        </h1>
        <span className="operator">{msg.landing.human({}, { locale: lang })}</span>
        <i className="vent" aria-hidden />
        {opponent && (
          <button className="pace-key" onClick={() => nav.setTab("scores")}>
            <span>
              {opponent.kind === "script" ? msg.fields.bot({}, { locale: lang }) : opponent.name}
            </span>
            <b>
              {gap === null
                ? money(opponent.score)
                : t("day") + " " + day + " · " + (gap > 0 ? "+" : "") + money(gap)}
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
        <button className="bank-key" aria-label={t("bank")} onClick={() => nav.setTab("world")}>
          <strong>{state ? money(state.cash) : "—"}</strong>
        </button>
      </header>
      <div className="desk">
        <OperatorTerminal
          {...{ release, lang, t, screen, money, run, shell }}
          setTab={nav.setTab}
        />
        <Workspace {...{ run, nav, shell, release, lang, t, screen, money, parentBalance }} />
      </div>
      <footer>
        <span>
          {state?.final
            ? t("score") + " · " + money(state.final.reward)
            : "Vending Bench / " + release.id + " · Seed " + release.seed}
        </span>
        <a href={"/" + lang + "/saves/?" + new URLSearchParams({ bench: release.revision, slot })}>
          {msg.session.library({}, { locale: lang })}
        </a>
      </footer>
    </main>
  );
}
