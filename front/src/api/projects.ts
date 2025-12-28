import client from "../api/client";
import type { Project } from "../types/project";
import { getProjectsByDirection as _getProjectsByDirection, saveProjectsForDirection as _saveProjectsForDirection } from "../storage/storage";

const USE_MOCK = client.USE_MOCK;

export async function getProjectsByDirection(directionId: number): Promise<Project[]> {
  if (USE_MOCK) return _getProjectsByDirection(directionId);
  // Используем storage-логику — она сначала попытается получить проекты через event-specific endpoint,
  // что безопаснее в окружении, где таблица projects может отсутствовать для общего query.
  return _getProjectsByDirection(directionId);
}

export async function saveProjectsForDirection(directionId: number, projects: Project[]) {
  if (USE_MOCK) return _saveProjectsForDirection(directionId, projects);
  const results: any[] = [];
  for (const p of projects) {
    if (p.id) {
      results.push(await client.put(`/api/users/projects/${p.id}/`, p));
    } else {
      results.push(await client.post(`/api/users/projects/`, { ...p, direction: directionId }));
    }
  }
  return results;
}