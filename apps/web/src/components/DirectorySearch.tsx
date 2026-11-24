import { useState } from "react";

import { msg } from "@/dictionary";
import { commandForMove } from "@/game/commands";

import { ActionForm, ControlInput, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";

interface Props {
  disabled: boolean;
  runCommand: (line: string) => void;
}
export function DirectorySearch({ disabled, runCommand }: Props) {
  const [query, setQuery] = useState("");
  return (
    <ActionForm
      className="supplier-search compact"
      aria-label={msg.commands.search_web()}
      actions={
        <GuiToolInfo verb="search_web">
          <button
            type="submit"
            aria-haspopup="dialog"
            disabled={disabled}
            data-clock-verb="search_web"
          />
        </GuiToolInfo>
      }
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) runCommand(commandForMove(["search_web", { query }]));
      }}
    >
      <Field label={msg.fields.query()}>
        <ControlInput value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      </Field>
    </ActionForm>
  );
}
