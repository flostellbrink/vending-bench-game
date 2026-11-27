import type { Report } from "games-common/benchmark";

import { hasValue } from "games-common/language";

type NoteReceipt = Pick<Report, "tool" | "args" | "day" | "id" | "body">;
interface Note {
  key: string;
  text: string;
  day: number;
}

export function noteSnapshot<T extends NoteReceipt>(reports: readonly T[]) {
  const read = reports.findLast((r) => r.tool === "read_notes" && !r.args.key);
  if (!read) {
    return null;
  }
  const notes = new Map<string, Note>();
  for (const report of reports) {
    if (report.id >= read.id) {
      break;
    }
    if (report.tool !== "write_note") {
      continue;
    }
    const key = report.args.key?.trim();
    const { text } = report.args;
    if (!key || !hasValue(text)) {
      continue;
    }
    if (text && report.body.startsWith("Saved note ")) {
      notes.set(key, { day: report.day, key, text });
    } else if (!text && report.body.startsWith("Deleted note ")) {
      notes.delete(key);
    }
  }
  const entries = [...notes.values()];
  const expected = [
    "Your notes:",
    "",
    ...entries.flatMap((n) => [`[${n.key}] (day ${n.day})`, n.text, ""]),
  ].join("\n");
  return { entries: entries.length && read.body === expected ? entries : null, read };
}
