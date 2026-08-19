/**
 * TEMPORARY evaluation layer — "Didaktiva V2" visual variant.
 *
 * Purely presentational: it selects which presentation component a route
 * renders. No data, mutations, routes or storage schema depend on it.
 *
 * Removal later = delete this file, `DesignSwitch.tsx`, the `*V2` presentation
 * components and the `mode === "v2"` branches in the routes.
 */
import { useSyncExternalStore } from "react";

export type DesignMode = "classic" | "v2";

const STORAGE_KEY = "didaktiva_design";

let current: DesignMode = "classic";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function normalize(value: string | null | undefined): DesignMode | null {
  return value === "v2" || value === "classic" ? value : null;
}

/** Reads query param (wins, and persists) then localStorage. Default: classic. */
function readEnvironment(): DesignMode {
  if (typeof window === "undefined") return "classic";
  const fromQuery = normalize(new URLSearchParams(window.location.search).get("design"));
  if (fromQuery) {
    try {
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
    } catch {
      /* private mode */
    }
    return fromQuery;
  }
  try {
    return normalize(window.localStorage.getItem(STORAGE_KEY)) ?? "classic";
  } catch {
    return "classic";
  }
}

let initialized = false;

function subscribe(listener: () => void) {
  if (!initialized) {
    initialized = true;
    const next = readEnvironment();
    if (next !== current) current = next;
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDesignMode(mode: DesignMode) {
  if (mode === current) return;
  current = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode */
  }
  emit();
}

/** Hydration-safe: server and first client render always return "classic". */
export function useDesignMode(): DesignMode {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => "classic" as DesignMode,
  );
}

/** User-facing product name. Internal contracts keep using "CaseLab". */
export function productName(_mode: DesignMode): string {
  return _mode === "v2" ? "Didaktiva" : "CaseLab";
}
