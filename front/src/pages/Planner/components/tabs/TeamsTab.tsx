import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { PlannerState, PlannerTeam } from "../../../../types/planner";
import type { User } from "../../../../types/user";
import type { ApplicantsTreeNode, ProjectApplicantsGroup } from "../../planner.types";
import { fullName } from "../../planner.utils";
import AppButton from "../../../../components/UI/Button";
import AppInput from "../../../../components/UI/Input";
import AppSelect from "../../../../components/UI/Select";
import AppSwitch from "../../../../components/UI/Switch";

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
  onToggleEventVisibility: (eventId: number, enabled: boolean) => void;
  onSyncParticipants: () => void;
  onToggleApplicantForGroup: (groupKey: string, ownerId: number) => void;
  onTeamNameChange: (groupKey: string, value: string) => void;
  onTeamCuratorChange: (groupKey: string, value: string) => void;
  onCreateTeamFromGroup: (group: ProjectApplicantsGroup, teamNameOverride?: string) => void;
  onRenameTeam: (teamId: number, value: string) => void;
  onToggleTeamConfirmed: (teamId: number) => void;
  onOpenTeamInfo: (teamId: number) => void;
  onOpenTeamEdit: (teamId: number) => void;
  onDeleteTeam: (teamId: number) => void;
  sourceLabelForTeam: (team: PlannerTeam) => string;
};

function stopSummaryToggle(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

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
  onToggleEventVisibility,
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
  const teamNameDraftsRef = useRef<Record<string, string>>({});

  const updateTeamNameDraft = useCallback((groupKey: string, value: string) => {
    teamNameDraftsRef.current[groupKey] = value;
  }, []);

  const getTeamNameDraft = (groupKey: string) => teamNameDraftsRef.current[groupKey] ?? teamNameByGroup[groupKey] ?? "";

  const renderGroupCreator = (group: ProjectApplicantsGroup) => {
    if (group.applicants.length === 0) {
      return <div className="planner-empty-inline">По этому проекту пока нет доступных участников для формирования команды.</div>;
    }

    return (
      <>
        <div className="planner-members-grid">
          {group.applicants.map((applicant) => (
            <label key={`${group.key}:${applicant.ownerId}`} className="planner-check planner-applicant-row">
              <AppSwitch
                checked={(selectedApplicantsByGroup[group.key] || []).includes(applicant.ownerId)}
                onChange={() => onToggleApplicantForGroup(group.key, applicant.ownerId)}
                compact
              />
              <span>
                {applicant.name}
                {applicant.status ? ` (${applicant.status})` : ""}
              </span>
            </label>
          ))}
        </div>

        <div className="planner-grid planner-grid--team-from-project">
          <TeamNameDraftInput
            groupKey={group.key}
            value={teamNameByGroup[group.key] || ""}
            onDraftChange={updateTeamNameDraft}
            onCommit={onTeamNameChange}
            placeholder="Название команды"
          />

          <AppSelect
            value={teamCuratorByGroup[group.key] || ""}
            onChange={(value) => onTeamCuratorChange(group.key, String(value))}
            options={[
              { value: "", label: "Куратор (из заявок мероприятия)", disabled: true },
              ...(!group.applicants.some((applicant) => Number(applicant.ownerId) === Number(currentUser.id))
                ? [
                    {
                      value: String(currentUser.id),
                      label: `Организатор: ${fullName(currentUser) || currentUser.email || `ID ${currentUser.id}`}`,
                    },
                  ]
                : []),
              ...group.applicants.map((applicant) => ({
                value: String(applicant.ownerId),
                label: applicant.name,
              })),
            ]}
          />

          <AppButton className="primary" type="button" onClick={() => onCreateTeamFromGroup(group, getTeamNameDraft(group.key))}>
            Сформировать команду
          </AppButton>
        </div>
      </>
    );
  };

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
              <AppButton className="primary" type="button" onClick={onSyncParticipants}>
                Синхронизировать участников
              </AppButton>
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
              applicantsTree.map((eventNode) => {
                const eventId = typeof eventNode.eventId === "number" ? eventNode.eventId : null;
                const isVisibleInTeams = !eventNode.eventHidden;
                const switchControl = (
                  <div className="planner-source-switch" onClick={stopSummaryToggle}>
                    <span>В списке команд</span>
                    <AppSwitch
                      checked={isVisibleInTeams}
                      disabled={!eventId}
                      onChange={(checked) => {
                        if (!eventId) return;
                        onToggleEventVisibility(eventId, checked);
                      }}
                      compact
                    />
                  </div>
                );

                if (!isVisibleInTeams) {
                  return (
                    <div key={eventNode.key} className="planner-source-node planner-source-node--event planner-source-node--disabled">
                      <div className="planner-source-summary planner-source-summary--static">
                        <div className="planner-source-summary-main">
                          <span>Мероприятие: {eventNode.title}</span>
                        </div>

                        <div className="planner-source-summary-actions">
                          <span className="planner-source-meta planner-source-meta--muted">Скрыто из списка команд</span>
                          {switchControl}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
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
                          eventId && (
                            <AppButton
                              type="button"
                              className="planner-source-close-btn"
                              onClick={(event) => {
                                stopSummaryToggle(event);
                                onOpenConfirmCloseEnrollment(eventId, eventNode.title);
                              }}
                            >
                              Завершить набор
                            </AppButton>
                          )
                        )}

                        {switchControl}
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

                                <div className="planner-source-content">{renderGroupCreator(group)}</div>
                              </details>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                );
              })
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
                  <AppInput
                    value={team.name}
                    disabled={team.confirmed}
                    title={team.confirmed ? "Чтобы изменить название, сначала сними подтверждение команды" : undefined}
                    onChange={(event) => onRenameTeam(team.id, event.target.value)}
                  />
                ) : (
                  <div className="team-title">{team.name}</div>
                )}

                {isOrganizer ? (
                  <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>{team.confirmed ? "Подтверждена" : "Черновик"}</div>
                ) : (
                  <div className="team-badge-stack">
                    <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>{team.confirmed ? "Подтверждена" : "Черновик"}</div>
                    <AppButton className="info-icon-btn" type="button" onClick={() => onOpenTeamInfo(team.id)} aria-label="Информация о команде">
                      <InfoCircleOutlined />
                    </AppButton>
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
                  <AppButton className="primary" type="button" onClick={() => onToggleTeamConfirmed(team.id)}>
                    {team.confirmed ? "Снять подтверждение" : "Подтвердить"}
                  </AppButton>
                  <AppButton className="link-btn" type="button" onClick={() => onOpenTeamEdit(team.id)}>
                    Состав
                  </AppButton>
                  <AppButton className="danger-outline" type="button" onClick={() => onDeleteTeam(team.id)}>
                    Удалить
                  </AppButton>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type TeamNameDraftInputProps = {
  groupKey: string;
  value: string;
  placeholder: string;
  onDraftChange: (groupKey: string, value: string) => void;
  onCommit: (groupKey: string, value: string) => void;
};

const TeamNameDraftInput = memo(function TeamNameDraftInput({
  groupKey,
  value,
  placeholder,
  onDraftChange,
  onCommit,
}: TeamNameDraftInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
    onDraftChange(groupKey, value);
  }, [groupKey, onDraftChange, value]);

  const commitDraft = () => {
    onCommit(groupKey, draft);
  };

  return (
    <AppInput
      className="team-name-draft-input"
      value={draft}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        onDraftChange(groupKey, nextValue);
      }}
      onBlur={commitDraft}
      placeholder={placeholder}
    />
  );
});
