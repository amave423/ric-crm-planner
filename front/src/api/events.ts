import client from "../api/client";
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

type BackendSpecialization = {
  id: number;
  name?: string;
  title?: string;
  description?: string;
};

let specializationCache: BackendSpecialization[] | null = null;

function getSpecName(s: BackendSpecialization): string {
  return String(s.name ?? s.title ?? "").trim();
}

function computeStatus(endDate?: string) {
  if (!endDate) return "Неактивно";
  const end = new Date(endDate);
  return end >= new Date() ? "Активно" : "Неактивно";
}

function toNumber(value: any): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function normalizeSpecList(data: any, specs: BackendSpecialization[]): Array<{ id: number; title: string }> {
  if (Array.isArray(data.specializations) && data.specializations.length > 0) {
    return data.specializations
      .map((s: any) => {
        const id = toNumber(s?.id ?? s?.specializationId ?? s);
        const title = s?.title ?? s?.name;
        if (typeof id === "undefined") return null;
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
    specializationCache = (Array.isArray(raw) ? raw : [])
      .map((s: any) => ({
        id: Number(s?.id),
        name: String(s?.name ?? s?.title ?? "").trim(),
        title: String(s?.title ?? s?.name ?? "").trim(),
        description: s?.description ? String(s.description) : undefined,
      }))
      .filter((s: BackendSpecialization) => Number.isFinite(s.id) && getSpecName(s));
    return specializationCache;
  } catch {
    specializationCache = [];
    return specializationCache;
  }
}

async function resolveOrganizer(e: any): Promise<string | undefined> {
  const leaderId = e.leader ?? e.organizer;
  let id = leaderId;
  if (id == null && e.id != null) {
    try {
      const dirs = await _getDirectionsByEvent(Number(e.id));
      if (Array.isArray(dirs) && dirs.length > 0) id = (dirs[0] as any).leader ?? dirs[0].organizer;
    } catch {
    }
  }
  if (id == null) return undefined;

  try {
    const users: User[] = await getAllUsers();
    const u = users.find((x) => String(x.id) === String(id));
    if (!u) return String(id);
    const name = (u as any).name ?? (u as any).firstName ?? (u as any).first_name ?? "";
    const surname = (u as any).surname ?? (u as any).lastName ?? (u as any).last_name ?? "";
    const display = `${surname} ${name}`.trim();
    return display || String(id);
  } catch {
    return String(id);
  }
}

async function mapEventToUi(data: any): Promise<Event> {
  const specs = await getSpecializations();
  return {
    ...data,
    specializations: normalizeSpecList(data, specs),
    status: computeStatus(data.endDate ?? data.end_date),
    organizer: await resolveOrganizer(data),
  };
}

export async function getEvents(): Promise<Event[]> {
  const raw: Event[] = USE_MOCK ? await _getEvents() : await client.get("/api/users/events/");
  return Promise.all((raw || []).map((e: any) => mapEventToUi(e)));
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const data: any = USE_MOCK ? await _getEventById(id) : await client.get(`/api/users/events/${id}/`);
  if (!data) return undefined;
  return mapEventToUi(data);
}

const fmtEndApp = (v?: string) => {
  if (!v) return undefined;
  if (v.includes("T")) return v;
  const d = new Date(`${v}T23:59:59`);
  return d.toISOString();
};

async function resolveSpecializationId(data: any): Promise<number | undefined> {
  const fromDirect = toNumber(data.specialization ?? data.specializationId);
  if (typeof fromDirect !== "undefined") return fromDirect;

  const first = Array.isArray(data.specializations) && data.specializations.length > 0 ? data.specializations[0] : null;
  if (!first) return undefined;

  const fromFirstId = toNumber(first.id ?? first.specializationId);
  if (typeof fromFirstId !== "undefined") return fromFirstId;

  const title = String(first.title ?? first.name ?? "").trim();
  if (!title) return undefined;

  const specs = await getSpecializations();
  const found = specs.find((s) => getSpecName(s).toLowerCase() === title.toLowerCase());
  if (found) return found.id;

  throw new Error(`Специализация "${title}" не найдена на сервере. Выберите специализацию из существующих.`);
}

async function toBackendEvent(data: any) {
  const payload: any = {
    name: data.title ?? data.name,
    description: data.description ?? "",
    start_date: data.startDate ?? data.start_date,
    end_date: data.endDate ?? data.end_date,
    end_app_date: fmtEndApp(data.applyDeadline) ?? data.end_app_date,
    stage: data.stage && String(data.stage).trim() ? data.stage : "—",
  };

  const specializationId = await resolveSpecializationId(data);
  if (typeof specializationId !== "undefined") payload.specialization = specializationId;

  return payload;
}

export async function saveEvent(data: Event): Promise<Event> {
  if (USE_MOCK) return _saveEvent({ ...data } as any);

  const payload = await toBackendEvent(data as any);
  const saved = (data as any).id
    ? await client.put(`/api/users/events/${(data as any).id}/`, payload)
    : await client.post("/api/users/events/", payload);

  return mapEventToUi(saved);
}

export async function removeEvent(id: number): Promise<any> {
  if (USE_MOCK) return _removeEvent(id);
  return client.del(`/api/users/events/${id}/`);
}
