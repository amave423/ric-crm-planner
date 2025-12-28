import client from "../api/client";
import type { Event } from "../types/event";
import type { User } from "../types/user";
import {
  getEvents as _getEvents,
  getDirectionsByEvent as _getDirectionsByEvent,
  getEventById as _getEventById,
  saveEvent as _saveEvent,
  removeEvent as _removeEvent,
  getAllUsers,
} from "../storage/storage";

const USE_MOCK = client.USE_MOCK;

function computeStatus(endDate?: string) {
  if (!endDate) return "Неактивно";
  const end = new Date(endDate);
  return end >= new Date() ? "Активно" : "Неактивно";
}

async function resolveOrganizer(e: any): Promise<string | undefined> {
  const leaderId = e.leader ?? e.organizer;
  let id = leaderId;
  if (id == null && e.id != null) {
    try {
      const dirs = await _getDirectionsByEvent(Number(e.id));
      if (Array.isArray(dirs) && dirs.length > 0) id = dirs[0].leader ?? dirs[0].organizer;
    } catch {}
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

export async function getEvents(): Promise<Event[]> {
  const raw: Event[] = USE_MOCK ? await _getEvents() : await client.get("/api/users/events/");
  const result = await Promise.all(
    raw.map(async (e: any) => ({
      ...e,
      status: computeStatus(e.endDate),
      organizer: await resolveOrganizer(e),
    }))
  );
  return result;
}

export async function getEventById(id: number): Promise<Event | undefined> {
  const data: any = USE_MOCK ? await _getEventById(id) : await client.get(`/api/users/events/${id}/`);
  if (!data) return undefined;
  return {
    ...data,
    status: computeStatus(data.endDate),
    organizer: await resolveOrganizer(data),
  };
}

const fmtEndApp = (v?: string) => {
  if (!v) return undefined;
  if (v.includes("T")) return v;
  const d = new Date(`${v}T23:59:59`);
  return d.toISOString();
};

async function toBackendEvent(data: any) {
  const payload: any = {
    name: data.title ?? data.name,
    description: data.description ?? "",
    start_date: data.startDate ?? data.start_date,
    end_date: data.endDate ?? data.end_date,
    end_app_date: fmtEndApp(data.applyDeadline) ?? data.end_app_date,
    stage: data.stage && String(data.stage).trim() ? data.stage : "—",
  };

  if (Array.isArray(data.specializations) && data.specializations.length > 0) {
    const first = data.specializations[0];
    if (first && first.id) {
      const idStr = String(first.id);
      const looksLikeTemp = idStr.length >= 12;
      if (looksLikeTemp && first.title) {
        try {
          const specs: any[] = await client.get("/api/users/specializations/");
          const found = (specs || []).find((s: any) => String(s.name).toLowerCase() === String(first.title).toLowerCase());
          if (found) payload.specialization = found.id;
        } catch {
        }
      } else {
        payload.specialization = first.id;
      }
    }
  } else if (data.specialization) {
    payload.specialization = data.specialization;
  }

  return payload;
}

export async function saveEvent(data: Event): Promise<Event> {
  if (USE_MOCK) return _saveEvent({ ...data } as any);
  const payload = await toBackendEvent(data as any);
  if ((data as any).id) return client.put(`/api/users/events/${(data as any).id}/`, payload);
  return client.post("/api/users/events/", payload);
}

export async function removeEvent(id: number): Promise<any> {
  if (USE_MOCK) return _removeEvent(id);
  return client.del(`/api/users/events/${id}/`);
}