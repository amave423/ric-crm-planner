import client from "../api/client";
import type { Request as ReqType } from "../types/request";

const USE_MOCK = client.USE_MOCK;

export const LS_KEY = "ric_mock_requests";
const LS_BACKEND_CACHE = "ric_backend_my_requests";

function readLS<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(items: Array<{ id?: number }>) {
  const max = items.reduce((acc, x) => Math.max(acc, Number(x.id || 0)), 0);
  return max + 1;
}

export function getBackendRequestCache(ownerId?: number): ReqType[] {
  const cached = readLS<ReqType[]>(LS_BACKEND_CACHE, []);
  if (typeof ownerId === "undefined") return cached;
  return cached.filter((r) => Number(r.ownerId) === Number(ownerId));
}

export function cacheBackendRequest(req: ReqType): ReqType {
  const cached = readLS<ReqType[]>(LS_BACKEND_CACHE, []);
  const normalized = { ...req };
  const idx = cached.findIndex((r) => Number(r.id) === Number(normalized.id));
  if (idx >= 0) cached[idx] = { ...cached[idx], ...normalized };
  else cached.push(normalized);
  writeLS(LS_BACKEND_CACHE, cached);
  return normalized;
}

export function removeBackendRequestFromCache(id: number) {
  const cached = readLS<ReqType[]>(LS_BACKEND_CACHE, []);
  writeLS(
    LS_BACKEND_CACHE,
    cached.filter((r) => Number(r.id) !== Number(id))
  );
}

export async function getRequests(): Promise<ReqType[]> {
  if (!USE_MOCK) {
    try {
      return await client.get("/api/users/applications/");
    } catch {
      return [];
    }
  }

  return readLS<ReqType[]>(LS_KEY, []);
}

export async function saveRequest(req: ReqType): Promise<ReqType> {
  if (!USE_MOCK) {
    if (req.id) return client.put(`/api/users/applications/${req.id}/`, req);
    if (req.eventId && req.directionId) {
      return client.post(`/api/users/events/${req.eventId}/directions/${req.directionId}/applications/`, req);
    }
    return client.post("/api/users/applications/", req);
  }

  const requests = readLS<ReqType[]>(LS_KEY, []);
  const id = req.id && req.id > 0 ? req.id : nextId(requests as Array<{ id?: number }>);
  const created: ReqType = {
    ...req,
    id,
    createdAt: req.createdAt || new Date().toISOString(),
  };

  const idx = requests.findIndex((r) => Number(r.id) === Number(id));
  if (idx >= 0) requests[idx] = { ...requests[idx], ...created };
  else requests.push(created);
  writeLS(LS_KEY, requests);
  return created;
}

export async function updateRequestStatus(id: number, status: string): Promise<ReqType | undefined> {
  if (!USE_MOCK) return client.put(`/api/users/applications/${id}/`, { status });

  const requests = readLS<ReqType[]>(LS_KEY, []);
  const idx = requests.findIndex((r) => Number(r.id) === Number(id));
  if (idx < 0) return undefined;
  requests[idx] = { ...requests[idx], status };
  writeLS(LS_KEY, requests);
  return requests[idx];
}

export async function removeRequest(id: number): Promise<ReqType | undefined> {
  if (!USE_MOCK) return client.del(`/api/users/applications/${id}/`);

  const requests = readLS<ReqType[]>(LS_KEY, []);
  const target = requests.find((r) => Number(r.id) === Number(id));
  if (!target) return undefined;
  writeLS(
    LS_KEY,
    requests.filter((r) => Number(r.id) !== Number(id))
  );
  return target;
}
