import type { Report } from "games-common/benchmark";

import type { Lang } from "@/localization/messages";

import { msg } from "@/dictionary";

export function StorageBatches({
  report,
  product,
  lang,
}: {
  report: Report;
  product: string;
  lang: Lang;
}) {
  return report.batches?.[product]?.map((batch, index) => (
    <small key={index} className="storage-batch">
      {msg.operator.storageBatch(
        { quantity: batch.quantity, day: batch.expiryDay },
        { locale: lang },
      )}
    </small>
  ));
}
