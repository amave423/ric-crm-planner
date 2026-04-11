import { useCallback, useMemo, useState, type FC } from "react";
import { Gantt, ViewMode, type Task } from "gantt-task-react";
import type { PlannerParentTask, PlannerSubtask } from "../../../../types/planner";
import "gantt-task-react/dist/index.css";

type PlannerGanttTask = Task & {
  plannerType: "parent" | "subtask";
  plannerId: number;
  assigneeLabel?: string;
  statusLabel?: string;
  childrenCount?: number;
};

type GanttTabProps = {
  activeTeamName: string;
  parents: PlannerParentTask[];
  subtasks: PlannerSubtask[];
  displayAssigneeLabel: (id: number) => string;
  onOpenTaskCard: (type: "parent" | "subtask", id: number) => void;
};

const viewModes = [
  { id: ViewMode.Day, label: "День" },
  { id: ViewMode.Week, label: "Неделя" },
  { id: ViewMode.Month, label: "Месяц" },
] as const;

/** Accepts YYYY-MM-DD or full ISO; invalid input must not reach gantt-task-react (taskXCoordinate breaks on bad dates). */
function parsePlannerDate(value: string): Date {
  if (!value || typeof value !== "string") {
    return new Date(NaN);
  }
  const dayPart = value.slice(0, 10);
  const m = dayPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(NaN);
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** gantt-task-react mutates Date instances (e.g. getMonday); never pass stored planner dates directly. */
function normalizeGanttRange(start: Date, end: Date): { start: Date; end: Date } {
  let s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    const t = new Date();
    s = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    e = new Date(s.getTime());
  }
  if (e.getTime() < s.getTime()) {
    e = new Date(s.getTime());
  }
  return { start: s, end: e };
}

function cloneTasksForGanttView(tasks: PlannerGanttTask[]): PlannerGanttTask[] {
  return tasks.map((t) => {
    const { start, end } = normalizeGanttRange(t.start, t.end);
    return {
      ...t,
      start: new Date(start.getTime()),
      end: new Date(end.getTime()),
    };
  });
}

function getColumnWidth(mode: ViewMode): number {
  switch (mode) {
    case ViewMode.Day:
      return 52;
    case ViewMode.Month:
      return 110;
    default:
      return 84;
  }
}

const SUBTASK_EMERALD = {
  backgroundColor: "#10b981",
  backgroundSelectedColor: "#059669",
  progressColor: "#10b981",
  progressSelectedColor: "#059669",
} as const;

const PARENT_BLUE = {
  backgroundColor: "#4f7cff",
  backgroundSelectedColor: "#315de0",
  progressColor: "#4f7cff",
  progressSelectedColor: "#315de0",
} as const;

const TooltipContent: FC<{ task: Task; fontSize: string; fontFamily: string }> = ({ task, fontFamily, fontSize }) => {
  const plannerTask = task as PlannerGanttTask;
  return (
    <div className="planner-gantt-tooltip" style={{ fontFamily, fontSize }}>
      <div className="planner-gantt-tooltip__title">{plannerTask.name}</div>
      <div className="planner-gantt-tooltip__row">
        {plannerTask.start.toLocaleDateString("ru-RU")} - {plannerTask.end.toLocaleDateString("ru-RU")}
      </div>
      {plannerTask.assigneeLabel && <div className="planner-gantt-tooltip__row">Ответственный: {plannerTask.assigneeLabel}</div>}
      {plannerTask.statusLabel && <div className="planner-gantt-tooltip__row">Статус: {plannerTask.statusLabel}</div>}
      <div className="planner-gantt-tooltip__hint">Кликни по задаче, чтобы открыть карточку.</div>
    </div>
  );
};

export default function GanttTab({ activeTeamName, parents, subtasks, displayAssigneeLabel, onOpenTaskCard }: GanttTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedLabel, setSelectedLabel] = useState("Нажми на строку или полосу задачи, чтобы открыть карточку.");
  const [collapsedParents, setCollapsedParents] = useState<string[]>([]);

  const tasks = useMemo<PlannerGanttTask[]>(() => {
    const sortedParents = [...parents].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, "ru"));

    return sortedParents.flatMap((parent, parentIndex) => {
      const childSubtasks = subtasks
        .filter((subtask) => Number(subtask.parentTaskId) === Number(parent.id))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, "ru"));

      const { start: pStart, end: pEnd } = normalizeGanttRange(
        parsePlannerDate(parent.startDate),
        parsePlannerDate(parent.endDate)
      );

      const parentTask: PlannerGanttTask = {
        id: `parent-${parent.id}`,
        type: "project",
        name: parent.title,
        start: pStart,
        end: pEnd,
        progress: 0,
        hideChildren: collapsedParents.includes(`parent-${parent.id}`),
        isDisabled: true,
        displayOrder: (parentIndex + 1) * 100,
        plannerType: "parent",
        plannerId: parent.id,
        childrenCount: childSubtasks.length,
        styles: { ...PARENT_BLUE },
      };

      const subtaskTasks = childSubtasks.map<PlannerGanttTask>((subtask, subtaskIndex) => {
        const { start: sStart, end: sEnd } = normalizeGanttRange(
          parsePlannerDate(subtask.startDate),
          parsePlannerDate(subtask.endDate)
        );
        return {
          id: `subtask-${subtask.id}`,
          type: "task",
          name: subtask.title,
          start: sStart,
          end: sEnd,
          progress: 0,
          isDisabled: true,
          project: parentTask.id,
          displayOrder: (parentIndex + 1) * 100 + subtaskIndex + 1,
          plannerType: "subtask",
          plannerId: subtask.id,
          assigneeLabel: subtask.assigneeId ? displayAssigneeLabel(subtask.assigneeId) : "Не назначен",
          statusLabel: subtask.status,
          styles: { ...SUBTASK_EMERALD },
        };
      });

      return [parentTask, ...subtaskTasks];
    });
  }, [collapsedParents, displayAssigneeLabel, parents, subtasks]);

  const ganttTasks = useMemo(() => cloneTasksForGanttView(tasks), [tasks, viewMode]);

  const handleGanttExpanderClick = useCallback((task: Task) => {
    const taskId = String(task.id);
    setCollapsedParents((prev) => (task.hideChildren ? [...prev, taskId] : prev.filter((id) => id !== taskId)));
  }, []);

  const TaskListHeader: FC<{
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => (
    <div
      className="planner-gantt-list-header"
      style={{
        minWidth: rowWidth,
        height: headerHeight - 2,
        fontFamily,
        fontSize,
      }}
    >
      <div>Задача</div>
    </div>
  );

  const TaskListTable: FC<{
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: Task[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
    onExpanderClick: (task: Task) => void;
  }> = ({ rowHeight, rowWidth, fontFamily, fontSize, tasks, selectedTaskId, setSelectedTask, onExpanderClick }) => (
    <div
      className="planner-gantt-list"
      style={{
        minWidth: rowWidth,
        fontFamily,
        fontSize,
      }}
    >
      {tasks.map((task) => {
        const plannerTask = task as PlannerGanttTask;
        const isParent = plannerTask.plannerType === "parent";
        const isSelected = selectedTaskId === plannerTask.id;
        const canExpand = task.type === "project";
        const expander = canExpand ? (task.hideChildren ? "▸" : "▾") : "";
        const metaText = isParent
          ? plannerTask.childrenCount
            ? `${plannerTask.childrenCount} подзадач`
            : "Без подзадач"
          : plannerTask.statusLabel || "Подзадача";
        return (
          <button
            key={plannerTask.id}
            type="button"
            className={`planner-gantt-list-row ${isParent ? "is-parent" : "is-child"} ${isSelected ? "is-selected" : ""}`}
            style={{ minWidth: rowWidth, height: rowHeight }}
            onClick={() => {
              setSelectedTask(plannerTask.id);
              setSelectedLabel(`Выбрано: ${plannerTask.name}`);
              onOpenTaskCard(plannerTask.plannerType, plannerTask.plannerId);
            }}
          >
            <div className="planner-gantt-list-row__title">
              <div className="planner-gantt-list-row__main">
                <span
                  className={`planner-gantt-expander ${canExpand ? "is-visible" : "is-hidden"}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (canExpand) onExpanderClick(task);
                  }}
                >
                  {expander || "•"}
                </span>
                <span className="planner-gantt-list-row__name">{plannerTask.name}</span>
              </div>
              <span className="planner-gantt-list-row__meta">{metaText}</span>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="planner-card planner-gantt-card">
      <div className="planner-gantt-head">
        <div className="planner-gantt-head__copy">
          <h3 className="h3">Диаграмма Ганта</h3>
          {activeTeamName && <div className="planner-current-team">Команда: {activeTeamName}</div>}
        </div>

        <div className="planner-gantt-head__controls">
          <div className="planner-gantt-switcher" role="tablist" aria-label="Масштаб диаграммы Ганта">
            {viewModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={viewMode === mode.id ? "is-active" : ""}
                onClick={() => setViewMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="planner-gantt-meta">{selectedLabel}</div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="planner-empty-inline">Нет задач для отображения.</div>
      ) : (
        <div className="planner-gantt-surface">
          <Gantt
            key={viewMode}
            tasks={ganttTasks}
            viewMode={viewMode}
            locale="ru"
            listCellWidth="240px"
            columnWidth={getColumnWidth(viewMode)}
            rowHeight={44}
            ganttHeight={420}
            barFill={72}
            preStepsCount={1}
            fontFamily="Inter, sans-serif"
            todayColor="rgba(79, 124, 255, 0.10)"
            TooltipContent={TooltipContent}
            TaskListHeader={TaskListHeader}
            TaskListTable={TaskListTable}
            onExpanderClick={handleGanttExpanderClick}
            onClick={(task) => {
              const plannerTask = task as PlannerGanttTask;
              setSelectedLabel(`Выбрано: ${plannerTask.name}`);
              onOpenTaskCard(plannerTask.plannerType, plannerTask.plannerId);
            }}
          />
        </div>
      )}
    </div>
  );
}
