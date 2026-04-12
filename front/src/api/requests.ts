import client from "../api/client";
import { REQUEST_STATUS } from "../constants/requestProgress";
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

const LEGACY_STATUS_MAP: Record<string, string> = {
  "Прислал заявку": REQUEST_STATUS.SUBMITTED,
  "Прохождение тестирования": REQUEST_STATUS.TESTING,
  "Добавился в орг чат": REQUEST_STATUS.JOINED_CHAT,
  "Присутствует на ПШ": REQUEST_STATUS.STARTED,
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
  specialization?: string | { id?: number | string; name?: string; title?: string };
  specializationId?: number | string;
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

function normalizeLegacyStatus(status?: string): string | undefined {
  if (!status) return status;
  return LEGACY_STATUS_MAP[status] ?? status;
}

function normalizeRequest(item: ReqType): ReqType {
  const nextStatus = normalizeLegacyStatus(item.status);
  return nextStatus !== item.status ? { ...item, status: nextStatus } : item;
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
    const normalizedStatus = normalizeLegacyStatus(statusValue);
    const byName = statuses.find((s) => s.name === normalizedStatus);
    return { status: normalizedStatus, statusId: byName?.id };
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
  const specializationObject = typeof item.specialization === "object" ? item.specialization : undefined;
  const mappedStatus = resolveStatusName(item.status, statuses);

  return normalizeRequest({
    id: Number(item.id),
    studentName: item.studentName || item.userName || item.userEmail || item.user_email || `User #${ownerId ?? "?"}`,
    projectId,
    projectTitle: item.projectTitle || item.projectName,
    eventId,
    eventTitle: item.eventTitle || item.eventName || item.event_name,
    directionId,
    specializationId: toNumber(item.specializationId ?? specializationObject?.id),
    specialization: specializationObject
      ? specializationObject.name ?? specializationObject.title
      : item.specialization
        ? String(item.specialization)
        : undefined,
    about: item.about ?? item.message ?? "",
    status: mappedStatus.status,
    statusId: mappedStatus.statusId,
    ownerId,
    createdAt: item.createdAt ?? item.dateSub ?? item.date_sub,
  });
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

  if (ids.length === 0) return items.map((item) => normalizeRequest(item));

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

  return items.map((request) => {
    const next = normalizeRequest(request);
    if (next.eventTitle || typeof next.eventId === "undefined") return next;
    const title = titleByEventId.get(Number(next.eventId));
    return title ? { ...next, eventTitle: title } : next;
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
      return getBackendRequestCache(options.ownerId).map((item) => normalizeRequest(item));
    }
    if (isForbidden(err)) return [];
    return [];
  }
}

export async function saveRequest(req: ReqType): Promise<ReqType> {
  if (USE_MOCK) {
    if (req.eventTitle || typeof req.eventId === "undefined") return _saveRequest(normalizeRequest(req));
    const ev = await _getMockEventById(Number(req.eventId)).catch(() => undefined);
    return _saveRequest(normalizeRequest({ ...req, eventTitle: ev?.title ?? req.eventTitle }));
  }

  const statuses = await loadStatuses();
  const eventId = toNumber(req.eventId);
  const directionId = toNumber(req.directionId);
  const projectId = toNumber(req.projectId);

  if (!eventId) {
    throw new Error("Нельзя отправить заявку без eventId.");
  }

  const payload: Record<string, unknown> = {
    message: req.about ?? "",
    is_link: false,
    comment: "",
    event_id: eventId,
  };

  if (typeof directionId !== "undefined") payload.direction_id = directionId;
  if (typeof projectId !== "undefined") payload.project_ref = projectId;
  if (typeof req.specializationId !== "undefined") payload.specialization = req.specializationId;
  else if (req.specialization) payload.specialization = req.specialization;

  if (req.id && req.id > 0) {
    const updated = await client.put<BackendRequest>(`/api/users/applications/${req.id}/`, payload);
    const mapped = normalizeRequest({ ...req, ...mapBackendRequest(updated, statuses), eventId, directionId, projectId });
    cacheBackendRequest(mapped);
    return mapped;
  }

  let created: BackendRequest;
  try {
    created = await client.post<BackendRequest>("/api/users/applications/", payload);
  } catch (error) {
    if (typeof directionId === "undefined") throw error;
    created = await client.post<BackendRequest>(`/api/users/events/${eventId}/directions/${directionId}/applications/`, payload);
  }

  const mapped = normalizeRequest({
    ...req,
    ...mapBackendRequest(created, statuses),
    eventId,
    directionId,
    projectId,
  });
  cacheBackendRequest(mapped);
  return mapped;
}

export async function updateRequestStatus(id: number, status: string) {
  if (USE_MOCK) return _updateRequestStatus(id, normalizeLegacyStatus(status) ?? status);

  const statuses = await loadStatuses();
  const normalizedStatus = normalizeLegacyStatus(status) ?? status;
  const found = statuses.find((s) => s.name === normalizedStatus);
  const payload = found ? { status: found.id } : { status: normalizedStatus };

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

