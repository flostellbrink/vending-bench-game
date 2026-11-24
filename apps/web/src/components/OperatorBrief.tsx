import type { Release, Snapshot } from "games-common/benchmark";
import type { ReactNode } from "react";

import type { Money } from "@/localization/messages";

import { msg } from "@/dictionary";
import { clock } from "@/scene/clock";

interface Props {
  embedded?: boolean;
  release: Release;
  state: Snapshot | null;

  money: Money;
}
function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((word, i) =>
      word.startsWith("**") ? <strong key={i}>{word.slice(2, -2)}</strong> : word,
    );
}
function briefBody(source: string) {
  const sections: ReactNode[] = [];
  for (const block of source.split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    const heading = /^\*\*([^*]+)\*\*$/.exec(lines[0] ?? "");
    if (heading) {
      sections.push(<h3 key={sections.length}>{heading[1]}</h3>);
      lines.shift();
    }
    const [paragraph, ...items] = lines.join("\n").split(/^- /m);
    if (paragraph?.trim()) {
      sections.push(<p key={sections.length}>{inline(paragraph.replace(/\s+/g, " ").trim())}</p>);
    }
    if (items.length) {
      sections.push(
        <ul key={sections.length}>
          {items.map((item, i) => (
            <li key={i}>{inline(item.replace(/\s+/g, " ").trim())}</li>
          ))}
        </ul>,
      );
    }
  }
  return sections;
}
export function OperatorBrief({ release, state, money, embedded }: Props) {
  return (
    <section className="sheet brief">
      {!embedded && (
        <h2>
          {msg.operator.rules()} · {release.id}
        </h2>
      )}
      {state && (
        <p>
          {msg.operator.day()} {state.days} · {clock(state.opens)}–{clock(state.closes)} ·{" "}
          {msg.operator.fee()} {money(state.fee)}
        </p>
      )}
      <div lang="en">{briefBody(release.brief)}</div>
    </section>
  );
}
