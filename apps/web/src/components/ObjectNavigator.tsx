import type { Snapshot } from "games-common/benchmark";
import type { KeyboardEvent, ReactNode } from "react";

import { type Optional } from "games-common/language";

import type { ObservedSupplier } from "@/game/suppliers.ts";

import { msg } from "@/dictionary/index.ts";
import { address } from "@/game/commands.ts";

import "./object-navigator.css";

interface Props {
  state: Optional<Snapshot>;
  suppliers: ObservedSupplier[];

  value: string;
  onOpen: (id: string) => void;
}

interface Destination {
  label: string;
  id?: string;
  children?: Destination[];
}

function navigate(event: KeyboardEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLButtonElement)) {
    return;
  }
  const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
  const index = buttons.indexOf(event.target);
  let next: Optional<HTMLButtonElement> = undefined;
  switch (event.key) {
    case "ArrowUp": {
      next = buttons[index - 1];
      break;
    }
    case "ArrowDown": {
      next = buttons[index + 1];
      break;
    }
    case "Home": {
      [next] = buttons;
      break;
    }
    case "End": {
      next = buttons.at(-1);
      break;
    }
    default: {
      return;
    }
  }
  event.preventDefault();
  next?.focus();
}

export function ObjectNavigator({ state, suppliers, value, onOpen }: Props) {
  const items: Destination[] = [
    {
      children: [
        { id: "status", label: msg.operator.status() },
        { id: "payments", label: msg.operator.payments() },
      ],
      id: "world",
      label: msg.operator.bank(),
    },
    {
      children: state?.machines.map((id) => ({ id: `machine:${id}`, label: address(id) })) ?? [],
      id: "site:depot",
      label: msg.operator.depot(),
    },
    {
      children: suppliers.map((s) => ({ id: `supplier:${s.id}`, label: s.name })),
      id: "suppliers",
      label: msg.operator.supply(),
    },
    { id: "mail", label: msg.operator.mailbox() },
    { id: "sales", label: msg.operator.revenue() },
    { id: "marketing", label: msg.operator.marketing() },
    { id: "notes", label: msg.operator.notes() },
    { id: "reminders", label: msg.operator.reminders() },
    { id: "brief", label: msg.operator.rules() },
    { id: "help", label: msg.operator.help() },
  ];
  function render(nodes: Destination[], prefix = ""): ReactNode {
    return (
      <ul>
        {nodes.map(({ id, label, children }, i) => {
          const end = i === nodes.length - 1;
          const branch = (
            <span aria-hidden="true" className="object-wires">
              {prefix}
              {end ? "└─" : "├─"}
            </span>
          );
          return (
            <li key={id ?? label}>
              {id ? (
                <button
                  type="button"
                  title={label}
                  aria-current={value === id ? "location" : undefined}
                  onClick={() => onOpen(id)}
                >
                  {branch}
                  <span className="object-name">{label}</span>
                </button>
              ) : (
                <span className="object-group">
                  {branch}
                  <span className="object-name">{label}</span>
                </span>
              )}
              {children?.length ? render(children, prefix + (end ? "  " : "│ ")) : null}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <nav
      className="object-tree object-directory"
      aria-label={msg.operator.network()}
      onKeyDown={navigate}
    >
      {render(items)}
    </nav>
  );
}
