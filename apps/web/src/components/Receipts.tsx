import { memo, useState } from "react";

import type { LogLine } from "@/hooks/useRun";
import type { Money } from "@/localization/messages";

import { opensInstrument } from "@/game/receipt-routing";
import { translate, type Lang } from "@/localization/messages";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";
export const Receipts = memo(function Receipts({
  lines,
  lang,
  openReport,
  money,
}: {
  lines: LogLine[];
  lang: Lang;
  openReport: (id: number) => void;
  money: Money;
}) {
  const [peek, setPeek] = useState<number | null>(null);
  const day = translate(msg.operator.day, lang),
    result = translate(msg.operator.results, lang);
  return lines.map((r) => (
    <div className="receipt" key={r.id}>
      <small>
        {day} {r.day} · {clock(r.minute)}
      </small>
      <div>
        <b className="prompt-char">$</b> {r.line}
      </div>
      {"localText" in r ? (
        <pre className="shell-reply">{r.localText}</pre>
      ) : (
        <button aria-expanded={peek === r.id} onClick={() => setPeek(peek === r.id ? null : r.id)}>
          #{r.id}{" "}
          {r.mail?.subject ??
            r.terms?.order ??
            (r.directory.length
              ? r.directory.map((entry) => entry.name).join(" · ")
              : r.rows.length
                ? r.rows.length + " " + result
                : r.tool === "wait_for_next_day"
                  ? translate(msg.operator.statement, lang) + " · " + day + " " + r.day
                  : (r.display.split("\n")[0] ?? "").slice(0, 110))}
        </button>
      )}
      {!("localText" in r) && !opensInstrument(r) && (
        <div className="write-ack">
          <small>
            {clock(r.minute)} → {clock(r.endMinute)} · {r.minutes} min
            {r.closingCash !== r.openingCash && " · " + money(r.closingCash - r.openingCash)}
          </small>
          {r.terms?.order && (
            <span>
              {translate(msg.operator.expectedClose, lang)} {r.terms.eta}
            </span>
          )}
          {r.tool === "restock_machine" &&
            r.display
              .split("\n")
              .slice(1)
              .map((note, index) => <span key={index}>{note}</span>)}
          {r.notices
            .filter((note) => /Yesterday sold |arrived in storage|arrived short/.test(note))
            .map((note, index) => (
              <span key={index}>{note}</span>
            ))}
        </div>
      )}
      {peek === r.id && !("localText" in r) && (
        <div className="receipt-peek">
          <small>
            {clock(r.minute)} → {clock(r.endMinute)} · {r.minutes} min
          </small>
          {r.mail ? (
            <p>
              {r.mail.from}
              <br />
              {r.mail.body}
            </p>
          ) : r.terms?.order ? (
            <p>
              {r.terms.order} · {translate(msg.operator.expectedClose, lang)} {r.terms.eta}
            </p>
          ) : (
            <p>
              {r.display ||
                r.rows
                  .slice(0, 3)
                  .map((row) => row.join(" · "))
                  .join("\n") ||
                r.directory.map((entry) => entry.name).join("\n")}
            </p>
          )}
          <button onClick={() => openReport(r.id)}>
            {translate(msg.operator.openReceipt, lang)} #{r.id}
          </button>
        </div>
      )}
    </div>
  ));
});
