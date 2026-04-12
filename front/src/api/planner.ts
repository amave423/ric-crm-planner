import client from "./client";
import { REQUEST_STATUS } from "../constants/requestProgress";
import { readPlannerState, writePlannerState } from "../storage/planner";
import type { PlannerParticipant, PlannerState } from "../types/planner";
import type { Request } from "../types/request";
import type { User } from "../types/user";

const USE_MOCK = client.USE_MOCK;

type BackendPlanner = {
  enrollmentClosed?: boolean;
  enrollment_closed?: boolean;
  closedEventIds?: Array<number | string>;
  closed_event_ids?: Array<number | string>;
  participants?: Array<{ id?: number | string; fullName?: string; full_name?: string }>;
  teams?: PlannerState["teams"];
  parentTasks?: PlannerState["parentTasks"];
  parent_tasks?: PlannerState["parentTasks"];
  subtasks?: PlannerState["subtasks"];
  columns?: string[];
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

export function hasStartedWork(status?: string) {
  return String(status || "").trim().toLowerCase() === REQUEST_STATUS.STARTED.toLowerCase();
}

function mapBackendPlanner(raw: unknown): PlannerState {
  const fallback = readPlannerState();
  if (!raw || typeof raw !== "object") return fallback;

  const planner = raw as BackendPlanner;
  const fallbackSubtasksById = new Map<number, PlannerState["subtasks"][number]>(
    fallback.subtasks.map((subtask) => [Number(subtask.id), subtask])
  );
  const mappedSubtasks = Array.isArray(planner.subtasks)
    ? planner.subtasks.map((item) => {
        const subtask = item as PlannerState["subtasks"][number];
        const id = Number((subtask as { id?: number | string }).id ?? 0);
        const fallbackSubtask = fallbackSubtasksById.get(id);
        return {
          ...fallbackSubtask,
          ...subtask,
          id: id || (fallbackSubtask?.id ?? 0),
          inSprint: typeof subtask.inSprint === "boolean" ? subtask.inSprint : fallbackSubtask?.inSprint ?? false,
        };
      })
    : fallback.subtasks;

  const closedEventIds = Array.isArray(planner.closedEventIds ?? planner.closed_event_ids)
    ? (planner.closedEventIds ?? planner.closed_event_ids ?? [])
        .map((id) => toNumber(id))
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0)
    : fallback.closedEventIds;

  return {
    enrollmentClosed: closedEventIds.length > 0 || Boolean(planner.enrollmentClosed ?? planner.enrollment_closed ?? false),
    closedEventIds,
    participants: Array.isArray(planner.participants)
      ? planner.participants
          .map((participant) => ({
            id: toNumber(participant.id) ?? 0,
            fullName: String(participant.fullName ?? participant.full_name ?? ""),
          }))
          .filter((participant) => participant.id > 0 && participant.fullName)
      : fallback.participants,
    teams: Array.isArray(planner.teams) ? planner.teams : fallback.teams,
    parentTasks: Array.isArray(planner.parentTasks)
      ? planner.parentTasks
      : Array.isArray(planner.parent_tasks)
        ? planner.parent_tasks
        : fallback.parentTasks,
    subtasks: mappedSubtasks,
    columns: Array.isArray(planner.columns) && planner.columns.length > 0 ? planner.columns : fallback.columns,
  };
}

function toBackendPlanner(state: PlannerState) {
  return {
    enrollment_closed: state.closedEventIds.length > 0,
    closed_event_ids: state.closedEventIds,
    participants: state.participants.map((participant) => ({
      id: participant.id,
      full_name: participant.fullName,
    })),
    teams: state.teams,
    parent_tasks: state.parentTasks,
    subtasks: state.subtasks,
    columns: state.columns,
  };
}

export async function getPlannerState(): Promise<PlannerState> {
  if (USE_MOCK) return readPlannerState();
  try {
    const raw = await client.get<unknown>("/api/users/planner/");
    const mapped = mapBackendPlanner(raw);
    writePlannerState(mapped);
    return mapped;
  } catch {
    return readPlannerState();
  }
}

export async function savePlannerState(state: PlannerState): Promise<PlannerState> {
  writePlannerState(state);
  if (USE_MOCK) return state;
  try {
    await client.put("/api/users/planner/", toBackendPlanner(state));
  } catch {
  }
  return state;
}

function isStudent(user: User) {
  const role = String(user.role || "").toLowerCase();
  return role === "student" || role.includes("project");
}

export function buildParticipantsFromRequests(users: User[], requests: Request[], closedEventIds: number[] = []): PlannerParticipant[] {
  const students = users.filter(isStudent);
  const userNameById = new Map<number, string>(
    students.map((user) => [Number(user.id), `${user.surname || ""} ${user.name || ""}`.trim() || user.email])
  );
  const requestNameById = new Map<number, string>();
  requests.forEach((request) => {
    const ownerId = toNumber(request.ownerId);
    const studentName = String(request.studentName || "").trim();
    if (typeof ownerId === "undefined" || !studentName) return;
    requestNameById.set(ownerId, studentName);
  });
  const validStudentIds = new Set<number>(students.map((user) => Number(user.id)));
  const closedEventIdSet = new Set(
    closedEventIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  );

  const ids = new Set<number>();
  requests.forEach((request) => {
    if (!hasStartedWork(request.status)) return;
    const ownerId = toNumber(request.ownerId);
    const eventId = toNumber(request.eventId);
    if (typeof ownerId === "undefined") return;
    if (closedEventIdSet.size > 0 && (typeof eventId === "undefined" || !closedEventIdSet.has(eventId))) return;
    if (validStudentIds.has(ownerId)) ids.add(ownerId);
  });

  return Array.from(ids).map((id) => ({
    id,
    fullName: userNameById.get(id) || requestNameById.get(id) || `Участник #${id}`,
  }));
}

function uniqParticipants(items: PlannerParticipant[]): PlannerParticipant[] {
  const byId = new Map<number, PlannerParticipant>();
  items.forEach((item) => {
    if (!item || !item.id) return;
    byId.set(Number(item.id), {
      id: Number(item.id),
      fullName: String(item.fullName || "").trim() || `Участник #${item.id}`,
    });
  });
  return Array.from(byId.values());
}

export function syncParticipants(state: PlannerState, incoming: PlannerParticipant[]): PlannerState {
  const keepFromTeams = new Set<number>();
  state.teams.forEach((team) => team.memberIds.forEach((id) => keepFromTeams.add(Number(id))));

  const merged = uniqParticipants([
    ...incoming,
    ...Array.from(keepFromTeams).map((id) => ({
      id,
      fullName: state.participants.find((participant) => Number(participant.id) === id)?.fullName || `Участник #${id}`,
    })),
  ]);

  return { ...state, participants: merged };
}
