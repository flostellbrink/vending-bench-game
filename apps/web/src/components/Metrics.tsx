import type { JSONObject, JSONValue } from "games-common/benchmark";

import { useFormatters } from "@/localization/formatters";

export function Metrics({ data }: { data: JSONObject | JSONValue[] }) {
  const { number } = useFormatters();
  return (
    <dl className="metrics">
      {Object.entries<JSONValue>(data).map(([k, v]) => (
        <div key={k}>
          <dt>{k.replaceAll("_", " ")}</dt>
          <dd>
            {typeof v === "object" && v !== null ? (
              <Metrics data={v} />
            ) : typeof v === "number" ? (
              number.format(v)
            ) : (
              String(v)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
