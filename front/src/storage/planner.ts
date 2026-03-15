import type { PlannerParentTask, PlannerState, PlannerSubtask, PlannerTeam } from "../types/planner";

const LS_PLANNER = "ric_planner_state_v1";

export const DEFAULT_KANBAN_COLUMNS = ["Запланировано", "В работе", "На проверке", "Готово"];

const EMPTY_STATE: PlannerState = {
  enrollmentClosed: false,
  participants: [],
  teams: [],
  parentTasks: [],
  subtasks: [],
  columns: DEFAULT_KANBAN_COLUMNS,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function readPlannerState(): PlannerState {
  const raw = localStorage.getItem(LS_PLANNER);
  if (!raw) return clone(EMPTY_STATE);
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    const subtasks = Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map((s) => {
          const sub = s as PlannerSubtask & { in_sprint?: boolean | number | string };
          const rawSprint = typeof sub.inSprint === "boolean" ? sub.inSprint : sub.in_sprint;
          const inSprint =
            typeof rawSprint === "boolean"
              ? rawSprint
              : rawSprint === 1 || rawSprint === "1" || String(rawSprint).toLowerCase() === "true";
          return { ...sub, inSprint };
        })
      : [];
    return {
      enrollmentClosed: Boolean(parsed.enrollmentClosed),
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      parentTasks: Array.isArray(parsed.parentTasks) ? parsed.parentTasks : [],
      subtasks,
      columns: Array.isArray(parsed.columns) && parsed.columns.length > 0 ? parsed.columns : [...DEFAULT_KANBAN_COLUMNS],
    };
  } catch {
    return clone(EMPTY_STATE);
  }
}

export function writePlannerState(state: PlannerState) {
  localStorage.setItem(LS_PLANNER, JSON.stringify(state));
}

export function nextPlannerId(items: Array<{ id: number }>) {
  return items.reduce((acc, x) => Math.max(acc, Number(x.id) || 0), 0) + 1;
}

export function removeTeamCascade(state: PlannerState, teamId: number): PlannerState {
  const parentIds = new Set(
    state.parentTasks.filter((x: PlannerParentTask) => Number(x.teamId) === Number(teamId)).map((x: PlannerParentTask) => Number(x.id))
  );
  return {
    ...state,
    teams: state.teams.filter((x: PlannerTeam) => Number(x.id) !== Number(teamId)),
    parentTasks: state.parentTasks.filter((x: PlannerParentTask) => Number(x.teamId) !== Number(teamId)),
    subtasks: state.subtasks.filter(
      (x: PlannerSubtask) => Number(x.teamId) !== Number(teamId) && !parentIds.has(Number(x.parentTaskId))
    ),
  };
}
