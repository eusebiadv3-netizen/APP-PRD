import type { SavedChart } from "../types";

const DB_NAME = "organigramas-db";
const DB_VERSION = 1;
const STORE_NAME = "charts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * The permanent "archivero interno": every confirmed org chart is saved
 * here (keyed by its own id, searchable by company name) so it can be
 * found and reopened later, even after closing the browser tab.
 */
export async function saveChart(chart: SavedChart): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(chart);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listCharts(): Promise<SavedChart[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const charts = (request.result as SavedChart[]).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(charts);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChart(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function makeChartId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
