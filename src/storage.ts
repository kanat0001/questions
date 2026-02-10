import type { LearnStatus, ProgressMap } from "./types";

const STORAGE_KEY = "qa-trainer-progress-v1";

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveProgress(map: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function setStatus(progress: ProgressMap, id: string, status: LearnStatus): ProgressMap {
  const next = { ...progress, [id]: status };
  saveProgress(next);
  return next;
}

export function resetProgress(): ProgressMap {
  localStorage.removeItem(STORAGE_KEY);
  return {};
}
