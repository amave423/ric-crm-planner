import client from "../api/client";
import type { Request as ReqType } from "../types/request";
import {
  cacheBackendRequest,
  getBackendRequestCache,
  getRequests as _getRequests,
  removeBackendRequestFromCache,
  removeRequest as _removeRequest,
  saveRequest as _saveRequest,
  updateRequestStatus as _updateRequestStatus,
} from "../storage/requests";
import { getEventById as _getMockEventById } from "../storage/storage";

const USE_MOCK = client.USE_MOCK;

type GetRequestsOptions = {
  ownerId?: number;
  role?: string;
};

type BackendStatus = {
  id: number;
  name: string;
};

let statusCache: BackendStatus[] | null = null;

type BackendRequest = {
  id?: number | string;
  ownerId?: number | string;
  user?: number | string;
  studentName?: string;
  userName?: string;
  userEmail?: string;
  user_email?: string;
  projectId?: number | string;
  project?: number | string;
  projectTitle?: string;
  projectName?: string;
  eventId?: number | string;
  event?: number | string;
  eventTitle?: string;
  eventName?: string;
  event_name?: string;
  directionId?: number | string;
  direction?: number | string;
  specialization?: string | { name?: string };
  about?: string;
  message?: string;
  status?: string | number;
  createdAt?: string;
  dateSub?: string;
  date_sub?: string;
};

type BackendError = {
  detail?: string;
  message?: string;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function isForbidden(err: unknown): boolean {
  const e = (err ?? {}) as BackendError;
  const raw = e.detail ?? e.message ?? err;
  if (typeof raw === "undefined") return false;
  const txt2 = String(raw).toLowerCase();
  return txt2.includes("permission") || txt2.includes("forbidden") || txt2.includes("403");
}

async function loadStatuses(): Promise<BackendStatus[]> {
  if (statusCache) return statusCache;
  try {
    const statuses = await client.get<BackendStatus[]>("/api/users/statuses/");
    statusCache = Array.isArray(statuses) ? statuses : [];
    return statusCache;
  } catch {
    statusCache = [];
    return statusCache;
  }
}

function resolveStatusName(statusValue: unknown, statuses: BackendStatus[]): { status?: string; statusId?: number } {
  if (statusValue == null) return {};

  if (typeof statusValue === "string") {
    const byName = statuses.find((s) => s.name === statusValue);
    return { status: statusValue, statusId: byName?.id };
  }

  const id = toNumber(statusValue);
  if (typeof id === "undefined") return {};
  const byId = statuses.find((s) => Number(s.id) === Number(id));
  return { status: byId?.name ?? String(id), statusId: id };
}

function mapBackendRequest(item: BackendRequest, statuses: BackendStatus[]): ReqType {
  const ownerId = toNumber(item.ownerId ?? item.user);
  const eventId = toNumber(item.eventId ?? item.event);
  const directionId = toNumber(item.directionId ?? item.direction);
  const projectId = toNumber(item.projectId ?? item.project);
  const mappedStatus = resolveStatusName(item.status, statuses);

  return {
    id: Number(item.id),
    studentName: item.studentName || item.userName || item.userEmail || item.user_email || `User #${ownerId ?? "?"}`,
    projectId,
    projectTitle: item.projectTitle || item.projectName,
    eventId,
    eventTitle: item.eventTitle || item.eventName || item.event_name,
    directionId,
    specialization:
      typeof item.specialization === "object"
        ? item.specialization?.name
        : item.specialization
        ? String(item.specialization)
        : undefined,
    about: item.about ?? item.message ?? "",
    status: mappedStatus.status,
    statusId: mappedStatus.statusId,
    ownerId,
    createdAt: item.createdAt ?? item.dateSub ?? item.date_sub,
  };
}

async function enrichMockRequests(items: ReqType[]): Promise<ReqType[]> {
  const ids = Array.from(
    new Set(
      items
        .filter((r) => !r.eventTitle && typeof r.eventId !== "undefined")
        .map((r) => Number(r.eventId))
        .filter((id) => !Number.isNaN(id))
    )
  );

  if (ids.length === 0) return items;

  const pairs = await Promise.all(
    ids.map(async (id) => {
      const ev = await _getMockEventById(id).catch(() => undefined);
      return [id, ev?.title] as const;
    })
  );
  const titleByEventId = new Map<number, string>();
  pairs.forEach(([id, title]) => {
    if (title) titleByEventId.set(id, title);
  });

  return items.map((r) => {
    if (r.eventTitle || typeof r.eventId === "undefined") return r;
    const title = titleByEventId.get(Number(r.eventId));
    return title ? { ...r, eventTitle: title } : r;
  });
}

export async function getRequests(options: GetRequestsOptions = {}): Promise<ReqType[]> {
  if (USE_MOCK) {
    const items = await _getRequests();
    return enrichMockRequests(items);
  }

  const statuses = await loadStatuses();
  try {
    const raw = await client.get<unknown>("/api/users/applications/");
    if (!Array.isArray(raw)) return [];

    const mapped = (raw as BackendRequest[]).map((x) => mapBackendRequest(x, statuses));
    const filtered =
      typeof options.ownerId === "undefined"
        ? mapped
        : mapped.filter((r) => Number(r.ownerId) === Number(options.ownerId));

    filtered.forEach((r) => cacheBackendRequest(r));
    return filtered;
  } catch (err) {
    if (options.role === "student" || typeof options.ownerId !== "undefined") {
      return getBackendRequestCache(options.ownerId);
    }
    if (isForbidden(err)) return [];
    return [];
  }
}

export async function saveRequest(req: ReqType): Promise<ReqType> {
  if (USE_MOCK) {
    if (req.eventTitle || typeof req.eventId === "undefined") return _saveRequest(req);
    const ev = await _getMockEventById(Number(req.eventId)).catch(() => undefined);
    return _saveRequest({ ...req, eventTitle: ev?.title ?? req.eventTitle });
  }

  const statuses = await loadStatuses();
  const eventId = toNumber(req.eventId);
  const directionId = toNumber(req.directionId);

  if (!eventId || !directionId) {
    throw new Error("Нельзя отправить заявку без eventId и directionId.");
  }

  const payload: Record<string, unknown> = {
    message: req.about ?? "",
    is_link: false,
    comment: "",
    event_id: eventId,
    direction_id: directionId,
    project_ref: toNumber(req.projectId) ?? null,
  };

  if (req.id && req.id > 0) {
    const updated = await client.put<BackendRequest>(`/api/users/applications/${req.id}/`, payload);
    const mapped = { ...req, ...mapBackendRequest(updated, statuses) };
    cacheBackendRequest(mapped);
    return mapped;
  }

  const created = await client.post<BackendRequest>(`/api/users/events/${eventId}/directions/${directionId}/applications/`, payload);
  const mapped = {
    ...req,
    ...mapBackendRequest(created, statuses),
    eventId,
    directionId,
  };
  cacheBackendRequest(mapped);
  return mapped;
}

export async function updateRequestStatus(id: number, status: string) {
  if (USE_MOCK) return _updateRequestStatus(id, status);

  const statuses = await loadStatuses();
  const found = statuses.find((s) => s.name === status);
  const payload = found ? { status: found.id } : { status };

  const updated = await client.patch<BackendRequest>(`/api/users/applications/${id}/`, payload);
  const mapped = mapBackendRequest(updated, statuses);
  cacheBackendRequest(mapped);
  return mapped;
}

export async function removeRequest(id: number) {
  if (USE_MOCK) return _removeRequest(id);
  const result = await client.del(`/api/users/applications/${id}/`);
  removeBackendRequestFromCache(id);
  return result;
}
