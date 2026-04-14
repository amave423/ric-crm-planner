export interface PlannerParticipant {
  id: number;
  fullName: string;
}

export interface PlannerTeam {
  id: number;
  name: string;
  curatorId?: number;
  memberIds: number[];
  confirmed: boolean;
  eventId?: number;
  directionId?: number;
  projectId?: number;
  sourceRequestIds?: number[];
}

export interface PlannerParentTask {
  id: number;
  teamId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface PlannerSubtask {
  id: number;
  teamId: number;
  parentTaskId: number;
  title: string;
  role: string;
  assigneeId?: number;
  startDate: string;
  endDate: string;
  inSprint: boolean;
  status: string;
}

export interface PlannerState {
  enrollmentClosed: boolean;
  closedEventIds: number[];
  hiddenEventIds: number[];
  participants: PlannerParticipant[];
  teams: PlannerTeam[];
  parentTasks: PlannerParentTask[];
  subtasks: PlannerSubtask[];
  columns: string[];
}
