import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { entries } from "games-common/language";
import { useState } from "react";

import { msg } from "@/dictionary";
import { commandGroups, local, syntax, toolFor } from "@/game/commands";
import { useTimeLabel } from "@/game/time-label";
import { toolDefaults } from "@/game/tool-defaults";
import { commandLabel } from "@/localization/messages";

import "./command-manual.css";

const groupsLabels = {
  supply: msg.operator.supply,
  machines: msg.operator.machines,
  business: msg.operator.business,
  correspondence: msg.operator.correspondence,
  records: msg.operator.records,
};
interface Props {
  actions: Actions;
  release: Release;
  state: Snapshot | null;
}

export function CommandIndex({ actions, release, state }: Props) {
  const [choice, choose] = useState("search_web");
  const timeLabel = useTimeLabel();
  const groups = entries(commandGroups).map(([key, names]) => ({
    label: groupsLabels[key](),
    names: names.filter((name) => name in release.tools || name in actions),
  }));
  const mapped = new Set<string>(groups.flatMap((group) => group.names));
  const other = Object.keys(release.tools).filter((tool) => !mapped.has(tool));
  const sections = [
    ...groups,
    { label: msg.operator.toolInformation(), names: other },
    { label: msg.operator.local(), names: local },
  ].filter((g) => g.names.length > 0);
  const selected = sections.some((s) => s.names.some((name) => name === choice))
    ? choice
    : (sections[0]?.names[0] ?? "help");
  const tool = selected === "help" ? undefined : selected;
  const description = tool ? release.tools[tool] : undefined;
  const defaults = toolDefaults(release, tool);
  return (
    <section className="command-manual">
      <nav className="manual-index" aria-label={msg.operator.help()}>
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
          <span>{tool ? commandLabel(toolFor(tool)) : msg.operator.help()}</span>
        </header>
        <pre>{syntax(selected, actions)}</pre>
        <dl>
          <div>
            <dt>{msg.operator.timeCost()}</dt>
            <dd>{timeLabel(selected, state)}</dd>
          </div>
        </dl>
        {defaults && (
          <small>
            {msg.operator.defaults()}: <code>{defaults}</code>
          </small>
        )}
        {description && <p lang="en">{description}</p>}
        {!other.includes(selected) && <small>{msg.operator.notation()}</small>}
      </article>
    </section>
  );
}
