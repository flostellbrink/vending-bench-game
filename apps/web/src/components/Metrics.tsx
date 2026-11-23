import type { JSONObject, JSONValue } from "games-common/benchmark";

import type { Lang } from "@/localization/messages";
export function Metrics({ data, lang }: { data: JSONObject | JSONValue[]; lang: Lang }) {
  return (
    <dl className="metrics">
      {Object.entries<JSONValue>(data).map(([k, v]) => (
        <div key={k}>
          <dt>{k.replaceAll("_", " ")}</dt>
          <dd>
            {typeof v === "object" && v !== null ? (
              <Metrics data={v} lang={lang} />
            ) : typeof v === "number" ? (
              Intl.NumberFormat(lang).format(v)
            ) : (
              String(v)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
