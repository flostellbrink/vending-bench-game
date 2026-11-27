import type { JSONObject, JSONValue } from "games-common/benchmark";

import { entries, hasValue } from "games-common/language";

import { useFormatters } from "@/localization/formatters.ts";

function MetricValue({ value }: { value: JSONValue }) {
  const { number } = useFormatters();
  if (typeof value === "object" && hasValue(value)) {
    return <Metrics data={value} />;
  }
  if (typeof value === "number") {
    return number.format(value);
  }
  return String(value);
}

export function Metrics({ data }: { data: JSONObject | JSONValue[] }) {
  const pairs = Array.isArray(data)
    ? data.map((value, index): [string, JSONValue] => [String(index), value])
    : entries(data);
  return (
    <dl className="metrics">
      {pairs.map(([k, v]) => (
        <div key={k}>
          <dt>{k.replaceAll("_", " ")}</dt>
          <dd>
            <MetricValue value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
