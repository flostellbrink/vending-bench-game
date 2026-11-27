import type { ChangeEventHandler, FormEventHandler, ReactNode } from "react";

import { hasAny } from "games-common/language";

import "./action-layout.css";

export function ActionForm({
  actions,
  children,
  className = "",
  onSubmit,
  "aria-label": label,
}: {
  actions: ReactNode;
  children: ReactNode;
  className?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  "aria-label"?: string;
}) {
  return (
    <form className={`action-form ${className}`.trim()} onSubmit={onSubmit} aria-label={label}>
      <div className="action-fields">{children}</div>
      <div className="action-submit">{actions}</div>
    </form>
  );
}

/** A whole number of packs or units, at least 1. */
export function QuantityInput({
  value,
  onChange,
  disabled,
  required,
  "aria-label": label,
}: {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}) {
  return (
    <input
      className="control-input"
      type="number"
      min={1}
      step={1}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      aria-label={label}
    />
  );
}

export function Field({
  label,
  inline = false,
  wide = false,
  children,
  className = "",
}: {
  label: string;
  inline?: boolean;
  wide?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={[
        "control-field",
        inline ? "inline-field" : "",
        wide ? "field-wide" : "",
        className,
      ]
        .filter(hasAny)
        .join(" ")}
    >
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
