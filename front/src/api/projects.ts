import client from "../api/client";
import {
  getAllUsers,
  getProjectsByDirection as _getProjectsByDirection,
  saveProjectsForDirection as _saveProjectsForDirection,
} from "../storage/storage";
import type { Project } from "../types/project";

const USE_MOCK = client.USE_MOCK;

function isTempId(id: any) {
  if (id == null) return false;
  const n = Number(id);
  if (Number.isNaN(n)) return true;
  return String(n).length >= 12 || n > 1e11;
}

function toNumber(value: any): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function displayName(user: any): string {
  return `${user?.surname ?? user?.lastName ?? user?.last_name ?? ""} ${user?.name ?? user?.firstName ?? user?.first_name ?? ""}`.trim();
}

async function getUserMaps() {
  const users = await getAllUsers().catch(() => []);
  const userNameById = new Map<number, string>();
  const userIdByDisplay = new Map<string, number>();

  users.forEach((u: any) => {
    const id = Number(u.id);
    const name = displayName(u);
    if (!Number.isNaN(id)) userNameById.set(id, name || String(id));
    if (name) userIdByDisplay.set(name, id);
  });

  return { userNameById, userIdByDisplay };
}

function resolveCuratorId(rawCurator: any, userIdByDisplay: Map<string, number>): number | undefined {
  const direct = toNumber(rawCurator);
  if (typeof direct !== "undefined") return direct;

  if (typeof rawCurator === "string") {
    const trimmed = rawCurator.trim();
    if (!trimmed) return undefined;
    return userIdByDisplay.get(trimmed);
  }

  return undefined;
}

function mapBackendProject(item: any, userNameById: Map<number, string>): Project {
  const curatorId = toNumber(item.curatorId ?? item.curator);
  return {
    id: Number(item.id),
    title: item.title ?? item.name ?? "",
    description: item.description ?? "",
    teams: typeof item.teams === "number" ? item.teams : toNumber(item.teams),
    directionId: toNumber(item.directionId ?? item.direction),
    curatorId,
    curator:
      (typeof curatorId !== "undefined" ? userNameById.get(curatorId) : undefined) ??
      (item.curatorName ? String(item.curatorName) : undefined) ??
      (item.curator != null ? String(item.curator) : undefined),
  };
}

export async function getProjectsByDirection(directionId: number): Promise<Project[]> {
  if (USE_MOCK) return _getProjectsByDirection(directionId);

  const { userNameById } = await getUserMaps();
  const raw = await client.get("/api/users/projects/");
  const list = Array.isArray(raw) ? raw : [];

  return list
    .filter((x: any) => Number(x.directionId ?? x.direction) === Number(directionId))
    .map((x: any) => mapBackendProject(x, userNameById));
}

export async function saveProjectsForDirection(directionId: number, projects: Project[]) {
  if (USE_MOCK) return _saveProjectsForDirection(directionId, projects);

  const { userNameById, userIdByDisplay } = await getUserMaps();
  const results: Project[] = [];

  for (const p of projects) {
    const curatorId = resolveCuratorId((p as any).curatorId ?? p.curator, userIdByDisplay);
    const payload: Record<string, any> = {
      name: p.title ?? (p as any).name ?? "",
      description: p.description ?? "",
      teams: typeof p.teams === "number" ? p.teams : p.teams ? Number(p.teams) : null,
    };
    if (typeof curatorId !== "undefined") payload.curator = curatorId;

    if (p.id && !isTempId(p.id)) {
      const updated = await client.put(`/api/users/projects/${p.id}/`, payload);
      results.push(mapBackendProject(updated, userNameById));
    } else {
      const created = await client.post("/api/users/projects/", {
        ...payload,
        direction_id: directionId,
      });
      results.push(mapBackendProject(created, userNameById));
    }
  }

  return results;
}
