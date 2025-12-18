import { getProjectsByDirection as _getProjectsByDirection, saveProjectsForDirection as _saveProjectsForDirection } from "../storage/storage";
import type { Project } from "../types/project";

export function getProjectsByDirection(directionId: number): Project[] {
  return _getProjectsByDirection(directionId);
}

export function saveProjectsForDirection(directionId: number, projects: Project[]) {
  return _saveProjectsForDirection(directionId, projects);
}