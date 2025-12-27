import client from "../api/client";
import type { Request as ReqType } from "../types/request";

export const LS_KEY = "ric_planner_requests";

export async function getRequests(): Promise<ReqType[]> {
  try {
    return await client.get("/api/users/applications/");
  } catch {
    return [];
  }
}

export async function saveRequest(req: ReqType): Promise<ReqType> {
  if (req.id) {
    return client.put(`/api/users/applications/${req.id}/`, req);
  }
  if (req.eventId && (req as any).directionId) {
    return client.post(`/api/users/events/${req.eventId}/directions/${(req as any).directionId}/applications/`, req);
  }
  return client.post("/api/users/applications/", req);
}

export async function updateRequestStatus(id: number, status: string): Promise<ReqType | undefined> {
  return client.put(`/api/users/applications/${id}/`, { status });
}

export async function removeRequest(id: number): Promise<ReqType | undefined> {
  return client.del(`/api/users/applications/${id}/`);
}