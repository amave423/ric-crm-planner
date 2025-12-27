import client from "../api/client";
import type { Request as ReqType } from "../types/request";
import { getRequests as _getRequests, saveRequest as _saveRequest, updateRequestStatus as _updateRequestStatus, removeRequest as _removeRequest } from "../storage/requests";

const USE_MOCK = client.USE_MOCK;

export async function getRequests(): Promise<ReqType[]> {
  if (USE_MOCK) return _getRequests();
  return client.get("/api/users/applications/");
}

export async function saveRequest(req: ReqType): Promise<ReqType> {
  if (USE_MOCK) return _saveRequest(req);
  if (req.id) {
    return client.put(`/api/users/applications/${req.id}/`, req);
  }
  if (req.eventId && (req as any).directionId) {
    return client.post(`/api/users/events/${req.eventId}/directions/${(req as any).directionId}/applications/`, req);
  }
  return client.post("/api/users/applications/", req);
}

export async function updateRequestStatus(id: number, status: string) {
  if (USE_MOCK) return _updateRequestStatus(id, status);
  return client.put(`/api/users/applications/${id}/`, { status });
}

export async function removeRequest(id: number) {
  if (USE_MOCK) return _removeRequest(id);
  return client.del(`/api/users/applications/${id}/`);
}