import type { PersonalBest, Rival } from "games-common/benchmark";

import { useState } from "react";

import type { Money, Translate } from "@/localization/messages";

import { largestPaceLoss } from "@/game/pace";

interface Props {
  history: readonly number[];
  rivals: readonly Rival[];
  best: PersonalBest | null;
  playerName: string;
  scriptName: string;
  t: Translate;
  money: Money;
  reviewDay: (day: number) => void;
}
export function PaceReview({
  history,
  rivals,
  best,
  playerName,
  scriptName,
  t,
  money,
  reviewDay,
}: Props) {
  const [choice, choose] = useState("");
  const opponents = rivals.map((r) => ({
    key: r.source,
    name: r.kind === "script" ? scriptName : (r.name ?? r.source),
    values: r.values ?? [],
  }));
  if (best) opponents.push({ key: "personal", name: t("previousBest"), values: best.values });
  const rival = opponents.find((r) => r.key === choice) ?? opponents[0];
  if (!rival || history.length < 2) return null;
  const loss = largestPaceLoss(history, rival.values);
  const day = Math.min(history.length, rival.values.length) - 1;
  const playerClose = history[day];
  const rivalClose = rival.values[day];
  const signed = (value: number) => (value > 0 ? "+" : "") + money(value);
  return (
    <section className="pace-review">
      <header>
        <h3>{t("paceReview")}</h3>
        {opponents.length > 1 ? (
          <select
            aria-label={t("opponent")}
            value={rival.key}
            onChange={(e) => choose(e.currentTarget.value)}
          >
            {opponents.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span>{rival.name}</span>
        )}
      </header>
      {day > 0 && playerClose !== undefined && rivalClose !== undefined && (
        <div className="pace-checkpoint">
          <span>
            {t("closing")} · {t("day")} {day}
          </span>
          <dl>
            <div>
              <dt>{playerName}</dt>
              <dd>{money(playerClose)}</dd>
            </div>
            <div>
              <dt>{rival.name}</dt>
              <dd>{money(rivalClose)}</dd>
            </div>
            <div>
              <dt>{t("difference")}</dt>
              <dd>{signed(playerClose - rivalClose)}</dd>
            </div>
          </dl>
        </div>
      )}
      {loss ? (
        <>
          <p>
            <b>
              {t("day")} {loss.day}
            </b>{" "}
            · {t("largestPaceLoss")}: <strong>{money(-loss.difference)}</strong>
          </p>
          <div className="pace-pair">
            {[
              [playerName, signed(loss.player)],
              [rival.name, signed(loss.rival)],
            ].map(([name, value]) => (
              <div key={name}>
                <small>{name}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <button className="receipt-link" onClick={() => reviewDay(loss.day)}>
            {t("reviewThisDay")}
          </button>
        </>
      ) : (
        <p>{t(rival.values.length < 2 ? "noDailyComparison" : "noPaceLoss")}</p>
      )}
    </section>
  );
}
