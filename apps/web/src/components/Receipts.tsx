import type { Report } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";
import { memo, useState } from "react";

import type { LogLine } from "@/hooks/useRun.ts";
import type { Money } from "@/localization/messages.ts";

import { msg } from "@/dictionary/index.ts";
import { isReadReceipt } from "@/game/receipt-routing.ts";
import { clock, receiptEnd } from "@/scene/clock.ts";

/** The longest part of a reply that the receipt line shows. */
const summaryLength = 110;
/** The peek shows this many report rows when the reply has no text. */
const peekRows = 3;

function receiptSummary(r: Report) {
  if (r.mail) {
    return r.mail.subject;
  }
  if (hasValue(r.terms?.order)) {
    return r.terms.order;
  }
  if (r.directory.length) {
    return r.directory.map((entry) => entry.name).join(" · ");
  }
  if (r.rows.length) {
    return `${r.rows.length} ${msg.operator.results()}`;
  }
  if (r.tool === "wait_for_next_day") {
    return `${msg.operator.statement()} · ${msg.operator.day()} ${r.day}`;
  }
  return (r.display.split("\n")[0] ?? "").slice(0, summaryLength);
}

function PeekText({ report }: { report: Report }) {
  if (report.mail) {
    return (
      <p>
        {report.mail.from}
        <br />
        {report.mail.body}
      </p>
    );
  }
  if (report.terms?.order) {
    return (
      <p>
        {report.terms.order} · {msg.operator.expectedClose()} {report.terms.eta}
      </p>
    );
  }
  return (
    <p>
      {report.display ||
        report.rows
          .slice(0, peekRows)
          .map((row) => row.join(" · "))
          .join("\n") ||
        report.directory.map((entry) => entry.name).join("\n")}
    </p>
  );
}

export const Receipts = memo(function Receipts({
  lines,
  openReport,
  money,
}: {
  lines: LogLine[];

  openReport: (id: number) => void;
  money: Money;
}) {
  const [peek, setPeek] = useState<Optional<number>>(null);
  const day = msg.operator.day();
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
          #{r.id} {receiptSummary(r)}
        </button>
      )}
      {!("localText" in r) && !isReadReceipt(r) && (
        <div className="write-ack">
          <small>
            {clock(r.minute)} → {receiptEnd(r, day)} · {r.minutes} min
            {r.closingCash !== r.openingCash && ` · ${money(r.closingCash - r.openingCash)}`}
          </small>
          {r.terms?.order && (
            <span>
              {msg.operator.expectedClose()} {r.terms.eta}
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
            {clock(r.minute)} → {receiptEnd(r, day)} · {r.minutes} min
          </small>
          <PeekText report={r} />
          <button aria-haspopup="dialog" onClick={() => openReport(r.id)}>
            {msg.operator.openReceipt()} #{r.id}
          </button>
        </div>
      )}
    </div>
  ));
});
