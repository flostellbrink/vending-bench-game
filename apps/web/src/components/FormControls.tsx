import type { ComponentProps, ReactNode } from "react";

export function ActionButton({ className = "", ...props }: ComponentProps<"button">) {
  return <button {...props} className={("workbench-button " + className).trim()} />;
}

export function ControlRow({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={("control-row " + className).trim()} />;
}

export function Field({
  label,
  inline = false,
  children,
  className = "",
}: {
  label: string;
  inline?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={["control-field", inline && "inline-field", className].filter(Boolean).join(" ")}
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
