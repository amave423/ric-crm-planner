import type { Request } from "../types/request";

const LS_KEY = "ric_planner_requests";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getRequests(): Request[] {
  const all = readJSON<Request[]>(LS_KEY, []);
  return Array.isArray(all) ? all : [];
}

export function saveRequest(req: Request): Request {
  const all = getRequests();
  if (!req.id) {
    const max = all.reduce((m, x) => Math.max(m, x.id || 0), 0);
    req.id = max + 1;
    req.createdAt = new Date().toISOString();
    req.status = req.status || "Прислал заявку";
    all.push(req);
  } else {
    const idx = all.findIndex((x) => x.id === req.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...req };
    else all.push(req);
  }
  writeJSON(LS_KEY, all);
  return req;
}

export function updateRequestStatus(id: number, status: string): Request | undefined {
  const all = getRequests();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], status };
  writeJSON(LS_KEY, all);
  return all[idx];
}

export function removeRequest(id: number): Request | undefined {
  const all = getRequests();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const [removed] = all.splice(idx, 1);
  writeJSON(LS_KEY, all);
  return removed;
}