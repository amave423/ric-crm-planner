import { getEvents as _getEvents, getEventById as _getEventById } from "../storage/storage";
import { getAllUsers } from "../storage/storage";
import type { Event } from "../types/event";
import { saveEvent as _saveEvent } from "../storage/storage";
import { removeEvent as _removeEvent } from "../storage/storage"

function computeStatus(endDate?: string) {
  if (!endDate) return "Неактивно";
  const end = new Date(endDate);
  return end >= new Date() ? "Активно" : "Неактивно";
}

function resolveOrganizer(e: any) {
  if (e.organizer) return e.organizer;
  const users = getAllUsers();
  const leaderId = e.leader;
  if (leaderId == null) return undefined;
  const u = users.find((x) => String(x.id) === String(leaderId));
  if (!u) return String(leaderId);
  return `${u.surname} ${u.name}`;
}

export function getEvents(): Event[] {
  return _getEvents().map((e: any) => ({
    ...e,
    status: computeStatus(e.endDate),
    organizer: resolveOrganizer(e),
  }));
}

export function getEventById(id: number): Event | undefined {
  const e = _getEventById(id);
  if (!e) return undefined;
  return {
    ...e,
    status: computeStatus(e.endDate),
    organizer: resolveOrganizer(e),
  };
}

export function saveEvent(data: Event) { return _saveEvent({ ...data }); }
export function removeEvent(id: number) { return _removeEvent(id); }