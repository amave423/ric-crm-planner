import type { RefObject } from "react";
import type { PlannerSubtask } from "../../../../types/planner";
import type { PlannerDragPreview } from "../../planner.types";

type KanbanTabProps = {
  newColumn: string;
  columns: string[];
  filteredSubtasks: PlannerSubtask[];
  draggingSubtaskId: number | null;
  dragOverColumn: string | null;
  dragPreview: PlannerDragPreview | null;
  dragPreviewElRef: RefObject<HTMLDivElement | null>;
  dragImageRef: RefObject<HTMLDivElement | null>;
  canEditTeam: (teamId: number) => boolean;
  onNewColumnChange: (value: string) => void;
  onAddColumn: () => void;
  onRemoveColumn: (title: string) => void;
  onOpenTaskCard: (type: "parent" | "subtask", id: number) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, subtask: PlannerSubtask, teamId: number) => void;
  onDragMove: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, column: string) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>, column: string) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, column: string) => void;
};

export default function KanbanTab({
  newColumn,
  columns,
  filteredSubtasks,
  draggingSubtaskId,
  dragOverColumn,
  dragPreview,
  dragPreviewElRef,
  dragImageRef,
  canEditTeam,
  onNewColumnChange,
  onAddColumn,
  onRemoveColumn,
  onOpenTaskCard,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanTabProps) {
  return (
    <div className="planner-stack">
      <div className="planner-card">
        <div className="planner-inline-form">
          <input value={newColumn} onChange={(event) => onNewColumnChange(event.target.value)} placeholder="Кастомный статус" />
          <button className="primary" onClick={onAddColumn}>
            Добавить
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {columns.map((column) => (
          <div key={column} className={`kanban-column${dragOverColumn === column ? " drag-over" : ""}`}>
            <div className="kanban-column-title">
              <span>{column}</span>
              <button className="kanban-column-remove" onClick={() => onRemoveColumn(column)} title="Удалить колонку" aria-label="Удалить колонку">
                {"\u00d7"}
              </button>
            </div>

            <div className="kanban-column-body" onDragOver={(event) => onDragOver(event, column)} onDragLeave={(event) => onDragLeave(event, column)} onDrop={(event) => onDrop(event, column)}>
              {filteredSubtasks
                .filter((subtask) => subtask.inSprint && subtask.status === column)
                .map((subtask) => (
                  <div
                    key={subtask.id}
                    className={`kanban-card${draggingSubtaskId === subtask.id ? " dragging" : ""}`}
                    draggable={canEditTeam(subtask.teamId)}
                    onDragStart={(event) => onDragStart(event, subtask, subtask.teamId)}
                    onDrag={onDragMove}
                    onDragEnd={onDragEnd}
                    onClick={() => {
                      if (draggingSubtaskId != null) return;
                      onOpenTaskCard("subtask", subtask.id);
                    }}
                  >
                    <div className="kanban-card-title">{subtask.title}</div>
                    <div className="kanban-card-meta">
                      {subtask.startDate} — {subtask.endDate}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {dragPreview && (
        <div
          className="kanban-card drag-preview"
          ref={dragPreviewElRef}
          style={{
            width: dragPreview.width,
            transform: `translate3d(${dragPreview.x}px, ${dragPreview.y}px, 0) rotate(${dragPreview.tilt}deg)`,
          }}
        >
          <div className="kanban-card-title">{dragPreview.subtask.title}</div>
          <div className="kanban-card-meta">
            {dragPreview.subtask.startDate} — {dragPreview.subtask.endDate}
          </div>
        </div>
      )}

      <div ref={dragImageRef} className="kanban-drag-image" />
    </div>
  );
}
