import client from "../api/client";
import type { Event } from "../types/event";
import type { Direction } from "../types/direction";
import type { Project } from "../types/project";
import type { User } from "../types/user";

export async function getEvents(): Promise<Event[]> {
  return client.get("/api/users/events/");
}

export async function getEventById(id: number): Promise<Event | undefined> {
  try {
    return await client.get(`/api/users/events/${id}/`);
  } catch {
    return undefined;
  }
}

export async function saveEvent(ev: Event): Promise<Event> {
  if (ev.id) {
    return client.put(`/api/users/events/${ev.id}/`, ev);
  }
  return client.post("/api/users/events/", ev);
}

export async function removeEvent(id: number): Promise<any> {
  return client.del(`/api/users/events/${id}/`);
}

export async function getDirectionsByEvent(eventId: number): Promise<Direction[]> {
  return client.get(`/api/users/events/${eventId}/directions/`);
}

export async function getDirectionById(id: number): Promise<Direction | undefined> {
  try {
    const events: Event[] = await getEvents();
    for (const ev of events) {
      const dirs: Direction[] = await getDirectionsByEvent(ev.id as number);
      const found = dirs.find((d) => d.id === id);
      if (found) return found;
    }
  } catch {
  }
  return undefined;
}

export async function saveDirectionsForEvent(eventId: number, dirs: Direction[]): Promise<Direction[]> {
  const results: any[] = [];

  function isTempId(id: any) {
    if (id == null) return false;
    const n = Number(id);
    if (Number.isNaN(n)) return true;
    return String(n).length >= 12 || n > 1e11;
  }

  for (const d of dirs) {
    if (d.id && !isTempId(d.id)) {
      results.push(await client.put(`/api/users/events/${eventId}/directions/${d.id}/`, d));
    } else {
      results.push(await client.post(`/api/users/events/${eventId}/directions/`, d));
    }
  }
  return results;
}

export async function getProjectsByDirection(directionId: number): Promise<Project[]> {
  try {
    const byQuery = await client.get(`/api/users/projects/?direction=${directionId}`);
    if (Array.isArray(byQuery)) return byQuery;
  } catch {
  }

  try {
    const events: Event[] = await getEvents();
    for (const ev of events) {
      const dirs: Direction[] = await getDirectionsByEvent(ev.id as number);
      const dir = dirs.find((d) => d.id === directionId);
      if (dir) {
        return client.get(`/api/users/events/${ev.id}/directions/${directionId}/projects/`);
      }
    }
  } catch {
  }
  return [];
}

export async function saveProjectsForDirection(directionId: number, projects: Project[]): Promise<any[]> {
  let eventId: number | null = null;
  try {
    const events: Event[] = await getEvents();
    for (const ev of events) {
      const dirs: Direction[] = await getDirectionsByEvent(ev.id as number);
      if (dirs.find((d) => d.id === directionId)) {
        eventId = ev.id as number;
        break;
      }
    }
  } catch {
  }

  const results: any[] = [];
  for (const p of projects) {
    if (p.id) {
      results.push(await client.put(`/api/users/projects/${p.id}/`, p));
    } else {
      if (eventId != null) {
        results.push(await client.post(`/api/users/events/${eventId}/directions/${directionId}/projects/`, p));
      } else {
        results.push(await client.post("/api/users/projects/", { ...p, direction: directionId }));
      }
    }
  }
  return results;
}

export async function getAllUsers(): Promise<User[]> {
  try {
    return await client.get("/api/users/");
  } catch {
    return [];
  }
}

export async function saveUser(user: User): Promise<User> {
  return client.post("/api/users/register/", user);
}

export async function getProfile(_userId: number): Promise<Record<string, any> | undefined> {
  try {
    return await client.get("/api/users/profile/");
  } catch {
    return undefined;
  }
}

export async function saveProfile(_userId: number, profile: Record<string, any>) {
  return client.put("/api/users/profile/", profile);
}

export async function getRequests(): Promise<any[]> {
  return client.get("/api/users/applications/");
}

export async function saveRequest(req: any): Promise<any> {
  if (req.id) {
    return client.put(`/api/users/applications/${req.id}/`, req);
  }
  if (req.eventId && req.directionId) {
    return client.post(`/api/users/events/${req.eventId}/directions/${req.directionId}/applications/`, req);
  }
  return client.post("/api/users/applications/", req);
}

export async function updateRequestStatus(id: number, status: string): Promise<any> {
  return client.put(`/api/users/applications/${id}/`, { status });
}