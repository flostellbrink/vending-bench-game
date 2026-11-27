import { useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { commandForMove } from "@/game/commands.ts";

import { ActionForm, Field } from "./FormControls.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";

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
      actions={<GuiToolInfo verb="search_web" type="submit" popup disabled={disabled} />}
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) {
          runCommand(commandForMove(["search_web", { query }]));
        }
      }}
    >
      <Field label={msg.fields.query()}>
        <input
          className="control-input"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </Field>
    </ActionForm>
  );
}
