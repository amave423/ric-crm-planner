import client from "../api/client";
import type { Event } from "../types/event";
import type { User } from "../types/user";
import {
  getEvents as _getEvents,
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
  if (e.organizer) return e.organizer;
  const leaderId = e.leader;
  if (leaderId == null) return undefined;

  try {
    const users: User[] = await getAllUsers();
    const u = users.find((x) => String(x.id) === String(leaderId));
    if (!u) return String(leaderId);
    return `${u.surname} ${u.name}`;
  } catch {
    return String(leaderId);
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

export async function saveEvent(data: Event): Promise<Event> {
  if (USE_MOCK) return _saveEvent({ ...data } as any);
  if (data.id) return client.put(`/api/users/events/${data.id}/`, data);
  return client.post("/api/users/events/", data);
}

export async function removeEvent(id: number): Promise<any> {
  if (USE_MOCK) return _removeEvent(id);
  return client.del(`/api/users/events/${id}/`);
}