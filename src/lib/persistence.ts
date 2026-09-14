import type { AppStep, OrgNode } from "../types";

const STORAGE_KEY = "organigrama-app-state-v1";

export interface PersistedState {
  step: AppStep;
  initialNodes: OrgNode[];
  nodes: OrgNode[];
  logoDataUrl: string | null;
  viewRootId: string | null;
}

/**
 * Autosaves the in-progress org chart to this browser's storage so a page
 * reload (an editor republish, an accidental refresh, reopening the tab
 * later) doesn't force starting over from the upload screen. Per-viewer
 * only — never shared, never relied on as the source of truth.
 */
export function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing, storage disabled, or quota exceeded — the app
    // still works for this session, it just won't survive a reload.
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
