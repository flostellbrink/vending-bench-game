import type { Snapshot } from "games-common/benchmark";

import { useState } from "react";

import type { Translate } from "@/localization/messages";

import { timeLabel } from "@/game/time-label";

import { GuiToolInfo } from "./GuiToolInfo";

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
      className="supplier-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && query.trim()) runCommand("find " + query.trim());
      }}
    >
      <label>
        {t("searchSuppliers")}
        <input value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      </label>
      <GuiToolInfo verb="find" cost={timeLabel("find", state, t)}>
        <button type="submit" disabled={disabled || !query.trim()} data-clock-verb="find">
          {t("execute")}
        </button>
      </GuiToolInfo>
    </form>
  );
}
