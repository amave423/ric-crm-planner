import type { Dispatch, SetStateAction } from "react";
import DateField from "../../../../components/UI/DateField";
import type { PlannerParentTask, PlannerSubtask } from "../../../../types/planner";
import type { ParentEditDraft, SubtaskEditDraft } from "../../planner.types";

type BacklogTabProps = {
  activeTeamName: string;
  parentTitle: string;
  parentStart: string;
  parentEnd: string;
  onParentTitleChange: (value: string) => void;
  onParentStartChange: (value: string) => void;
  onParentEndChange: (value: string) => void;
  onAddParentTask: () => void;
  filteredParents: PlannerParentTask[];
  selectedParentId: number | null;
  onSelectParent: (parentId: number) => void;
  editingParentId: number | null;
  editingParentDraft: ParentEditDraft | null;
  setEditingParentDraft: Dispatch<SetStateAction<ParentEditDraft | null>>;
  onOpenTaskCard: (type: "parent" | "subtask", id: number) => void;
  onStartEditParent: (parentId: number) => void;
  onSaveEditedParent: () => void;
  onCancelEditParent: () => void;
  onDeleteParent: (parentId: number) => void;
  canEditTeam: (teamId: number) => boolean;
  selectedParent?: PlannerParentTask;
  selectedTeamMembers: number[];
  subAssigneeId: string;
  subTitle: string;
  subStart: string;
  subEnd: string;
  subInSprint: boolean;
  subStatus: string;
  columns: string[];
  onSubAssigneeChange: (value: string) => void;
  onSubTitleChange: (value: string) => void;
  onSubStartChange: (value: string) => void;
  onSubEndChange: (value: string) => void;
  onSubInSprintChange: (value: boolean) => void;
  onSubStatusChange: (value: string) => void;
  onAddSubtask: () => void;
  filteredSubtasks: PlannerSubtask[];
  editingSubtaskId: number | null;
  editingSubtaskDraft: SubtaskEditDraft | null;
  setEditingSubtaskDraft: Dispatch<SetStateAction<SubtaskEditDraft | null>>;
  getTeamMemberIds: (teamId: number) => number[];
  displayAssigneeLabel: (id: number) => string;
  onStartEditSubtask: (subtaskId: number) => void;
  onSaveEditedSubtask: () => void;
  onCancelEditSubtask: () => void;
  onDeleteSubtask: (subtaskId: number) => void;
};

export default function BacklogTab({
  activeTeamName,
  parentTitle,
  parentStart,
  parentEnd,
  onParentTitleChange,
  onParentStartChange,
  onParentEndChange,
  onAddParentTask,
  filteredParents,
  selectedParentId,
  onSelectParent,
  editingParentId,
  editingParentDraft,
  setEditingParentDraft,
  onOpenTaskCard,
  onStartEditParent,
  onSaveEditedParent,
  onCancelEditParent,
  onDeleteParent,
  canEditTeam,
  selectedParent,
  selectedTeamMembers,
  subAssigneeId,
  subTitle,
  subStart,
  subEnd,
  subInSprint,
  subStatus,
  columns,
  onSubAssigneeChange,
  onSubTitleChange,
  onSubStartChange,
  onSubEndChange,
  onSubInSprintChange,
  onSubStatusChange,
  onAddSubtask,
  filteredSubtasks,
  editingSubtaskId,
  editingSubtaskDraft,
  setEditingSubtaskDraft,
  getTeamMemberIds,
  displayAssigneeLabel,
  onStartEditSubtask,
  onSaveEditedSubtask,
  onCancelEditSubtask,
  onDeleteSubtask,
}: BacklogTabProps) {
  return (
    <div className="planner-stack">
      <div className="planner-card">
        <div className="planner-current-team">
          Команда: <strong>{activeTeamName || "Не выбрана"}</strong>
        </div>

        <div className="planner-grid planner-grid--parent-create">
          <input value={parentTitle} onChange={(event) => onParentTitleChange(event.target.value)} placeholder="Большая задача" />
          <DateField value={parentStart} onChange={onParentStartChange} />
          <DateField value={parentEnd} onChange={onParentEndChange} />
          <button className="primary" onClick={onAddParentTask}>
            Добавить большую задачу
          </button>
        </div>

        <div className="backlog-list">
          {filteredParents.map((parent) => (
            <div key={parent.id} className={`backlog-parent ${selectedParentId === parent.id ? "active" : ""}`}>
              <div className="backlog-parent-main" onClick={() => (editingParentId !== parent.id ? onSelectParent(parent.id) : undefined)}>
                {editingParentId === parent.id && editingParentDraft ? (
                  <div className="planner-inline-edit">
                    <input
                      value={editingParentDraft.title}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setEditingParentDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                      }
                    />
                    <div className="planner-inline-edit-row">
                      <div onClick={(event) => event.stopPropagation()}>
                        <DateField
                          value={editingParentDraft.startDate}
                          onChange={(date) => setEditingParentDraft((prev) => (prev ? { ...prev, startDate: date } : prev))}
                        />
                      </div>
                      <div onClick={(event) => event.stopPropagation()}>
                        <DateField
                          value={editingParentDraft.endDate}
                          onChange={(date) => setEditingParentDraft((prev) => (prev ? { ...prev, endDate: date } : prev))}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="title">{parent.title}</div>
                    <div className="meta">
                      <span>{parent.startDate}</span>
                      <span>{parent.endDate}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="planner-item-actions">
                <button className="link-btn" onClick={() => onOpenTaskCard("parent", parent.id)}>
                  Карточка
                </button>
                {canEditTeam(parent.teamId) && (
                  <>
                    {editingParentId === parent.id ? (
                      <>
                        <button className="link-btn" onClick={onSaveEditedParent}>
                          Сохранить
                        </button>
                        <button className="link-btn" onClick={onCancelEditParent}>
                          Отмена
                        </button>
                      </>
                    ) : (
                      <button className="link-btn" onClick={() => onStartEditParent(parent.id)}>
                        Редактировать
                      </button>
                    )}
                    <button className="link-btn danger" onClick={() => onDeleteParent(parent.id)}>
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="planner-card">
        <h3 className="h3">Подзадачи</h3>

        {selectedParent && (
          <div className="planner-grid planner-grid--4">
            <select value={subAssigneeId} onChange={(event) => onSubAssigneeChange(event.target.value)} disabled={selectedTeamMembers.length === 0}>
              <option value="" disabled>
                Ответственный
              </option>
              {selectedTeamMembers.map((id) => (
                <option key={`assignee-${id}`} value={String(id)}>
                  {displayAssigneeLabel(Number(id))}
                </option>
              ))}
            </select>

            <input value={subTitle} onChange={(event) => onSubTitleChange(event.target.value)} placeholder="Подзадача" />
            <DateField value={subStart} onChange={onSubStartChange} />
            <DateField value={subEnd} onChange={onSubEndChange} />

            <label className="planner-check planner-check--inline">
              <input type="checkbox" checked={subInSprint} onChange={(event) => onSubInSprintChange(event.target.checked)} />
              <span>В спринт</span>
            </label>

            {subInSprint && (
              <select value={subStatus} onChange={(event) => onSubStatusChange(event.target.value)}>
                {columns.map((column) => (
                  <option key={column}>{column}</option>
                ))}
              </select>
            )}

            <button className="primary" onClick={onAddSubtask}>
              Добавить подзадачу
            </button>
          </div>
        )}

        <div className="subtask-list">
          {filteredSubtasks
            .filter((subtask) => Number(subtask.parentTaskId) === Number(selectedParentId))
            .map((subtask) => (
              <div key={subtask.id} className="subtask-item">
                <div className="subtask-main">
                  {editingSubtaskId === subtask.id && editingSubtaskDraft ? (
                    <div className="planner-inline-edit">
                      <div className="planner-inline-edit-row">
                        <select
                          value={editingSubtaskDraft.assigneeId ?? ""}
                          onChange={(event) =>
                            setEditingSubtaskDraft((prev) => (prev ? { ...prev, assigneeId: Number(event.target.value) } : prev))
                          }
                        >
                          <option value="" disabled>
                            Ответственный
                          </option>
                          {getTeamMemberIds(subtask.teamId).map((id) => (
                            <option key={`edit-assignee-${subtask.id}-${id}`} value={String(id)}>
                              {displayAssigneeLabel(Number(id))}
                            </option>
                          ))}
                        </select>

                        <input
                          value={editingSubtaskDraft.title}
                          onChange={(event) =>
                            setEditingSubtaskDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                          }
                          placeholder="Подзадача"
                        />
                      </div>

                      <div className="planner-inline-edit-row">
                        <DateField
                          value={editingSubtaskDraft.startDate}
                          onChange={(date) => setEditingSubtaskDraft((prev) => (prev ? { ...prev, startDate: date } : prev))}
                        />
                        <DateField
                          value={editingSubtaskDraft.endDate}
                          onChange={(date) => setEditingSubtaskDraft((prev) => (prev ? { ...prev, endDate: date } : prev))}
                        />
                        {editingSubtaskDraft.inSprint && (
                          <select
                            value={editingSubtaskDraft.status}
                            onChange={(event) =>
                              setEditingSubtaskDraft((prev) => (prev ? { ...prev, status: event.target.value } : prev))
                            }
                          >
                            {columns.map((column) => (
                              <option key={column}>{column}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <label className="planner-check">
                        <input
                          type="checkbox"
                          checked={editingSubtaskDraft.inSprint}
                          onChange={(event) =>
                            setEditingSubtaskDraft((prev) => (prev ? { ...prev, inSprint: event.target.checked } : prev))
                          }
                        />
                        <span>В спринт</span>
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="title">{subtask.title}</div>
                      <div className="meta">
                        <span>{subtask.assigneeId ? displayAssigneeLabel(subtask.assigneeId) : subtask.role}</span>
                        <span>
                          {subtask.startDate} — {subtask.endDate}
                        </span>
                        <span>{subtask.status}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="planner-item-actions">
                  <button className="link-btn" onClick={() => onOpenTaskCard("subtask", subtask.id)}>
                    Карточка
                  </button>
                  {canEditTeam(subtask.teamId) && (
                    <>
                      {editingSubtaskId === subtask.id ? (
                        <>
                          <button className="link-btn" onClick={onSaveEditedSubtask}>
                            Сохранить
                          </button>
                          <button className="link-btn" onClick={onCancelEditSubtask}>
                            Отмена
                          </button>
                        </>
                      ) : (
                        <button className="link-btn" onClick={() => onStartEditSubtask(subtask.id)}>
                          Редактировать
                        </button>
                      )}
                      <button className="link-btn danger" onClick={() => onDeleteSubtask(subtask.id)}>
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
