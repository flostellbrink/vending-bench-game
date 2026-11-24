import { useId, useState } from "react";

import type { Translate } from "@/localization/messages";

import { GuiToolInfo } from "./GuiToolInfo";

interface Props {
  t: Translate;
  disabled: boolean;
  runCommand: (line: string) => void;
}
export function DirectorySearch({ t, disabled, runCommand }: Props) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  return (
    <form
      className="supplier-search control-field"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && query.trim()) runCommand("find " + query.trim());
      }}
    >
      <label htmlFor={inputId}>{t("searchSuppliers")}</label>
      <div className="control-row">
        <input
          id={inputId}
          className="control-line"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <GuiToolInfo verb="find">
          <button type="submit" disabled={disabled || !query.trim()} data-clock-verb="find">
            {t("execute")}
          </button>
        </GuiToolInfo>
      </div>
    </form>
  );
}
