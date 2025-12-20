import { getRequests as _getRequests, saveRequest as _saveRequest, updateRequestStatus as _updateRequestStatus, removeRequest as _removeRequest } from "../storage/requests";
import type { Request } from "../types/request";

export function getRequests(): Request[] {
  return _getRequests();
}

export function saveRequest(req: Request): Request {
  return _saveRequest(req);
}

export function updateRequestStatus(id: number, status: string) {
  return _updateRequestStatus(id, status);
}

export function removeRequest(id: number) {
  return _removeRequest(id);
}