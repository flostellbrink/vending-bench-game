import type { Snapshot } from "games-common/benchmark";

import { useState } from "react";

import type { Translate } from "@/localization/messages";

import { timeLabel } from "@/game/time-label";

interface Props {
  state: Snapshot;
  t: Translate;
  disabled: boolean;
  runCommand: (line: string) => void;
}
export function DirectorySearch({ state, t, disabled, runCommand }: Props) {
  const [query, setQuery] = useState("");
  return (
    <form
      className="dispatch-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && query.trim()) runCommand("find " + query.trim());
      }}
    >
      <label>
        {t("searchSuppliers")}
        <input
          value={query}
          placeholder={t("searchExample")}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </label>
      <button disabled={disabled || !query.trim()} data-clock-verb="find">
        {t("execute")} · {timeLabel("find", state, t)}
      </button>
    </form>
  );
}
