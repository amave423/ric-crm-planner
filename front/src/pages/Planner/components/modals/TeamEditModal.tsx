import Modal from "../../../../components/Modal/Modal";
import type { PlannerTeam } from "../../../../types/planner";
import AppButton from "../../../../components/UI/Button";

type TeamEditModalProps = {
  isOpen: boolean;
  team: PlannerTeam | null;
  teamEditMembers: number[];
  candidateIds: number[];
  displayAssigneeLabel: (id: number) => string;
  onToggleMember: (id: number) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function TeamEditModal({
  isOpen,
  team,
  teamEditMembers,
  candidateIds,
  displayAssigneeLabel,
  onToggleMember,
  onClose,
  onSave,
}: TeamEditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактирование команды">
      <div className="confirm-body">
        {!team ? (
          <div className="confirm-text">Команда не выбрана.</div>
        ) : (
          <>
            <div className="confirm-text">{team.name || "Команда"}</div>
            <div className="planner-team-edit-meta">Участники: {teamEditMembers.length}</div>
            {candidateIds.length === 0 ? (
              <div className="planner-empty-inline">Нет участников для выбора.</div>
            ) : (
              <div className="planner-team-edit-list">
                {candidateIds.map((id) => (
                  <label key={`team-edit-${team.id}-${id}`} className="planner-check planner-applicant-row">
                    <input type="checkbox" checked={teamEditMembers.includes(id)} onChange={() => onToggleMember(id)} />
                    <span>{displayAssigneeLabel(id)}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="planner-team-edit-actions">
              <AppButton className="link-btn" onClick={onClose}>
                Отмена
              </AppButton>
              <AppButton className="primary" onClick={onSave}>
                Сохранить
              </AppButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
