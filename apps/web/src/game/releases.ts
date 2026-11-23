import { parseReleases } from "games-common/benchmark";

import catalog from "@/generated/releases.json";
export const releases = parseReleases(catalog);
