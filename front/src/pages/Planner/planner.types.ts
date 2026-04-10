import type { PlannerSubtask } from "../../types/planner";

export type PlannerTab = "teams" | "backlog" | "kanban" | "gantt";

export type ParentEditDraft = {
  title: string;
  startDate: string;
  endDate: string;
};

export type SubtaskEditDraft = {
  title: string;
  assigneeId?: number;
  startDate: string;
  endDate: string;
  status: string;
  inSprint: boolean;
};

export type ProjectApplicantsGroup = {
  key: string;
  eventId?: number;
  directionId?: number;
  projectId?: number;
  eventTitle: string;
  directionTitle: string;
  projectTitle: string;
  applicants: Array<{ ownerId: number; name: string; status?: string; requestIds: number[] }>;
};

export type ApplicantsTreeNode = {
  key: string;
  title: string;
  directions: Array<{
    key: string;
    title: string;
    projects: ProjectApplicantsGroup[];
  }>;
};

export type GanttTick = {
  offset: number;
  label: string;
};

export type GanttRow = {
  key: string;
  label: string;
  start: string;
  end: string;
  type: "parent" | "sub";
};

export type TaskCardState = { type: "parent" | "subtask"; id: number } | null;

export type PlannerDragPreview = {
  subtask: PlannerSubtask;
  x: number;
  y: number;
  width: number;
  tilt: number;
};
