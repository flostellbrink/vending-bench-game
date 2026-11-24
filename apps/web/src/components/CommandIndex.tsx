import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { entries } from "games-common/language";
import { useState } from "react";

import { commandGroups, local, syntax, toolFor } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { commandLabel, type Lang, type Translate } from "@/localization/messages";

import "./command-manual.css";

interface Props {
  actions: Actions;
  release: Release;
  state: Snapshot | null;
  lang: Lang;
  t: Translate;
  openBrief: () => void;
}

export function CommandIndex({ actions, release, state, lang, t, openBrief }: Props) {
  const [choice, choose] = useState("find");
  const groups = entries(commandGroups).map(([key, names]) => ({
    label: t(key),
    names: names.filter(
      (name) => (toolFor(name) ?? "") in release.tools || (toolFor(name) ?? "") in actions,
    ),
  }));
  const mapped = new Set<string | undefined>(groups.flatMap((group) => group.names.map(toolFor)));
  const other = Object.keys(release.tools).filter((tool) => !mapped.has(tool));
  const sections = [
    ...groups,
    { label: t("toolInformation"), names: other },
    { label: t("local"), names: local },
  ].filter((g) => g.names.length > 0);
  const selected = sections.some((s) => s.names.some((name) => name === choice))
    ? choice
    : (sections[0]?.names[0] ?? "help");
  const aliasTool = toolFor(selected);
  const tool = aliasTool ?? (other.includes(selected) ? selected : undefined);
  const description = tool ? release.tools[tool] : undefined;
  const localLabels: Record<string, string> = {
    help: t("help"),
    brief: t("rules"),
    orders: t("supply"),
    balance: t("bank"),
    world: t("supply"),
    tabs: t("journal"),
    view: t("openReceipt"),
    scores: t("standings"),
  };
  return (
    <section className="command-manual">
      <nav className="manual-index" aria-label={t("help")}>
        {sections.map((section) => (
          <section key={section.label}>
            <h3>{section.label}</h3>
            <div>
              {section.names.map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={name === selected}
                  onClick={() => choose(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <article className="manual-page" aria-live="polite">
        <header>
          <h3>{selected}</h3>
          <span>{aliasTool ? commandLabel(aliasTool, lang) : localLabels[selected]}</span>
        </header>
        {!other.includes(selected) && <pre>{syntax(selected)}</pre>}
        <dl>
          {tool && (
            <div>
              <dt>MCP</dt>
              <dd>
                <code>{tool}</code>
              </dd>
            </div>
          )}
          {!other.includes(selected) && (
            <div>
              <dt>{t("timeCost")}</dt>
              <dd>{timeLabel(selected, state, t)}</dd>
            </div>
          )}
        </dl>
        {description && <p lang="en">{description}</p>}
        {selected === "brief" && (
          <button className="receipt-link" onClick={openBrief}>
            {t("rules")}
          </button>
        )}
        {!other.includes(selected) && <small>{t("notation")}</small>}
      </article>
    </section>
  );
}
