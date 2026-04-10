import infoIcon from "../../../../assets/icons/info.svg";
import type { PlannerState, PlannerTeam } from "../../../../types/planner";
import type { User } from "../../../../types/user";
import type { ApplicantsTreeNode, ProjectApplicantsGroup } from "../../planner.types";
import { fullName } from "../../planner.utils";

type TeamsTabProps = {
  isOrganizer: boolean;
  state: PlannerState;
  applicantsTree: ApplicantsTreeNode[];
  selectedApplicantsByGroup: Record<string, number[]>;
  teamNameByGroup: Record<string, string>;
  teamCuratorByGroup: Record<string, string>;
  currentUser: User;
  visibleTeams: PlannerTeam[];
  userNameById: Map<number, string>;
  onOpenConfirmCloseEnrollment: () => void;
  onSyncParticipants: () => void;
  onToggleApplicantForGroup: (groupKey: string, ownerId: number) => void;
  onTeamNameChange: (groupKey: string, value: string) => void;
  onTeamCuratorChange: (groupKey: string, value: string) => void;
  onCreateTeamFromGroup: (group: ProjectApplicantsGroup) => void;
  onRenameTeam: (teamId: number, value: string) => void;
  onToggleTeamConfirmed: (teamId: number) => void;
  onOpenTeamInfo: (teamId: number) => void;
  onOpenTeamEdit: (teamId: number) => void;
  onDeleteTeam: (teamId: number) => void;
  sourceLabelForTeam: (team: PlannerTeam) => string;
};

export default function TeamsTab({
  isOrganizer,
  state,
  applicantsTree,
  selectedApplicantsByGroup,
  teamNameByGroup,
  teamCuratorByGroup,
  currentUser,
  visibleTeams,
  userNameById,
  onOpenConfirmCloseEnrollment,
  onSyncParticipants,
  onToggleApplicantForGroup,
  onTeamNameChange,
  onTeamCuratorChange,
  onCreateTeamFromGroup,
  onRenameTeam,
  onToggleTeamConfirmed,
  onOpenTeamInfo,
  onOpenTeamEdit,
  onDeleteTeam,
  sourceLabelForTeam,
}: TeamsTabProps) {
  return (
    <div className="planner-card">
      {isOrganizer && (
        <div className="planner-row planner-row--right">
          {!state.enrollmentClosed ? (
            <button className="primary" onClick={onOpenConfirmCloseEnrollment}>
              Завершить набор
            </button>
          ) : (
            <button className="primary" onClick={onSyncParticipants}>
              Синхронизировать участников
            </button>
          )}
        </div>
      )}

      {isOrganizer && state.enrollmentClosed && (
        <div className="planner-note">Список участников обновляется по заявкам со статусом «Приступил к ПШ».</div>
      )}

      {isOrganizer && (
        <div className="planner-source-tree">
          {applicantsTree.length === 0 ? (
            <div className="planner-empty-inline">Нет заявок для формирования команд.</div>
          ) : (
            applicantsTree.map((eventNode) => (
              <details key={eventNode.key} className="planner-source-node planner-source-node--event" open>
                <summary className="planner-source-summary">
                  <span>Мероприятие: {eventNode.title}</span>
                </summary>

                <div className="planner-source-content">
                  {eventNode.directions.map((directionNode) => (
                    <details key={directionNode.key} className="planner-source-node planner-source-node--direction">
                      <summary className="planner-source-summary">
                        <span>Направление: {directionNode.title}</span>
                      </summary>

                      <div className="planner-source-content">
                        {directionNode.projects.map((group) => (
                          <details key={group.key} className="planner-source-node planner-source-node--project">
                            <summary className="planner-source-summary">
                              <span>Проект: {group.projectTitle}</span>
                              <span className="planner-source-meta">{group.applicants.length} заявок</span>
                            </summary>

                            <div className="planner-source-content">
                              <div className="planner-members-grid">
                                {group.applicants.map((applicant) => (
                                  <label key={`${group.key}:${applicant.ownerId}`} className="planner-check planner-applicant-row">
                                    <input
                                      type="checkbox"
                                      checked={(selectedApplicantsByGroup[group.key] || []).includes(applicant.ownerId)}
                                      onChange={() => onToggleApplicantForGroup(group.key, applicant.ownerId)}
                                    />
                                    <span>
                                      {applicant.name}
                                      {applicant.status ? ` (${applicant.status})` : ""}
                                    </span>
                                  </label>
                                ))}
                              </div>

                              <div className="planner-grid planner-grid--team-from-project">
                                <input
                                  value={teamNameByGroup[group.key] || ""}
                                  onChange={(event) => onTeamNameChange(group.key, event.target.value)}
                                  placeholder="Название команды (обязательно)"
                                />

                                <select value={teamCuratorByGroup[group.key] || ""} onChange={(event) => onTeamCuratorChange(group.key, event.target.value)}>
                                  <option value="" disabled>
                                    Куратор (из заявок проекта)
                                  </option>
                                  {!group.applicants.some((applicant) => Number(applicant.ownerId) === Number(currentUser.id)) && (
                                    <option value={String(currentUser.id)}>
                                      Организатор: {fullName(currentUser) || currentUser.email || `ID ${currentUser.id}`}
                                    </option>
                                  )}
                                  {group.applicants.map((applicant) => (
                                    <option key={`${group.key}:curator:${applicant.ownerId}`} value={String(applicant.ownerId)}>
                                      {applicant.name}
                                    </option>
                                  ))}
                                </select>

                                <button className="primary" onClick={() => onCreateTeamFromGroup(group)}>
                                  Сформировать команду
                                </button>
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      )}

      <div className="teams-list">
        {visibleTeams.map((team) => (
          <div key={team.id} className="team-item">
            <div className="team-top">
              {isOrganizer ? (
                <input value={team.name} onChange={(event) => onRenameTeam(team.id, event.target.value)} />
              ) : (
                <div className="team-title">{team.name}</div>
              )}

              {isOrganizer ? (
                <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>{team.confirmed ? "Подтверждена" : "Черновик"}</div>
              ) : (
                <div className="team-badge-stack">
                  <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>{team.confirmed ? "Подтверждена" : "Черновик"}</div>
                  <button className="info-icon-btn" onClick={() => onOpenTeamInfo(team.id)} aria-label="Информация о команде">
                    <img src={infoIcon} alt="info" />
                  </button>
                </div>
              )}
            </div>

            <div className="team-value">Куратор: {team.curatorId ? userNameById.get(team.curatorId) || `ID ${team.curatorId}` : "—"}</div>
            <div className="team-value">Участники: {team.memberIds.length}</div>
            {sourceLabelForTeam(team) && <div className="team-value">Источник: {sourceLabelForTeam(team)}</div>}

            {isOrganizer && (
              <div className="team-actions">
                <button className="primary" onClick={() => onToggleTeamConfirmed(team.id)}>
                  {team.confirmed ? "Снять подтверждение" : "Подтвердить"}
                </button>
                <button className="link-btn" onClick={() => onOpenTeamEdit(team.id)}>
                  Состав
                </button>
                <button className="danger-outline" onClick={() => onDeleteTeam(team.id)}>
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
