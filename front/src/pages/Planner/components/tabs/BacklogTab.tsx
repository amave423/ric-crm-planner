import type { Dispatch, SetStateAction } from "react";
import DateField from "../../../../components/UI/DateField";
import type { PlannerParentTask, PlannerSubtask } from "../../../../types/planner";
import type { ParentEditDraft, SubtaskEditDraft } from "../../planner.types";
import AppButton from "../../../../components/UI/Button";
import AppInput from "../../../../components/UI/Input";
import AppSelect from "../../../../components/UI/Select";
import AppSwitch from "../../../../components/UI/Switch";

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
  onSubAssigneeChange: (value: string) => void;
  onSubTitleChange: (value: string) => void;
  onSubStartChange: (value: string) => void;
  onSubEndChange: (value: string) => void;
  onSubInSprintChange: (value: boolean) => void;
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

const getInitials = (label: string) => {
  const name = label.split(/[—-]/)[0]?.trim() || label.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const getSubtaskAssignee = (subtask: PlannerSubtask, displayAssigneeLabel: (id: number) => string) => {
  if (subtask.assigneeId) return displayAssigneeLabel(subtask.assigneeId);
  return subtask.role || "Не назначен";
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
  onSubAssigneeChange,
  onSubTitleChange,
  onSubStartChange,
  onSubEndChange,
  onSubInSprintChange,
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
  const selectedParentSubtasks = filteredSubtasks.filter((subtask) => Number(subtask.parentTaskId) === Number(selectedParentId));
  const selectedParentSprintCount = selectedParentSubtasks.filter((subtask) => subtask.inSprint).length;
  const getParentSubtasks = (parentId: number) =>
    filteredSubtasks.filter((subtask) => Number(subtask.parentTaskId) === Number(parentId));

  return (
    <div className="planner-stack backlog-layout">
      <div className="planner-card backlog-panel backlog-panel--parents">
        <div className="backlog-section-head">
          <div>
            <div className="backlog-eyebrow">Бэклог команды</div>
            <h3 className="h3">Большие задачи</h3>
            <div className="planner-current-team">
              Команда: <strong>{activeTeamName || "Не выбрана"}</strong>
            </div>
          </div>
          <div className="backlog-summary">
            <span>{filteredParents.length} задач</span>
            <span>{filteredSubtasks.length} подзадач</span>
          </div>
        </div>

        <div className="backlog-create-panel">
          <div className="backlog-create-copy">
            <strong>Новая большая задача</strong>
            <span>Задай общий срок, а потом добавь подзадачи под участников команды.</span>
          </div>
          <div className="planner-grid planner-grid--parent-create backlog-parent-create">
            <label className="planner-label">
              Название
              <AppInput value={parentTitle} onChange={(event) => onParentTitleChange(event.target.value)} placeholder="Например: Сделать MVP" />
            </label>
            <label className="planner-label">
              Дата начала
              <DateField value={parentStart} onChange={onParentStartChange} />
            </label>
            <label className="planner-label">
              Дата окончания
              <DateField value={parentEnd} onChange={onParentEndChange} />
            </label>
            <AppButton className="primary backlog-add-parent" type="button" onClick={onAddParentTask}>
              Добавить большую задачу
            </AppButton>
          </div>
        </div>

        <div className="backlog-list">
          {filteredParents.length === 0 && <div className="planner-empty-inline">Пока нет больших задач для выбранной команды.</div>}

          {filteredParents.map((parent, index) => {
            const parentSubtasks = getParentSubtasks(parent.id);
            const parentSprintCount = parentSubtasks.filter((subtask) => subtask.inSprint).length;
            const isActive = selectedParentId === parent.id;

            return (
              <div key={parent.id} className={`backlog-parent ${isActive ? "active" : ""}`}>
                <div className="backlog-parent-index">{String(index + 1).padStart(2, "0")}</div>

                <div className="backlog-parent-main" onClick={() => (editingParentId !== parent.id ? onSelectParent(parent.id) : undefined)}>
                  {editingParentId === parent.id && editingParentDraft ? (
                    <div className="planner-inline-edit backlog-edit-form">
                      <AppInput
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
                      {isActive && (
                        <div className="backlog-parent-kicker">
                          <span className="is-current">Выбрана</span>
                        </div>
                      )}
                      <div className="title">{parent.title}</div>
                      <div className="meta backlog-date-row">
                        <span>
                          <small>Старт</small>
                          {parent.startDate}
                        </span>
                        <span>
                          <small>Финиш</small>
                          {parent.endDate}
                        </span>
                        <span>
                          <small>В спринте</small>
                          {parentSprintCount}/{parentSubtasks.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="planner-item-actions backlog-actions">
                  <AppButton className="link-btn" type="button" onClick={() => onOpenTaskCard("parent", parent.id)}>
                    Карточка
                  </AppButton>
                  {canEditTeam(parent.teamId) && (
                    <>
                      {editingParentId === parent.id ? (
                        <>
                          <AppButton className="link-btn" type="button" onClick={onSaveEditedParent}>
                            Сохранить
                          </AppButton>
                          <AppButton className="link-btn" type="button" onClick={onCancelEditParent}>
                            Отмена
                          </AppButton>
                        </>
                      ) : (
                        <AppButton className="link-btn" type="button" onClick={() => onStartEditParent(parent.id)}>
                          Редактировать
                        </AppButton>
                      )}
                      <AppButton className="link-btn danger" type="button" onClick={() => onDeleteParent(parent.id)}>
                        Удалить
                      </AppButton>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="planner-card backlog-panel backlog-panel--subtasks">
        <div className="backlog-section-head">
          <div>
            <h3 className="h3">Подзадачи</h3>
            <div className="backlog-selected-parent">
              {selectedParent ? selectedParent.title : "Выбери большую задачу, чтобы добавить подзадачи"}
            </div>
          </div>
          <div className="backlog-summary">
            <span>{selectedParentSubtasks.length} подзадач</span>
            <span>{selectedParentSprintCount} в спринте</span>
          </div>
        </div>

        {selectedParent ? (
          <div className="backlog-create-panel backlog-create-panel--subtask">
            <div className="planner-grid planner-grid--4 backlog-subtask-create">
              <label className="planner-label">
                Ответственный
                <AppSelect
                  value={subAssigneeId || ""}
                  onChange={(value) => onSubAssigneeChange(String(value))}
                  disabled={selectedTeamMembers.length === 0}
                  options={[
                    { value: "", label: "Ответственный", disabled: true },
                    ...selectedTeamMembers.map((id) => ({
                      value: String(id),
                      label: displayAssigneeLabel(Number(id)),
                    })),
                  ]}
                />
              </label>

              <label className="planner-label backlog-subtask-title-field">
                Подзадача
                <AppInput value={subTitle} onChange={(event) => onSubTitleChange(event.target.value)} placeholder="Что нужно сделать" />
              </label>

              <label className="planner-label">
                Дата начала
                <DateField value={subStart} onChange={onSubStartChange} />
              </label>

              <label className="planner-label">
                Дата окончания
                <DateField value={subEnd} onChange={onSubEndChange} />
              </label>

              <label className="planner-check backlog-sprint-toggle">
                <span>В спринт</span>
                <AppSwitch checked={subInSprint} onChange={onSubInSprintChange} compact />
              </label>

              <AppButton className="primary backlog-add-subtask" type="button" onClick={onAddSubtask}>
                Добавить подзадачу
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="planner-empty-inline">Сначала выбери большую задачу в левом списке.</div>
        )}

        <div className="subtask-list">
          {selectedParent && selectedParentSubtasks.length === 0 && (
            <div className="planner-empty-inline">У выбранной большой задачи пока нет подзадач.</div>
          )}

          {selectedParentSubtasks.map((subtask) => {
            const assigneeLabel = getSubtaskAssignee(subtask, displayAssigneeLabel);

            return (
              <div key={subtask.id} className={`subtask-item ${subtask.inSprint ? "is-in-sprint" : ""}`}>
                <div className="subtask-main">
                  {editingSubtaskId === subtask.id && editingSubtaskDraft ? (
                    <div className="planner-inline-edit backlog-edit-form">
                      <div className="planner-inline-edit-row">
                        <AppSelect
                          value={editingSubtaskDraft.assigneeId != null ? String(editingSubtaskDraft.assigneeId) : ""}
                          onChange={(value) =>
                            setEditingSubtaskDraft((prev) => (prev ? { ...prev, assigneeId: Number(value) } : prev))
                          }
                          options={[
                            { value: "", label: "Ответственный", disabled: true },
                            ...getTeamMemberIds(subtask.teamId).map((id) => ({
                              value: String(id),
                              label: displayAssigneeLabel(Number(id)),
                            })),
                          ]}
                        />

                        <AppInput
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
                      </div>

                      <label className="planner-check">
                        <span>В спринт</span>
                        <AppSwitch
                          checked={editingSubtaskDraft.inSprint}
                          onChange={(checked) =>
                            setEditingSubtaskDraft((prev) => (prev ? { ...prev, inSprint: checked } : prev))
                          }
                          compact
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="subtask-headline">
                        <span className={`subtask-status ${subtask.inSprint ? "is-sprint" : ""}`}>{subtask.status}</span>
                        {subtask.inSprint && <span className="subtask-sprint-badge">Канбан</span>}
                      </div>
                      <div className="title">{subtask.title}</div>
                      <div className="meta subtask-meta-grid">
                        <span className="subtask-assignee">
                          <span className="subtask-avatar">{getInitials(assigneeLabel)}</span>
                          {assigneeLabel}
                        </span>
                        <span>
                          <small>Срок</small>
                          {subtask.startDate} - {subtask.endDate}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="planner-item-actions backlog-actions">
                  <AppButton className="link-btn" type="button" onClick={() => onOpenTaskCard("subtask", subtask.id)}>
                    Карточка
                  </AppButton>
                  {canEditTeam(subtask.teamId) && (
                    <>
                      {editingSubtaskId === subtask.id ? (
                        <>
                          <AppButton className="link-btn" type="button" onClick={onSaveEditedSubtask}>
                            Сохранить
                          </AppButton>
                          <AppButton className="link-btn" type="button" onClick={onCancelEditSubtask}>
                            Отмена
                          </AppButton>
                        </>
                      ) : (
                        <AppButton className="link-btn" type="button" onClick={() => onStartEditSubtask(subtask.id)}>
                          Редактировать
                        </AppButton>
                      )}
                      <AppButton className="link-btn danger" type="button" onClick={() => onDeleteSubtask(subtask.id)}>
                        Удалить
                      </AppButton>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
