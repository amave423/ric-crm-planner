import { getDirectionsByEvent as _getDirectionsByEvent, getDirectionById as _getDirectionById, saveDirectionsForEvent as _saveDirectionsForEvent } from "../storage/storage";
import type { Direction } from "../types/direction";

export function getDirectionsByEvent(eventId: number): Direction[] {
  return _getDirectionsByEvent(eventId);
}

export function getDirectionById(id: number): Direction | undefined {
  return _getDirectionById(id);
}

export function saveDirectionsForEvent(eventId: number, dirs: Direction[]) {
  return _saveDirectionsForEvent(eventId, dirs);
}