import rawEvents from "../mock-data/events.json";

export function getEvents() {
  return rawEvents;
}

export function getEventById(eventId) {
  return rawEvents.find(e => e.id === Number(eventId));
}

export function getDirections(eventId) {
  return getEventById(eventId)?.directions ?? [];
}

export function getDirectionById(eventId, directionId) {
  return getDirections(eventId).find(d => d.id === Number(directionId));
}

export function getProjects(eventId, directionId) {
  return getDirectionById(eventId, directionId)?.projects ?? [];
}
