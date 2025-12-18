import mockEvents from "../mock-data/events.json";
import mockDirections from "../mock-data/directions.json";
import mockProjects from "../mock-data/projects.json";
import mockUsers from "../mock-data/users.json";
import type { Event } from "../types/event";
import type { Direction } from "../types/direction";
import type { Project } from "../types/project";
import type { User } from "../types/user";

const LS_KEY_PREFIX = "ric_planner_";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeById<T extends { id: number }>(base: T[], overrides: Partial<T>[]): T[] {
  const map = new Map<number, T>();
  base.forEach((b) => map.set(b.id, { ...b }));
  overrides.forEach((o) => {
    if (o.id == null) return;
    const existing = map.get(o.id);
    map.set(o.id, { ...(existing || (o as T)), ...(o as T) });
  });
  return Array.from(map.values());
}

export function getEvents(): Event[] {
  const stored = readJSON<Event[]>(LS_KEY_PREFIX + "events", []);
  const base = Array.isArray(mockEvents) ? (mockEvents as Event[]) : [];
  return mergeById(base, stored);
}

export function getEventById(id: number): Event | undefined {
  return getEvents().find((e) => e.id === id);
}

export function saveEvent(ev: Event): Event {
  const all = getEvents();
  if (!ev.id) {
    const max = all.reduce((m, x) => Math.max(m, x.id || 0), 0);
    ev.id = max + 1;
    all.push(ev);
  } else {
    const idx = all.findIndex((x) => x.id === ev.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...ev };
    else all.push(ev);
  }
  writeJSON(LS_KEY_PREFIX + "events", all);
  return ev;
}

export function getDirectionsByEvent(eventId: number): Direction[] {
  const stored = readJSON<Direction[]>(LS_KEY_PREFIX + "directions", []);
  const base = Array.isArray(mockDirections) ? (mockDirections as Direction[]) : [];
  const merged = mergeById(base, stored);
  return merged.filter((d) => d.eventId === eventId);
}

export function getDirectionById(id: number): Direction | undefined {
  const stored = readJSON<Direction[]>(LS_KEY_PREFIX + "directions", []);
  const base = Array.isArray(mockDirections) ? (mockDirections as Direction[]) : [];
  const merged = mergeById(base, stored);
  return merged.find((d) => d.id === id);
}

export function saveDirectionsForEvent(eventId: number, dirs: Direction[]): Direction[] {
  const stored = readJSON<Direction[]>(LS_KEY_PREFIX + "directions", []);
  const others = stored.filter((d) => d.eventId !== eventId);
  const normalized = dirs.map((d) => ({ ...d, eventId }));
  const result = [...others, ...normalized];
  writeJSON(LS_KEY_PREFIX + "directions", result);
  return normalized;
}

export function getProjectsByDirection(directionId: number): Project[] {
  const stored = readJSON<Project[]>(LS_KEY_PREFIX + "projects", []);
  const base = Array.isArray(mockProjects) ? (mockProjects as Project[]) : [];
  const merged = mergeById(base, stored);
  return merged.filter((p) => p.directionId === directionId);
}

export function saveProjectsForDirection(directionId: number, projects: Project[]): Project[] {
  const stored = readJSON<Project[]>(LS_KEY_PREFIX + "projects", []);
  const others = stored.filter((p) => p.directionId !== directionId);
  const normalized = projects.map((p) => ({ ...p, directionId }));
  const result = [...others, ...normalized];
  writeJSON(LS_KEY_PREFIX + "projects", result);
  return normalized;
}

export function getAllUsers(): User[] {
  const stored = readJSON<User[]>(LS_KEY_PREFIX + "users", []);
  const base = Array.isArray(mockUsers) ? (mockUsers as User[]) : [];
  return mergeById(base, stored);
}

export function saveUser(user: User): User {
  const users = getAllUsers();
  if (!user.id) {
    const max = users.reduce((m, x) => Math.max(m, x.id || 0), 0);
    user.id = max + 1;
    users.push(user);
  } else {
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) users[idx] = { ...users[idx], ...user };
    else users.push(user);
  }
  writeJSON(LS_KEY_PREFIX + "users", users);
  return user;
}

export function getProfile(userId: number): Record<string, any> | undefined {
  const stored = readJSON<Record<string, Record<string, any>>>(LS_KEY_PREFIX + "profiles", {});
  return stored[String(userId)];
}

export function saveProfile(userId: number, profile: Record<string, any>) {
  const stored = readJSON<Record<string, Record<string, any>>>(LS_KEY_PREFIX + "profiles", {});
  stored[String(userId)] = profile;
  writeJSON(LS_KEY_PREFIX + "profiles", stored);
  return stored[String(userId)];
}