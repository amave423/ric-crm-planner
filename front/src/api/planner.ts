import client from "./client";
import { readPlannerState, writePlannerState } from "../storage/planner";
import type { PlannerParticipant, PlannerState } from "../types/planner";
import type { Request } from "../types/request";
import type { User } from "../types/user";

const USE_MOCK = client.USE_MOCK;

type BackendPlanner = {
  enrollmentClosed?: boolean;
  enrollment_closed?: boolean;
  participants?: Array<{ id?: number | string; fullName?: string; full_name?: string }>;
  teams?: PlannerState["teams"];
  parentTasks?: PlannerState["parentTasks"];
  parent_tasks?: PlannerState["parentTasks"];
  subtasks?: PlannerState["subtasks"];
  columns?: string[];
};

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function mapBackendPlanner(raw: unknown): PlannerState {
  const fallback = readPlannerState();
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as BackendPlanner;
  const fallbackSubtasksById = new Map<number, PlannerState["subtasks"][number]>(
    fallback.subtasks.map((s) => [Number(s.id), s])
  );
  const mappedSubtasks = Array.isArray(obj.subtasks)
    ? obj.subtasks.map((s) => {
        const sub = s as PlannerState["subtasks"][number];
        const id = Number((sub as { id?: number | string }).id ?? 0);
        const fallbackSub = fallbackSubtasksById.get(id);
        return {
          ...fallbackSub,
          ...sub,
          id: id || (fallbackSub?.id ?? 0),
          inSprint: typeof sub.inSprint === "boolean" ? sub.inSprint : fallbackSub?.inSprint ?? false,
        };
      })
    : fallback.subtasks;
  return {
    enrollmentClosed: Boolean(obj.enrollmentClosed ?? obj.enrollment_closed ?? false),
    participants: Array.isArray(obj.participants)
      ? obj.participants
          .map((p) => ({
            id: toNumber(p.id) ?? 0,
            fullName: String(p.fullName ?? p.full_name ?? ""),
          }))
          .filter((p) => p.id > 0 && p.fullName)
      : fallback.participants,
    teams: Array.isArray(obj.teams) ? obj.teams : fallback.teams,
    parentTasks: Array.isArray(obj.parentTasks) ? obj.parentTasks : Array.isArray(obj.parent_tasks) ? obj.parent_tasks : fallback.parentTasks,
    subtasks: mappedSubtasks,
    columns: Array.isArray(obj.columns) && obj.columns.length > 0 ? obj.columns : fallback.columns,
  };
}

function toBackendPlanner(state: PlannerState) {
  return {
    enrollment_closed: state.enrollmentClosed,
    participants: state.participants.map((p) => ({
      id: p.id,
      full_name: p.fullName,
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

function hasStartedWork(status?: string) {
  return String(status || "").toLowerCase().includes("приступ");
}

function isStudent(user: User) {
  const role = String(user.role || "").toLowerCase();
  return role === "student" || role.includes("project");
}

export function buildParticipantsFromRequests(users: User[], requests: Request[]): PlannerParticipant[] {
  const students = users.filter(isStudent);
  const userNameById = new Map<number, string>(students.map((u) => [Number(u.id), `${u.surname || ""} ${u.name || ""}`.trim() || u.email]));
  const requestNameById = new Map<number, string>();
  requests.forEach((request) => {
    const ownerId = toNumber(request.ownerId);
    const studentName = String(request.studentName || "").trim();
    if (typeof ownerId === "undefined" || !studentName) return;
    requestNameById.set(ownerId, studentName);
  });
  const validStudentIds = new Set<number>(students.map((u) => Number(u.id)));

  const ids = new Set<number>();
  requests.forEach((r) => {
    if (!hasStartedWork(r.status)) return;
    const id = toNumber(r.ownerId);
    if (typeof id === "undefined") return;
    if (validStudentIds.has(id)) ids.add(id);
  });

  return Array.from(ids).map((id) => ({
    id,
    fullName: userNameById.get(id) || requestNameById.get(id) || `Участник #${id}`,
  }));
}

function uniqParticipants(items: PlannerParticipant[]): PlannerParticipant[] {
  const byId = new Map<number, PlannerParticipant>();
  items.forEach((x) => {
    if (!x || !x.id) return;
    byId.set(Number(x.id), { id: Number(x.id), fullName: String(x.fullName || "").trim() || `Участник #${x.id}` });
  });
  return Array.from(byId.values());
}

export function syncParticipants(state: PlannerState, incoming: PlannerParticipant[]): PlannerState {
  const keepFromTeams = new Set<number>();
  state.teams.forEach((t) => t.memberIds.forEach((id) => keepFromTeams.add(Number(id))));
  const merged = uniqParticipants([
    ...incoming,
    ...Array.from(keepFromTeams).map((id) => ({ id, fullName: state.participants.find((p) => Number(p.id) === id)?.fullName || `Участник #${id}` })),
  ]);
  return { ...state, participants: merged };
}
