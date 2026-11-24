import { useState } from "react";

import type { Translate } from "@/localization/messages";

import { ControlInput, ControlRow, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";

interface Props {
  t: Translate;
  disabled: boolean;
  runCommand: (line: string) => void;
}
export function DirectorySearch({ t, disabled, runCommand }: Props) {
  const [query, setQuery] = useState("");
  return (
    <form
      className="supplier-search control-field"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && query.trim()) runCommand("find " + query.trim());
      }}
    >
      <ControlRow>
        <Field label={t("searchSuppliers")}>
          <ControlInput value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        </Field>
        <GuiToolInfo verb="find">
          <button type="submit" disabled={disabled || !query.trim()} data-clock-verb="find">
            {t("execute")}
          </button>
        </GuiToolInfo>
      </ControlRow>
    </form>
  );
}
