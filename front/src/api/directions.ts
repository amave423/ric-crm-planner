import client from "../api/client";
import type { Direction } from "../types/direction";
import {
  getAllUsers,
  getDirectionById as _getDirectionById,
  getDirectionsByEvent as _getDirectionsByEvent,
  saveDirectionsForEvent as _saveDirectionsForEvent,
} from "../storage/storage";

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

function toNumber(value: any): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

async function mapToUiDirections(raw: any[]): Promise<Direction[]> {
  const users = await getAllUsers().catch(() => []);
  const userNameById = new Map<number, string>();

  users.forEach((u: any) => {
    const display = `${u.surname ?? u.lastName ?? u.last_name ?? ""} ${u.name ?? u.firstName ?? u.first_name ?? ""}`.trim();
    if (display) userNameById.set(Number(u.id), display);
  });

  return raw.map((item: any) => {
    const leaderId = toNumber(item.leader ?? item.organizer);
    const organizerName =
      (typeof leaderId !== "undefined" ? userNameById.get(leaderId) : undefined) ??
      item.organizerName ??
      (item.organizer != null ? String(item.organizer) : undefined);

    return {
      ...item,
      id: Number(item.id),
      title: item.title ?? item.name ?? "",
      description: item.description ?? "",
      organizer: organizerName,
      eventId: toNumber(item.eventId ?? item.event),
    } as Direction;
  });
}

export async function getDirectionsByEvent(eventId: number): Promise<Direction[]> {
  if (USE_MOCK) return _getDirectionsByEvent(eventId);
  const raw = await client.get(`/api/users/events/${eventId}/directions/`);
  return mapToUiDirections(Array.isArray(raw) ? raw : []);
}

export async function getDirectionById(id: number): Promise<Direction | undefined> {
  if (USE_MOCK) return _getDirectionById(id);

  try {
    const list = await client.get("/api/users/directions/");
    const mapped = await mapToUiDirections(Array.isArray(list) ? list : []);
    return mapped.find((x) => Number(x.id) === Number(id));
  } catch {
    return undefined;
  }
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
  return mapToUiDirections(created);
}
