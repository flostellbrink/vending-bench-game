import { parseRelease } from "games-common/benchmark";

import data from "@/generated/release.json";
export const release = parseRelease(data);
