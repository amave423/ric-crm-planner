import rawEvents from "../mock-data/events.json";

export interface EventItem {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  organizer: string;
  status: string;
}

export function getEvents(): EventItem[] {
  return rawEvents;
}

export function getEventById(id: number) {
  return rawEvents.find(e => e.id === id);
}