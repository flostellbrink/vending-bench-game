import type { Optional } from "games-common/language";

import { useSyncExternalStore } from "react";

export const unavailable = Symbol("unavailable");

function subscribeToNavigation(update: () => void) {
  globalThis.addEventListener("popstate", update);
  return () => globalThis.removeEventListener("popstate", update);
}
function subscribeToStorage(update: () => void) {
  globalThis.addEventListener("storage", update);
  globalThis.addEventListener("pageshow", update);
  return () => {
    globalThis.removeEventListener("storage", update);
    globalThis.removeEventListener("pageshow", update);
  };
}
export function useLocationSearch() {
  return useSyncExternalStore(
    subscribeToNavigation,
    () => location.search,
    () => "",
  );
}
export function useStoredText(read: () => Optional<string>) {
  return useSyncExternalStore<Optional<string> | typeof unavailable>(
    subscribeToStorage,
    () => {
      try {
        return read();
      } catch {
        return unavailable;
      }
    },
    () => undefined,
  );
}
