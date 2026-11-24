import type { ComponentProps, ReactNode } from "react";

import "./action-layout.css";

export function ActionForm({
  actions,
  children,
  className = "",
  ...props
}: ComponentProps<"form"> & { actions: ReactNode }) {
  return (
    <form {...props} className={("action-form " + className).trim()}>
      <div className="action-fields">{children}</div>
      <div className="action-submit">{actions}</div>
    </form>
  );
}

export function ActionButton({ className = "", ...props }: ComponentProps<"button">) {
  return <button {...props} className={("workbench-button " + className).trim()} />;
}

export function ControlRow({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={("control-row " + className).trim()} />;
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
      className={["control-field", inline && "inline-field", wide && "field-wide", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function ControlInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={("control-input " + className).trim()} />;
}

export function QuantityInput(props: Omit<ComponentProps<"input">, "type">) {
  return <ControlInput type="number" min={1} step={1} {...props} />;
}

export function ControlSelect({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={("control-input " + className).trim()} />;
}

export function ControlTextarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={("control-textarea " + className).trim()} />;
}
