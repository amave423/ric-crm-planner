import { useState } from "react";
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
  teamDirectionByGroup: Record<string, string>;
  teamProjectByGroup: Record<string, string>;
  activeTeamBuilderGroupKey: string;
  currentUser: User;
  visibleTeams: PlannerTeam[];
  userNameById: Map<number, string>;
  onOpenConfirmCloseEnrollment: (eventId: number, eventTitle: string) => void;
  onSendPlannerInvites: (eventId: number, eventTitle: string) => void;
  onToggleEventVisibility: (eventId: number, enabled: boolean) => void;
  onSyncParticipants: () => void;
  onToggleApplicantForGroup: (groupKey: string, ownerId: number) => void;
  onSelectBuilderGroup: (groupKey: string) => void;
  onTeamNameChange: (groupKey: string, value: string) => void;
  onTeamCuratorChange: (groupKey: string, value: string) => void;
  onTeamDirectionChange: (groupKey: string, value: string) => void;
  onTeamProjectChange: (groupKey: string, value: string) => void;
  onCreateTeamFromGroup: (group: ProjectApplicantsGroup, teamNameOverride?: string) => void;
  onRenameTeam: (teamId: number, value: string) => void;
  onToggleTeamConfirmed: (teamId: number) => void;
  onOpenTeamInfo: (teamId: number) => void;
  onOpenTeamEdit: (teamId: number) => void;
  onAssignTeamCurator: (teamId: number, curatorId: number) => void;
  onDeleteTeam: (teamId: number) => void;
  sourceLabelForTeam: (team: PlannerTeam) => string;
};

function stopSummaryToggle(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

const TEAM_EVENT_OPEN_STATE_KEY = "planner_team_event_open_state_v1";

function readTeamEventOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(TEAM_EVENT_OPEN_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTeamEventOpenState(value: Record<string, boolean>) {
  localStorage.setItem(TEAM_EVENT_OPEN_STATE_KEY, JSON.stringify(value));
}

export default function TeamsTab({
  isOrganizer,
  state,
  applicantsTree,
  selectedApplicantsByGroup,
  teamNameByGroup,
  teamCuratorByGroup,
  teamDirectionByGroup,
  teamProjectByGroup,
  activeTeamBuilderGroupKey,
  currentUser,
  visibleTeams,
  userNameById,
  onOpenConfirmCloseEnrollment,
  onSendPlannerInvites,
  onToggleEventVisibility,
  onSyncParticipants,
  onToggleApplicantForGroup,
  onSelectBuilderGroup,
  onTeamNameChange,
  onTeamCuratorChange,
  onTeamDirectionChange,
  onTeamProjectChange,
  onCreateTeamFromGroup,
  onRenameTeam,
  onToggleTeamConfirmed,
  onOpenTeamInfo,
  onOpenTeamEdit,
  onAssignTeamCurator,
  onDeleteTeam,
  sourceLabelForTeam,
}: TeamsTabProps) {
  const [eventOpenByKey, setEventOpenByKey] = useState<Record<string, boolean>>(() => readTeamEventOpenState());
  const [curatorEditTeamId, setCuratorEditTeamId] = useState<number | null>(null);
  const [curatorDraftByTeam, setCuratorDraftByTeam] = useState<Record<number, string>>({});
  const hasClosedEvents = state.closedEventIds.length > 0;
  const groups = applicantsTree.map((node) => node.group);
  const assignedOwnerIdsByEventId = new Map<number, Set<number>>();
  visibleTeams.forEach((team) => {
    const eventId = Number(team.eventId);
    if (!Number.isFinite(eventId) || eventId <= 0) return;
    const assignedIds = assignedOwnerIdsByEventId.get(eventId) || new Set<number>();
    team.memberIds.forEach((memberId) => assignedIds.add(Number(memberId)));
    assignedOwnerIdsByEventId.set(eventId, assignedIds);
  });
  const fallbackActiveGroup =
    groups.find((group) => (selectedApplicantsByGroup[group.key] || []).length > 0) || groups[0] || null;
  const activeGroup = groups.find((group) => group.key === activeTeamBuilderGroupKey) || fallbackActiveGroup;
  const activeSelectedIds = activeGroup ? selectedApplicantsByGroup[activeGroup.key] || [] : [];
  const activeSelectedApplicants = activeGroup
    ? activeGroup.applicants.filter((applicant) => activeSelectedIds.includes(applicant.ownerId))
    : [];
  const selectedDirectionId = activeGroup ? teamDirectionByGroup[activeGroup.key] || "" : "";
  const selectedProjectId = activeGroup ? teamProjectByGroup[activeGroup.key] || "" : "";
  const selectedDirection = activeGroup?.directionOptions.find((direction) => String(direction.id) === selectedDirectionId);
  const availableProjects = selectedDirection?.projects || [];

  const setEventOpen = (key: string, open: boolean) => {
    setEventOpenByKey((prev) => {
      const next = { ...prev, [key]: open };
      writeTeamEventOpenState(next);
      return next;
    });
  };

  const getCuratorName = (id: number) => {
    if (Number(id) === Number(currentUser.id)) {
      return fullName(currentUser) || currentUser.email || `ID ${currentUser.id}`;
    }

    return userNameById.get(Number(id)) || `РЈС‡Р°СЃС‚РЅРёРє #${id}`;
  };

  const getCuratorOptions = (team: PlannerTeam) => {
    const optionIds = new Set<number>();
    if (Number(currentUser.id)) optionIds.add(Number(currentUser.id));
    team.memberIds.forEach((memberId) => optionIds.add(Number(memberId)));

    return [
      { value: "", label: "Р’С‹Р±РµСЂРёС‚Рµ РєСѓСЂР°С‚РѕСЂР°", disabled: true },
      ...Array.from(optionIds).map((id) => ({
        value: String(id),
        label: Number(id) === Number(currentUser.id) ? `РћСЂРіР°РЅРёР·Р°С‚РѕСЂ: ${getCuratorName(id)}` : getCuratorName(id),
      })),
    ];
  };

  const submitTeamCurator = (teamId: number) => {
    const curatorId = Number(curatorDraftByTeam[teamId] || 0);
    if (!Number.isFinite(curatorId) || curatorId <= 0) return;

    onAssignTeamCurator(teamId, curatorId);
    setCuratorEditTeamId(null);
    setCuratorDraftByTeam((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  };

  const renderApplicantInfo = (applicant: ProjectApplicantsGroup["applicants"][number]) => (
    <div className={`planner-applicant-columns ${applicant.desiredDirections.length === 0 ? "planner-applicant-columns--compact" : ""}`}>
      <span className="planner-applicant-name">{applicant.name}</span>
      <span className="planner-applicant-specialization">{applicant.specialization || "Р‘РµР· СЃРїРµС†РёР°Р»РёР·Р°С†РёРё"}</span>
      {applicant.desiredDirections.length > 0 && (
        <span className="planner-applicant-directions">
          {applicant.desiredDirections.map((direction) => (
            <span key={`${applicant.ownerId}:${direction.id ?? direction.title}`}>{direction.title}</span>
          ))}
        </span>
      )}
    </div>
  );

  const renderApplicantHeader = (compact = false) => (
    <div className="planner-applicant-row planner-applicant-row--header" aria-hidden="true">
      <div className={`planner-applicant-columns planner-applicant-columns--header ${compact ? "planner-applicant-columns--compact" : ""}`}>
        <span>Р¤Р</span>
        <span>РЎРїРµС†РёР°Р»РёР·Р°С†РёСЏ</span>
        {!compact && <span>Р–РµР»Р°РµРјРѕРµ РЅР°РїСЂР°РІР»РµРЅРёРµ</span>}
      </div>
      <span className="planner-applicant-switch-placeholder" />
    </div>
  );

  const renderCreatedTeams = () => (
    <section className="teams-created-block">
      <div className="teams-panel-head teams-panel-head--compact">
        <div>
          <div className="teams-eyebrow">Р“РѕС‚РѕРІС‹Р№ СЃРїРёСЃРѕРє</div>
          <h3 className="h3">РЎС„РѕСЂРјРёСЂРѕРІР°РЅРЅС‹Рµ РєРѕРјР°РЅРґС‹</h3>
          <p>{visibleTeams.length ? `${visibleTeams.length} РєРѕРјР°РЅРґ` : "РџРѕРєР° РЅРµС‚ СЃРѕР·РґР°РЅРЅС‹С… РєРѕРјР°РЅРґ"}</p>
        </div>
      </div>

      <div className="teams-list">
        {visibleTeams.length === 0 && <div className="planner-empty-inline">РљРѕРјР°РЅРґС‹ РїРѕСЏРІСЏС‚СЃСЏ Р·РґРµСЃСЊ РїРѕСЃР»Рµ С„РѕСЂРјРёСЂРѕРІР°РЅРёСЏ.</div>}

        {visibleTeams.map((team) => (
          <div key={team.id} className="team-item">
            <div className="team-top">
              {isOrganizer ? (
                <AppInput
                  value={team.name}
                  disabled={team.confirmed}
                  title={team.confirmed ? "Р§С‚РѕР±С‹ РёР·РјРµРЅРёС‚СЊ РЅР°Р·РІР°РЅРёРµ, СЃРЅР°С‡Р°Р»Р° СЃРЅРёРјРё РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РєРѕРјР°РЅРґС‹" : undefined}
                  onChange={(event) => onRenameTeam(team.id, event.target.value)}
                />
              ) : (
                <div className="team-title">{team.name}</div>
              )}

              {isOrganizer ? (
                <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>
                  {team.confirmed ? "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°" : "Р§РµСЂРЅРѕРІРёРє"}
                </div>
              ) : (
                <div className="team-badge-stack">
                  <div className={`team-badge ${team.confirmed ? "ok" : "draft"}`}>
                    {team.confirmed ? "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°" : "Р§РµСЂРЅРѕРІРёРє"}
                  </div>
                  <AppButton className="info-icon-btn" type="button" onClick={() => onOpenTeamInfo(team.id)} aria-label="РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РєРѕРјР°РЅРґРµ">
                    <InfoCircleOutlined />
                  </AppButton>
                </div>
              )}
            </div>

            <div className="team-meta-grid">
              <div className="team-value">
                <span>РљСѓСЂР°С‚РѕСЂ</span>
                {team.curatorId ? userNameById.get(team.curatorId) || `ID ${team.curatorId}` : "-"}
              </div>
              <div className="team-value">
                <span>РЈС‡Р°СЃС‚РЅРёРєРё</span>
                {team.memberIds.length}
              </div>
            </div>

            {sourceLabelForTeam(team) && (
              <div className="team-value team-value--source">
                <span>РСЃС‚РѕС‡РЅРёРє</span>
                {sourceLabelForTeam(team)}
              </div>
            )}

            {isOrganizer && curatorEditTeamId === team.id && (
              <div className="team-curator-assign">
                <AppSelect
                  value={curatorDraftByTeam[team.id] || ""}
                  onChange={(value) => setCuratorDraftByTeam((prev) => ({ ...prev, [team.id]: String(value) }))}
                  options={getCuratorOptions(team)}
                />
                <AppButton
                  className="primary"
                  type="button"
                  disabled={!curatorDraftByTeam[team.id]}
                  onClick={() => submitTeamCurator(team.id)}
                >
                  РќР°Р·РЅР°С‡РёС‚СЊ
                </AppButton>
                <AppButton className="link-btn" type="button" onClick={() => setCuratorEditTeamId(null)}>
                  РћС‚РјРµРЅР°
                </AppButton>
              </div>
            )}

            {isOrganizer && (
              <div className="team-actions">
                <AppButton className="primary" type="button" onClick={() => onToggleTeamConfirmed(team.id)}>
                  {team.confirmed ? "Р Р°СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ" : "РџРѕРґС‚РІРµСЂРґРёС‚СЊ"}
                </AppButton>
                <AppButton className="link-btn" type="button" onClick={() => onOpenTeamEdit(team.id)}>
                  РЎРѕСЃС‚Р°РІ
                </AppButton>
                {!team.curatorId && curatorEditTeamId !== team.id && (
                  <AppButton
                    className="link-btn"
                    type="button"
                    onClick={() => {
                      setCuratorDraftByTeam((prev) => ({ ...prev, [team.id]: prev[team.id] || "" }));
                      setCuratorEditTeamId(team.id);
                    }}
                  >
                    РќР°Р·РЅР°С‡РёС‚СЊ РєСѓСЂР°С‚РѕСЂР°
                  </AppButton>
                )}
                <AppButton
                  className="danger-outline"
                  type="button"
                  disabled={team.confirmed}
                  title={team.confirmed ? "РЎРЅР°С‡Р°Р»Р° СЂР°СЃС„РѕСЂРјРёСЂСѓР№С‚Рµ РєРѕРјР°РЅРґСѓ" : undefined}
                  onClick={() => onDeleteTeam(team.id)}
                >
                  РЈРґР°Р»РёС‚СЊ
                </AppButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const renderSelectedPanel = () => {
    if (!activeGroup) {
      return (
        <section className="planner-card teams-panel teams-panel--selection">
          <div className="teams-panel-head teams-panel-head--compact">
            <div>
              <div className="teams-eyebrow">РЎР±РѕСЂ РєРѕРјР°РЅРґС‹</div>
              <h3 className="h3">Р’С‹Р±СЂР°РЅРЅС‹Рµ СѓС‡Р°СЃС‚РЅРёРєРё</h3>
              <p>Р’С‹Р±РµСЂРёС‚Рµ РїСЂРѕРµРєС‚Р°РЅС‚РѕРІ РІ РјРµСЂРѕРїСЂРёСЏС‚РёРё СЃР»РµРІР°.</p>
            </div>
          </div>
          <div className="planner-empty-inline">РќРµС‚ РґРѕСЃС‚СѓРїРЅС‹С… РјРµСЂРѕРїСЂРёСЏС‚РёР№.</div>
        </section>
      );
    }

    const curatorOptions = [
      { value: "", label: "РљСѓСЂР°С‚РѕСЂ РєРѕРјР°РЅРґС‹", disabled: true },
      ...(!activeSelectedApplicants.some((applicant) => Number(applicant.ownerId) === Number(currentUser.id))
        ? [
            {
              value: String(currentUser.id),
              label: `РћСЂРіР°РЅРёР·Р°С‚РѕСЂ: ${fullName(currentUser) || currentUser.email || `ID ${currentUser.id}`}`,
            },
          ]
        : []),
      ...activeSelectedApplicants.map((applicant) => ({
        value: String(applicant.ownerId),
        label: applicant.name,
      })),
    ];

    return (
      <section className="planner-card teams-panel teams-panel--selection">
        <div className="teams-panel-head teams-panel-head--compact">
          <div>
            <div className="teams-eyebrow">РЎР±РѕСЂ РєРѕРјР°РЅРґС‹</div>
            <h3 className="h3">Р’С‹Р±СЂР°РЅРЅС‹Рµ СѓС‡Р°СЃС‚РЅРёРєРё</h3>
            <p>{activeGroup.eventTitle}</p>
          </div>
          <div className="team-badge draft">{activeSelectedApplicants.length}</div>
        </div>

        <div className="planner-selected-list">
          {activeSelectedApplicants.length === 0 ? (
            <div className="planner-empty-inline">Р’С‹Р±РµСЂРёС‚Рµ СѓС‡Р°СЃС‚РЅРёРєРѕРІ РІ РјРµСЂРѕРїСЂРёСЏС‚РёРё СЃР»РµРІР°.</div>
          ) : (
            <>
              {renderApplicantHeader(true)}
              {activeSelectedApplicants.map((applicant) => (
                <label key={`${activeGroup.key}:selected:${applicant.ownerId}`} className="planner-check planner-applicant-row planner-applicant-row--selected">
                  <div className="planner-applicant-columns planner-applicant-columns--compact">
                    <span className="planner-applicant-name">{applicant.name}</span>
                    <span className="planner-applicant-specialization">{applicant.specialization || "Р‘РµР· СЃРїРµС†РёР°Р»РёР·Р°С†РёРё"}</span>
                  </div>
                  <AppSwitch checked onChange={() => onToggleApplicantForGroup(activeGroup.key, applicant.ownerId)} compact />
                </label>
              ))}
            </>
          )}
        </div>

        <div className="planner-team-builder-form">
          <AppInput
            value={teamNameByGroup[activeGroup.key] || ""}
            onChange={(event) => onTeamNameChange(activeGroup.key, event.target.value)}
            placeholder="РќР°Р·РІР°РЅРёРµ РєРѕРјР°РЅРґС‹"
          />

          <AppSelect
            value={selectedDirectionId}
            onChange={(value) => onTeamDirectionChange(activeGroup.key, String(value))}
            disabled={activeGroup.directionOptions.length === 0}
            options={[
              { value: "", label: activeGroup.directionOptions.length ? "Р’С‹Р±РµСЂРёС‚Рµ РЅР°РїСЂР°РІР»РµРЅРёРµ" : "РЈ РјРµСЂРѕРїСЂРёСЏС‚РёСЏ РЅРµС‚ РЅР°РїСЂР°РІР»РµРЅРёР№", disabled: true },
              ...activeGroup.directionOptions.map((direction) => ({ value: String(direction.id), label: direction.title })),
            ]}
          />

          <AppSelect
            value={selectedProjectId}
            onChange={(value) => onTeamProjectChange(activeGroup.key, String(value))}
            disabled={!selectedDirectionId || availableProjects.length === 0}
            options={[
              { value: "", label: availableProjects.length ? "Р’С‹Р±РµСЂРёС‚Рµ РїСЂРѕРµРєС‚" : "РЈ РЅР°РїСЂР°РІР»РµРЅРёСЏ РЅРµС‚ РїСЂРѕРµРєС‚РѕРІ", disabled: true },
              ...availableProjects.map((project) => ({ value: String(project.id), label: project.title })),
            ]}
          />

          <AppSelect
            value={teamCuratorByGroup[activeGroup.key] || ""}
            onChange={(value) => onTeamCuratorChange(activeGroup.key, String(value))}
            options={curatorOptions}
          />

          <AppButton className="primary" type="button" onClick={() => onCreateTeamFromGroup(activeGroup, teamNameByGroup[activeGroup.key] || "")}>
            РЎС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РєРѕРјР°РЅРґСѓ
          </AppButton>
        </div>
      </section>
    );
  };

  return (
    <div className={`teams-layout ${!isOrganizer ? "teams-layout--single" : ""}`}>
      {isOrganizer && (
        <section className="planner-card teams-panel teams-panel--builder">
          <div className="teams-panel-head">
            <div>
              <div className="teams-eyebrow">Р Р°Р±РѕС‚Р° СЃ Р·Р°СЏРІРєР°РјРё</div>
              <h3 className="h3">Р¤РѕСЂРјРёСЂРѕРІР°РЅРёРµ РєРѕРјР°РЅРґ</h3>
              <p>Р’С‹Р±РµСЂРё РїСЂРѕРµРєС‚Р°РЅС‚РѕРІ РІРЅСѓС‚СЂРё РјРµСЂРѕРїСЂРёСЏС‚РёСЏ, Р·Р°С‚РµРј СЃРїСЂР°РІР° Р·Р°РґР°Р№ РїР°СЂР°РјРµС‚СЂС‹ РєРѕРјР°РЅРґС‹.</p>
            </div>

            {hasClosedEvents && (
              <AppButton className="primary" type="button" onClick={onSyncParticipants}>
                РЎРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°С‚СЊ СѓС‡Р°СЃС‚РЅРёРєРѕРІ
              </AppButton>
            )}
          </div>

          {hasClosedEvents && (
            <div className="planner-note teams-note">
              Р”Р»СЏ РјРµСЂРѕРїСЂРёСЏС‚РёР№ СЃ Р·Р°РІРµСЂС€С‘РЅРЅС‹Рј РЅР°Р±РѕСЂРѕРј РІ РїР»Р°РЅРёСЂРѕРІС‰РёРєРµ РѕСЃС‚Р°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ СѓС‡Р°СЃС‚РЅРёРєРё СЃРѕ СЃС‚Р°С‚СѓСЃРѕРј В«РџСЂРёСЃС‚СѓРїРёР» Рє РџРЁВ».
            </div>
          )}

          <div className="planner-source-tree">
            {applicantsTree.length === 0 ? (
              <div className="planner-empty-inline">РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ С„РѕСЂРјРёСЂРѕРІР°РЅРёСЏ РєРѕРјР°РЅРґ.</div>
            ) : (
              applicantsTree.map((eventNode) => {
                const group = eventNode.group;
                const eventId = typeof eventNode.eventId === "number" ? eventNode.eventId : null;
                const isVisibleInTeams = !eventNode.eventHidden;
                const selectedIds = selectedApplicantsByGroup[group.key] || [];
                const assignedIds = eventId ? assignedOwnerIdsByEventId.get(eventId) || new Set<number>() : new Set<number>();
                const availableApplicants = group.applicants.filter(
                  (applicant) => !selectedIds.includes(applicant.ownerId) && !assignedIds.has(Number(applicant.ownerId))
                );
                const allApplicantsAssigned =
                  group.applicants.length > 0 && group.applicants.every((applicant) => assignedIds.has(Number(applicant.ownerId)));
                const switchControl = (
                  <div className="planner-source-switch" onClick={stopSummaryToggle}>
                    <span>Р’ СЃРїРёСЃРєРµ РєРѕРјР°РЅРґ</span>
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
                          <span>РњРµСЂРѕРїСЂРёСЏС‚РёРµ: {eventNode.title}</span>
                        </div>

                        <div className="planner-source-summary-actions">
                          <span className="planner-source-meta planner-source-meta--muted">РЎРєСЂС‹С‚Рѕ РёР· СЃРїРёСЃРєР° РєРѕРјР°РЅРґ</span>
                          {switchControl}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <details
                    key={eventNode.key}
                    className="planner-source-node planner-source-node--event"
                    open={eventOpenByKey[eventNode.key] ?? true}
                    onToggle={(event) => setEventOpen(eventNode.key, event.currentTarget.open)}
                  >
                    <summary className="planner-source-summary" onClick={() => onSelectBuilderGroup(group.key)}>
                      <div className="planner-source-summary-main">
                        <span>РњРµСЂРѕРїСЂРёСЏС‚РёРµ: {eventNode.title}</span>
                        <span className="planner-source-meta">{group.applicants.length} СѓС‡Р°СЃС‚РЅРёРєРѕРІ</span>
                      </div>

                      <div className="planner-source-summary-actions">
                        {eventNode.eventClosed && <span className="planner-source-meta planner-source-meta--closed">Набор завершён</span>}

                        {isOrganizer && eventId && (
                          <>
                            {!eventNode.eventClosed && (
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
                            )}
                            <AppButton
                              type="button"
                              className="planner-source-close-btn"
                              onClick={(event) => {
                                stopSummaryToggle(event);
                                onSendPlannerInvites(eventId, eventNode.title);
                              }}
                            >
                              Отправить VK-приглашения
                            </AppButton>
                          </>
                        )}

                        {switchControl}
                      </div>
                    </summary>

                    <div className="planner-source-content">
                      {availableApplicants.length === 0 ? (
                        <div className="planner-empty-inline">
                          {group.applicants.length === 0
                            ? "РџРѕ СЌС‚РѕРјСѓ РјРµСЂРѕРїСЂРёСЏС‚РёСЋ РїРѕРєР° РЅРµС‚ РґРѕСЃС‚СѓРїРЅС‹С… СѓС‡Р°СЃС‚РЅРёРєРѕРІ."
                            : allApplicantsAssigned
                              ? "Р’СЃРµ РґРѕСЃС‚СѓРїРЅС‹Рµ СѓС‡Р°СЃС‚РЅРёРєРё СѓР¶Рµ СЂР°СЃРїСЂРµРґРµР»РµРЅС‹ РїРѕ РєРѕРјР°РЅРґР°Рј."
                              : "Р’СЃРµ РґРѕСЃС‚СѓРїРЅС‹Рµ СѓС‡Р°СЃС‚РЅРёРєРё РІС‹Р±СЂР°РЅС‹."}
                        </div>
                      ) : (
                        <div className="planner-members-list">
                          {renderApplicantHeader()}
                          {availableApplicants.map((applicant) => (
                            <label key={`${group.key}:${applicant.ownerId}`} className="planner-check planner-applicant-row">
                              {renderApplicantInfo(applicant)}
                              <AppSwitch
                                checked={false}
                                onChange={() => onToggleApplicantForGroup(group.key, applicant.ownerId)}
                                compact
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })
            )}
          </div>

          {renderCreatedTeams()}
        </section>
      )}

      {isOrganizer ? renderSelectedPanel() : <section className="planner-card teams-panel teams-panel--created">{renderCreatedTeams()}</section>}
    </div>
  );
}

