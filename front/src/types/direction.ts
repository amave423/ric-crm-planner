import type { Project } from "./project";

export interface Direction {
  id: number;
  title: string;
  description?: string;
  organizer?: string;
  eventId?: number;
  projects?: Project[];
}