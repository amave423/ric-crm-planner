import client from "../api/client";
import type { Direction } from "../types/direction";
import { getDirectionsByEvent as _getDirectionsByEvent, getDirectionById as _getDirectionById, saveDirectionsForEvent as _saveDirectionsForEvent } from "../storage/storage";

const USE_MOCK = client.USE_MOCK;

function isTempId(id: any) {
  if (id == null) return false;
  const n = Number(id);
  if (Number.isNaN(n)) return true;
  return String(n).length >= 12 || n > 1e11;
}

function mapToBackendPayload(d: any) {
  const payload: any = {
    name: d.title ?? d.name ?? "",
    description: d.description ?? "",
  };

  const leaderVal = d.leader ?? d.organizer;
  if (typeof leaderVal === "number") {
    payload.leader = leaderVal;
  } else if (typeof leaderVal === "string") {
    const n = Number(leaderVal);
    if (!Number.isNaN(n)) payload.leader = n;
  }

  if (d.id && !isTempId(d.id)) payload.id = d.id;

  return payload;
}

export async function getDirectionsByEvent(eventId: number): Promise<Direction[]> {
  if (USE_MOCK) return _getDirectionsByEvent(eventId);
  return client.get(`/api/users/events/${eventId}/directions/`);
}

export async function getDirectionById(id: number): Promise<Direction | undefined> {
  if (USE_MOCK) return _getDirectionById(id);
  return client.get(`/api/users/events/0/directions/${id}/`).catch(() => undefined);
}

export async function saveDirectionsForEvent(eventId: number, dirs: Direction[]) {
  if (USE_MOCK) return _saveDirectionsForEvent(eventId, dirs);
  const created: any[] = [];
  for (const d of dirs) {
    const payload = mapToBackendPayload(d);
    if (d.id && !isTempId(d.id)) {
      await client.put(`/api/users/events/${eventId}/directions/${d.id}/`, payload);
      created.push({ ...payload, id: d.id });
    } else {
      const res = await client.post(`/api/users/events/${eventId}/directions/`, payload);
      created.push(res);
    }
  }
  return created;
}