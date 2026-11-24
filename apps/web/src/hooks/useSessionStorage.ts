import { useSyncExternalStore } from "react";

export const unavailable = Symbol("unavailable");

function subscribeToNavigation(update: () => void) {
  window.addEventListener("popstate", update);
  return () => window.removeEventListener("popstate", update);
}
function subscribeToStorage(update: () => void) {
  window.addEventListener("storage", update);
  return () => window.removeEventListener("storage", update);
}
export function useLocationSearch() {
  return useSyncExternalStore(
    subscribeToNavigation,
    () => location.search,
    () => "",
  );
}
export function useStoredText(read: () => string | null) {
  return useSyncExternalStore<string | null | undefined | typeof unavailable>(
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
