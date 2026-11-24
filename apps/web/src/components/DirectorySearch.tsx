import { useState } from "react";

import { msg } from "@/dictionary";
import { commandForMove } from "@/game/commands";

import { ControlInput, ControlRow, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";

interface Props {
  disabled: boolean;
  runCommand: (line: string) => void;
}
export function DirectorySearch({ disabled, runCommand }: Props) {
  const [query, setQuery] = useState("");
  return (
    <form
      className="supplier-search control-field"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) runCommand(commandForMove(["search_web", { query }]));
      }}
    >
      <ControlRow>
        <Field label={msg.operator.searchSuppliers()}>
          <ControlInput value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        </Field>
        <GuiToolInfo verb="search_web">
          <button type="submit" disabled={disabled} data-clock-verb="search_web" />
        </GuiToolInfo>
      </ControlRow>
    </form>
  );
}
