import rawDirections from "../mock-data/directions.json";

export interface DirectionItem {
  id: number;
  title: string;
  organizer: string;
  eventId: number;
}

export function getDirectionsByEvent(eventId: number): DirectionItem[] {
  return rawDirections.filter(d => d.eventId === eventId);
}

export function getDirectionById(id: number) {
  return rawDirections.find(d => d.id === id);
}
