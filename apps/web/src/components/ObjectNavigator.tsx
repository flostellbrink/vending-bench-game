import type { Report, Snapshot } from "games-common/benchmark";
import type { KeyboardEvent, ReactNode } from "react";

import { last } from "games-common/language";

import type { Translate } from "@/localization/messages";

import { address } from "@/game/commands";

import "./object-navigator.css";

interface Props {
  state: Snapshot | null;
  reports: Report[];
  t: Translate;
  value: string;
  onOpen: (id: string) => void;
}

interface Destination {
  label: string;
  id?: string;
  children?: Destination[];
}

function navigate(event: KeyboardEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
  const index = buttons.indexOf(event.target);
  let next: HTMLButtonElement | undefined;
  switch (event.key) {
    case "ArrowUp":
      next = buttons[index - 1];
      break;
    case "ArrowDown":
      next = buttons[index + 1];
      break;
    case "Home":
      next = buttons[0];
      break;
    case "End":
      next = buttons.at(-1);
      break;
    default:
      return;
  }
  event.preventDefault();
  next?.focus();
}

export function ObjectNavigator({ state, reports, t, value, onOpen }: Props) {
  const suppliers = [
    ...new Map(reports.flatMap((r) => r.directory.map((s) => [s.id, s]))).values(),
  ];
  const items: Destination[] = [
    { id: "desk", label: t("dispatchDesk") },
    { id: "world", label: t("bank") },
    { id: "scores", label: t("standings") },
    {
      label: t("network"),
      children: [
        ...(state?.sites.map((site) => ({
          id: "site:" + address(site.id),
          label: site.name,
          children: state.machines
            .filter((id) => id.startsWith(site.id + ":"))
            .map((id) => ({ id: "machine:" + id, label: last(address(id).split(".")) })),
        })) ?? []),
        { id: "site:depot", label: t("depot") },
      ],
    },
    {
      label: t("supply"),
      children: [
        { id: "suppliers", label: t("searchSuppliers") },
        ...suppliers.map((s) => ({ id: "supplier:" + s.id, label: s.name })),
        { id: "orders", label: t("deliveries") },
      ],
    },
    { id: "mail", label: t("mailbox") },
    { id: "sales", label: t("revenue") },
    { id: "tabs", label: t("journal") },
    { id: "brief", label: t("rules") },
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
    <nav className="object-tree object-directory" aria-label={t("network")} onKeyDown={navigate}>
      {render(items)}
    </nav>
  );
}
