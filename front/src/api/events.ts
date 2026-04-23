import client from "../api/client";
import { readPlannerState } from "../storage/planner";
import {
  getAllUsers,
  getDirectionsByEvent as _getDirectionsByEvent,
  getEventById as _getEventById,
  getEvents as _getEvents,
  removeEvent as _removeEvent,
  saveEvent as _saveEvent,
} from "../storage/storage";
import type { Event } from "../types/event";
import type { User } from "../types/user";

const USE_MOCK = client.USE_MOCK;

type UnknownRecord = Record<string, unknown>;

type BackendSpecialization = {
  id: number;
  name?: string;
  title?: string;
  description?: string;
};

type BackendEvent = {
  id?: number | string;
  title?: string;
  name?: string;
  description?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  applyDeadline?: string;
  end_app_date?: string;
  leader?: number | string;
  organizer?: number | string;
  organizerName?: string;
  stage?: string;
  specializations?: unknown[];
  specialization?: number | string;
  specializationId?: number | string;
};

type BackendEventPayload = {
  name?: string;
  description: string;
  start_date?: string;
  end_date?: string;
  end_app_date?: string;
  stage: string;
  leader?: number;
  specialization?: number;
  specializations?: number[];
};

let specializationCache: BackendSpecialization[] | null = null;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function getSpecName(s: BackendSpecialization): string {
  return String(s.name ?? s.title ?? "").trim();
}

function computeStatus(endDate?: string) {
  if (!endDate) return "Неактивно";
  const end = new Date(endDate);
  return end >= new Date() ? "Активно" : "Неактивно";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function normalizeBackendEvent(data: unknown): BackendEvent {
  const obj = asRecord(data);
  return {
    id: typeof obj.id === "number" || typeof obj.id === "string" ? obj.id : undefined,
    title: toStringValue(obj.title),
    name: toStringValue(obj.name),
    description: toStringValue(obj.description),
    startDate: toStringValue(obj.startDate),
    start_date: toStringValue(obj.start_date),
    endDate: toStringValue(obj.endDate),
    end_date: toStringValue(obj.end_date),
    applyDeadline: toStringValue(obj.applyDeadline),
    end_app_date: toStringValue(obj.end_app_date),
    leader: typeof obj.leader === "number" || typeof obj.leader === "string" ? obj.leader : undefined,
    organizer: typeof obj.organizer === "number" || typeof obj.organizer === "string" ? obj.organizer : undefined,
    organizerName: toStringValue(obj.organizerName),
    stage: toStringValue(obj.stage),
    specializations: Array.isArray(obj.specializations) ? obj.specializations : undefined,
    specialization:
      typeof obj.specialization === "number" || typeof obj.specialization === "string" ? obj.specialization : undefined,
    specializationId:
      typeof obj.specializationId === "number" || typeof obj.specializationId === "string"
        ? obj.specializationId
        : undefined,
  };
}

function normalizeSpecList(data: BackendEvent, specs: BackendSpecialization[]): Array<{ id: number; title: string }> {
  if (Array.isArray(data.specializations) && data.specializations.length > 0) {
    return data.specializations
      .map((item) => {
        if (typeof item === "number" || typeof item === "string") {
          const idFromPrimitive = toNumber(item);
          if (typeof idFromPrimitive === "undefined") return null;
          const fromCache = specs.find((x) => x.id === idFromPrimitive);
          return {
            id: idFromPrimitive,
            title: (fromCache ? getSpecName(fromCache) : "") || String(idFromPrimitive),
          };
        }

        const specObj = asRecord(item);
        const id = toNumber(specObj.id ?? specObj.specializationId);
        if (typeof id === "undefined") return null;
        const title = toStringValue(specObj.title ?? specObj.name);
        const fromCache = specs.find((x) => x.id === id);
        return { id, title: title ? String(title) : (fromCache ? getSpecName(fromCache) : "") || String(id) };
      })
      .filter(Boolean) as Array<{ id: number; title: string }>;
  }

  const specId = toNumber(data.specialization ?? data.specializationId);
  if (typeof specId !== "undefined") {
    const found = specs.find((x) => Number(x.id) === Number(specId));
    return [{ id: specId, title: (found ? getSpecName(found) : "") || String(specId) }];
  }

  return [];
}

async function getSpecializations(): Promise<BackendSpecialization[]> {
  if (USE_MOCK) return [];
  if (specializationCache) return specializationCache;
  try {
    const raw = await client.get("/api/users/specializations/");
    const list = Array.isArray(raw) ? raw : [];
    specializationCache = list
      .map((item) => {
        const spec = asRecord(item);
        return {
          id: Number(spec.id),
          name: String(spec.name ?? spec.title ?? "").trim(),
          title: String(spec.title ?? spec.name ?? "").trim(),
          description: spec.description ? String(spec.description) : undefined,
        };
      })
      .filter((s: BackendSpecialization) => Number.isFinite(s.id) && getSpecName(s));
    return specializationCache;
  } catch {
    specializationCache = [];
    return specializationCache;
  }
}

function extractUserDisplay(u: User): string {
  const obj = u as User & UnknownRecord;
  const name = u.name ?? toStringValue(obj.firstName ?? obj.first_name) ?? "";
  const surname = u.surname ?? toStringValue(obj.lastName ?? obj.last_name) ?? "";
  return `${surname} ${name}`.trim();
}

async function resolveOrganizer(e: BackendEvent): Promise<string | undefined> {
  if (e.organizerName && e.organizerName.trim()) return e.organizerName.trim();

  let id: number | string | undefined = e.leader ?? e.organizer;
  if (typeof id === "undefined" && typeof e.id !== "undefined") {
    try {
      const dirs = await _getDirectionsByEvent(Number(e.id));
      if (Array.isArray(dirs) && dirs.length > 0) id = dirs[0].leader ?? dirs[0].organizer;
    } catch {
    }
  }
  if (typeof id === "undefined") return undefined;

  try {
    const users = await getAllUsers();
    const u = users.find((x) => String(x.id) === String(id));
    if (!u) return String(id);
    const display = extractUserDisplay(u);
    return display || String(id);
  } catch {
    return String(id);
  }
}

async function mapEventToUi(data: unknown): Promise<Event> {
  const event = normalizeBackendEvent(data);
  const specs = await getSpecializations();
  const plannerState = readPlannerState(USE_MOCK);
  const eventId = Number(event.id ?? 0);
  const isEnrollmentClosed = plannerState.closedEventIds.includes(eventId);

  return {
    id: eventId,
    title: event.title ?? event.name ?? "",
    description: event.description ?? "",
    startDate: event.startDate ?? event.start_date,
    endDate: event.endDate ?? event.end_date,
    applyDeadline: event.applyDeadline ?? event.end_app_date,
    leader:
      typeof event.leader !== "undefined"
        ? String(event.leader)
        : typeof event.organizer !== "undefined"
          ? String(event.organizer)
          : undefined,
    specializations: normalizeSpecList(event, specs),
    status: isEnrollmentClosed ? "Набор завершен" : computeStatus(event.endDate ?? event.end_date),
    organizer: await resolveOrganizer(event),
  };
}

export async function getEvents(): Promise<Event[]> {
  const raw = USE_MOCK ? await _getEvents() : await client.get("/api/users/events/");
  const list = Array.isArray(raw) ? raw : [];
  return Promise.all(list.map((e) => mapEventToUi(e)));
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const data = USE_MOCK ? await _getEventById(id) : await client.get(`/api/users/events/${id}/`);
  if (!data) return undefined;
  return mapEventToUi(data);
}

const fmtEndApp = (v?: string) => {
  if (!v) return undefined;
  if (v.includes("T")) return v;
  const d = new Date(`${v}T23:59:59`);
  return d.toISOString();
};

async function resolveSpecializationIds(data: Event): Promise<number[]> {
  const items = Array.isArray(data.specializations) ? data.specializations : [];
  if (items.length === 0) return [];

  if (USE_MOCK) {
    return Array.from(
      new Set(items.map((item) => toNumber(item.id)).filter((id): id is number => typeof id === "number"))
    );
  }

  const specs = await getSpecializations();
  const unresolved: string[] = [];
  const ids = await Promise.all(
    items.map(async (item) => {
      const directId = toNumber(item.id);
      if (typeof directId !== "undefined" && specs.some((spec) => spec.id === directId)) return directId;

      const title = String(item.title ?? "").trim();
      if (!title) {
        if (typeof directId !== "undefined") unresolved.push(String(directId));
        return undefined;
      }

      const found = specs.find((spec) => getSpecName(spec).toLowerCase() === title.toLowerCase());
      if (found) return found.id;

      unresolved.push(title);
      return undefined;
    })
  );

  const resolvedIds = Array.from(new Set(ids.filter((id): id is number => typeof id === "number")));

  if (resolvedIds.length === 0) {
    throw new Error("На сервере не найдены выбранные специализации. Выберите значения из выпадающего списка.");
  }

  if (unresolved.length > 0) {
    throw new Error(
      `Не удалось сопоставить специализации: ${unresolved.join(", ")}. Обновите страницу и выберите их заново.`
    );
  }

  return resolvedIds;
}

async function toBackendEvent(data: Event): Promise<BackendEventPayload> {
  const obj = data as Event & UnknownRecord;
  const stageValue = toStringValue(obj.stage);
  const payload: BackendEventPayload = {
    name: data.title,
    description: data.description ?? "",
    start_date: data.startDate,
    end_date: data.endDate,
    end_app_date: fmtEndApp(data.applyDeadline),
    stage: stageValue && stageValue.trim() ? stageValue : "-",
  };

  const leaderId = toNumber(data.leader);
  if (typeof leaderId !== "undefined") payload.leader = leaderId;

  const specializationIds = await resolveSpecializationIds(data);
  if (specializationIds.length > 0) {
    payload.specializations = specializationIds;
    payload.specialization = specializationIds[0];
  }

  return payload;
}

export async function saveEvent(data: Event): Promise<Event> {
  if (USE_MOCK) return _saveEvent({ ...data });

  const payload = await toBackendEvent(data);
  const saved = data.id
    ? await client.put(`/api/users/events/${data.id}/`, payload)
    : await client.post("/api/users/events/", payload);

  return mapEventToUi(saved);
}

export async function removeEvent(id: number): Promise<unknown> {
  if (USE_MOCK) return _removeEvent(id);
  return client.del(`/api/users/events/${id}/`);
}




