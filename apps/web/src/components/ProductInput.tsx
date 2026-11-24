import type { Report } from "games-common/benchmark";

import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { msg } from "@/dictionary";
import { observedProducts, type ObservedProduct } from "@/game/observed-products";
import { clock } from "@/scene/clock";

import { ControlInput } from "./FormControls";
import "./product-input.css";

interface Props {
  reports: readonly Report[];
  value: string;
  onChange: (id: string) => void;
  label: string;

  disabled?: boolean;
  readOnly?: boolean;
  preferSize?: string;
}
export function ProductInput({
  reports,
  value,
  onChange,
  label,
  disabled,
  readOnly,
  preferSize,
}: Props) {
  const key = useId();
  const input = useRef<HTMLInputElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [highlight, setHighlight] = useState(-1);
  const all = useMemo(() => observedProducts(reports), [reports]);
  const query = value.trim().toLowerCase();
  function rank(product: ObservedProduct) {
    if (!query) return 0;
    const id = product.id.toLowerCase(),
      name = product.name?.toLowerCase();
    if (id === query || name === query) return 0;
    if (id.startsWith(query) || name?.startsWith(query)) return 1;
    return 2;
  }
  const choices = all
    .filter((p) => [p.id, p.name].some((s) => s?.toLowerCase().includes(query)))
    .toSorted(
      (a, b) =>
        rank(a) - rank(b) ||
        Number(!!preferSize && b.size === preferSize) -
          Number(!!preferSize && a.size === preferSize) ||
        a.id.localeCompare(b.id),
    );
  const active = highlight >= 0 && highlight < choices.length ? highlight : -1;
  useLayoutEffect(() => {
    if (!open || !panel.current || !input.current) return undefined;
    const popup = panel.current,
      anchor = input.current;
    function position() {
      const bounds = anchor.getBoundingClientRect(),
        gap = 4;
      const below = innerHeight - bounds.bottom - gap,
        above = bounds.top - gap;
      popup.style.maxHeight = Math.max(1, Math.min(240, Math.max(below, above) - gap)) + "px";
      popup.style.left =
        Math.max(gap, Math.min(bounds.left, innerWidth - popup.offsetWidth - gap)) + "px";
      popup.style.top =
        (below >= popup.offsetHeight
          ? bounds.bottom + gap
          : Math.max(gap, bounds.top - popup.offsetHeight - gap)) + "px";
    }
    popup.showPopover();
    position();
    const resize = new ResizeObserver(position);
    resize.observe(popup);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (active >= 0)
      panel.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);
  function show() {
    if (disabled || readOnly) return;
    setHighlight(-1);
    setOpen(true);
  }
  function choose(id: string) {
    onChange(id);
    setHighlight(-1);
    setOpen(false);
  }
  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled || readOnly || e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight(
        choices.length
          ? active < 0
            ? e.key === "ArrowDown"
              ? 0
              : choices.length - 1
            : (active + (e.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length
          : -1,
      );
    } else if (open && (e.key === "Escape" || e.key === "Enter")) {
      e.preventDefault();
      e.stopPropagation();
      const selected = choices[active];
      if (e.key === "Enter" && selected) choose(selected.id);
      else setOpen(false);
    }
  }
  return (
    <span className="product-picker">
      <ControlInput
        ref={input}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        type="text"
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? key : undefined}
        aria-activedescendant={open && active >= 0 ? key + "-" + active : undefined}
        onFocus={show}
        onClick={() => {
          if (!open) show();
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={keys}
        onChange={(e) => {
          onChange(e.currentTarget.value);
          show();
        }}
      />
      {open &&
        createPortal(
          <div ref={panel} popover="manual" className="product-choices">
            <ul role="listbox" id={key} aria-label={label}>
              {choices.map((p, i) => (
                <li
                  key={p.id}
                  id={key + "-" + i}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p.id)}
                >
                  <b>{p.id}</b>
                  {p.name && <span>{p.name}</span>}
                  {p.depot && (
                    <small>
                      {msg.operator.depot()} · {p.depot.quantity}
                      {p.size && " · " + p.size} · {msg.operator.day()} {p.depot.day} /{" "}
                      {clock(p.depot.minute)} · #{p.depot.receipt}
                    </small>
                  )}
                </li>
              ))}
            </ul>
            {!choices.length && (
              <p role="status">
                {(all.length ? msg.operator.noMatchingProducts : msg.operator.noObservedProducts)()}
              </p>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
