import type { Report } from "games-common/benchmark";

import { msg } from "@/dictionary";

export function StorageBatches({ report, product }: { report: Report; product: string }) {
  return report.batches?.[product]?.map((batch, index) => (
    <small key={index} className="storage-batch">
      {msg.operator.storageBatch({ quantity: batch.quantity, day: batch.expiryDay })}
    </small>
  ));
}
