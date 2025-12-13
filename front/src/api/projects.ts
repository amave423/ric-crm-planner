import rawProjects from "../mock-data/projects.json";

export interface ProjectItem {
  id: number;
  title: string;
  curator: string;
  teams: number;
  directionId: number;
}

export function getProjectsByDirection(directionId: number): ProjectItem[] {
  return rawProjects.filter(p => p.directionId === directionId);
}
