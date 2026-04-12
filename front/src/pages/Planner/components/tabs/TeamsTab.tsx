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
  onOpenConfirmCloseEnrollment: (eventId: number, eventTitle: string) => void;
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
  const hasClosedEvents = state.closedEventIds.length > 0;

  return (
    <div className={`teams-layout ${!isOrganizer ? "teams-layout--single" : ""}`}>
      {isOrganizer && (
        <section className="planner-card teams-panel teams-panel--builder">
          <div className="teams-panel-head">
            <div>
              <div className="teams-eyebrow">Работа с заявками</div>
              <h3 className="h3">Формирование команд</h3>
              <p>Выбери проектантов по заявкам мероприятия, задай название команды и назначь куратора.</p>
            </div>

            {hasClosedEvents && (
              <button className="primary" type="button" onClick={onSyncParticipants}>
                Синхронизировать участников
              </button>
            )}
          </div>

          {hasClosedEvents && (
            <div className="planner-note teams-note">
              Для мероприятий с завершённым набором в планировщике остаются только участники со статусом «Приступил к ПШ».
            </div>
          )}

          <div className="planner-source-tree">
            {applicantsTree.length === 0 ? (
              <div className="planner-empty-inline">Нет заявок для формирования команд.</div>
            ) : (
              applicantsTree.map((eventNode) => (
                <details key={eventNode.key} className="planner-source-node planner-source-node--event" open>
                  <summary className="planner-source-summary">
                    <div className="planner-source-summary-main">
                      <span>Мероприятие: {eventNode.title}</span>
                    </div>

                    <div className="planner-source-summary-actions">
                      {eventNode.eventClosed ? (
                        <span className="planner-source-meta planner-source-meta--closed">Набор завершён</span>
                      ) : (
                        isOrganizer &&
                        eventNode.eventId && (
                          <button
                            type="button"
                            className="planner-source-close-btn"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onOpenConfirmCloseEnrollment(eventNode.eventId!, eventNode.title);
                            }}
                          >
                            Завершить набор
                          </button>
                        )
                      )}
                    </div>
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
                                {group.applicants.length === 0 ? (
                                  <div className="planner-empty-inline">По этому проекту пока нет доступных участников для формирования команды.</div>
                                ) : (
                                  <>
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
                                        placeholder="Название команды"
                                      />

                                      <select value={teamCuratorByGroup[group.key] || ""} onChange={(event) => onTeamCuratorChange(group.key, event.target.value)}>
                                        <option value="" disabled>
                                          Куратор (из заявок мероприятия)
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

                                      <button className="primary" type="button" onClick={() => onCreateTeamFromGroup(group)}>
                                        Сформировать команду
                                      </button>
                                    </div>
                                  </>
                                )}
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
        </section>
      )}

      <section className="planner-card teams-panel teams-panel--created">
        <div className="teams-panel-head teams-panel-head--compact">
          <div>
            <div className="teams-eyebrow">Готовый список</div>
            <h3 className="h3">Сформированные команды</h3>
            <p>{visibleTeams.length ? `${visibleTeams.length} команд` : "Пока нет созданных команд"}</p>
          </div>
        </div>

        <div className="teams-list">
          {visibleTeams.length === 0 && <div className="planner-empty-inline">Команды появятся здесь после формирования.</div>}

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
                    <button className="info-icon-btn" type="button" onClick={() => onOpenTeamInfo(team.id)} aria-label="Информация о команде">
                      <img src={infoIcon} alt="info" />
                    </button>
                  </div>
                )}
              </div>

              <div className="team-meta-grid">
                <div className="team-value">
                  <span>Куратор</span>
                  {team.curatorId ? userNameById.get(team.curatorId) || `ID ${team.curatorId}` : "-"}
                </div>
                <div className="team-value">
                  <span>Участники</span>
                  {team.memberIds.length}
                </div>
              </div>

              {sourceLabelForTeam(team) && (
                <div className="team-value team-value--source">
                  <span>Источник</span>
                  {sourceLabelForTeam(team)}
                </div>
              )}

              {isOrganizer && (
                <div className="team-actions">
                  <button className="primary" type="button" onClick={() => onToggleTeamConfirmed(team.id)}>
                    {team.confirmed ? "Снять подтверждение" : "Подтвердить"}
                  </button>
                  <button className="link-btn" type="button" onClick={() => onOpenTeamEdit(team.id)}>
                    Состав
                  </button>
                  <button className="danger-outline" type="button" onClick={() => onDeleteTeam(team.id)}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
