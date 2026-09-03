/**
 * frontend/lib/run-cache.ts
 *
 * Phase 1 of the backend is intentionally in-memory with no
 * "list all runs" endpoint (see backend/services/run_store.py).
 * Until that exists, Datasets and Reports work off a small
 * localStorage cache of run IDs seen in this browser, each
 * hydrated live via the existing GET /runs/{id} endpoint.
 *
 * This is explicitly a stopgap: swap this module's storage for a
 * real backend list call once Phase 2 persistence lands, without
 * touching the page components that consume it.
 */

import { getRun } from "./api";
import type { AnalysisRun } from "./types";

const STORAGE_KEY = "fibrion:recentRuns";
const MAX_ENTRIES = 50;

export type CachedRunRef = {
  run_id: string;
  filename: string;
  process_type: string;
  created_at: string;
};

function readRefs(): CachedRunRef[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRefs(refs: CachedRunRef[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

/** Called right after a successful upload, from the Analyze page. */
export function rememberRun(ref: CachedRunRef) {
  const existing = readRefs().filter((item) => item.run_id !== ref.run_id);

  const next = [ref, ...existing].slice(0, MAX_ENTRIES);

  writeRefs(next);
}

/** Raw cached references, newest first, with no network calls. */
export function listRunRefs(): CachedRunRef[] {
  return readRefs();
}

/**
 * Hydrates every cached run reference against the live API so pages
 * can show current status. Entries the API no longer knows about
 * (e.g. backend restarted, since it's in-memory) are dropped from
 * both the return value and the cache.
 */
export async function hydrateRuns(): Promise<AnalysisRun[]> {
  const refs = readRefs();

  const results = await Promise.all(
    refs.map(async (ref) => {
      try {
        return await getRun(ref.run_id);
      } catch {
        return null;
      }
    }),
  );

  const live = results.filter((run): run is AnalysisRun => run !== null);

  const liveIds = new Set(live.map((run) => run.run_id));
  const stillValid = refs.filter((ref) => liveIds.has(ref.run_id));

  if (stillValid.length !== refs.length) {
    writeRefs(stillValid);
  }

  return live;
}