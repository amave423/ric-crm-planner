import { useContext, useEffect, useMemo, useState } from "react";
import { buildParticipantsFromRequests, getPlannerState, savePlannerState, syncParticipants } from "../../api/planner";
import { getRequests } from "../../api/requests";
import { getEventById } from "../../api/events";
import { getDirectionById } from "../../api/directions";
import { getProjectsByDirection } from "../../api/projects";
import { AuthContext } from "../../context/AuthContext";
import { DEFAULT_KANBAN_COLUMNS, nextPlannerId, removeTeamCascade } from "../../storage/planner";
import { getAllUsers } from "../../storage/storage";
import type { PlannerState, PlannerSubtask, PlannerTeam } from "../../types/planner";
import type { Request } from "../../types/request";
import type { User } from "../../types/user";
import PlannerHeader from "./components/PlannerHeader";
import PlannerTabs from "./components/PlannerTabs";
import TeamsTab from "./components/tabs/TeamsTab";
import BacklogTab from "./components/tabs/BacklogTab";
import KanbanTab from "./components/tabs/KanbanTab";
import GanttTab from "./components/tabs/GanttTab";
import ConfirmCloseEnrollmentModal from "./components/modals/ConfirmCloseEnrollmentModal";
import TeamInfoModal from "./components/modals/TeamInfoModal";
import TeamEditModal from "./components/modals/TeamEditModal";
import TaskCardModal from "./components/modals/TaskCardModal";
import { usePlannerDrag } from "./hooks/usePlannerDrag";
import type { ApplicantsTreeNode, ParentEditDraft, PlannerTab, ProjectApplicantsGroup, SubtaskEditDraft, TaskCardState } from "./planner.types";
import { fullName, isFallbackParticipantName, roleFlags } from "./planner.utils";
import "./planner.scss";

export default function PlannerPage() {
  const { user } = useContext(AuthContext);
  const { isOrganizer, isCurator, isStudent } = roleFlags(user?.role);
  const userId = Number(user?.id || 0);

  const [tab, setTab] = useState<PlannerTab>(() => {
    const raw = localStorage.getItem("planner_tab_v1");
    if (raw === "teams" || raw === "backlog" || raw === "kanban" || raw === "gantt") return raw;
    return "teams";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPlannerLoaded, setIsPlannerLoaded] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [state, setState] = useState<PlannerState>({
    enrollmentClosed: false,
    participants: [],
    teams: [],
    parentTasks: [],
    subtasks: [],
    columns: [],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  const [selectedApplicantsByGroup, setSelectedApplicantsByGroup] = useState<Record<string, number[]>>({});
  const [teamNameByGroup, setTeamNameByGroup] = useState<Record<string, string>>({});
  const [teamCuratorByGroup, setTeamCuratorByGroup] = useState<Record<string, string>>({});
  const [eventTitleById, setEventTitleById] = useState<Record<number, string>>({});
  const [directionTitleById, setDirectionTitleById] = useState<Record<number, string>>({});
  const [projectTitleById, setProjectTitleById] = useState<Record<number, string>>({});

  const [parentTitle, setParentTitle] = useState("");
  const [parentStart, setParentStart] = useState("");
  const [parentEnd, setParentEnd] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const [subTitle, setSubTitle] = useState("");
  const [subAssigneeId, setSubAssigneeId] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [subInSprint, setSubInSprint] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const [confirmCloseEnrollmentOpen, setConfirmCloseEnrollmentOpen] = useState(false);
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [teamInfoId, setTeamInfoId] = useState<number | null>(null);
  const [teamEditOpen, setTeamEditOpen] = useState(false);
  const [teamEditId, setTeamEditId] = useState<number | null>(null);
  const [teamEditMembers, setTeamEditMembers] = useState<number[]>([]);
  const [taskCardOpen, setTaskCardOpen] = useState(false);
  const [taskCard, setTaskCard] = useState<TaskCardState>(null);
  const [editingParentId, setEditingParentId] = useState<number | null>(null);
  const [editingParentDraft, setEditingParentDraft] = useState<ParentEditDraft | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskDraft, setEditingSubtaskDraft] = useState<SubtaskEditDraft | null>(null);

  useEffect(() => {
    if (!isPlannerLoaded) return;
    void savePlannerState(state);
  }, [isPlannerLoaded, state]);

  useEffect(() => {
    localStorage.setItem("planner_tab_v1", tab);
  }, [tab]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setIsPlannerLoaded(false);
    Promise.all([
      getPlannerState(),
      getAllUsers(),
      getRequests({ role: user?.role, ownerId: isOrganizer ? undefined : user?.id }),
    ])
      .then(([planner, us, rs]) => {
        if (!mounted) return;
        const usersData = Array.isArray(us) ? us : [];
        const requestsData = Array.isArray(rs) ? rs : [];
        const synced =
          isOrganizer && planner.enrollmentClosed ? syncParticipants(planner, buildParticipantsFromRequests(usersData, requestsData)) : planner;
        setState(synced);
        setUsers(Array.isArray(us) ? us : []);
        setRequests(Array.isArray(rs) ? rs : []);
        setIsPlannerLoaded(true);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isOrganizer, user?.id, user?.role]);

  useEffect(() => {
    let mounted = true;

    const fillTitles = async () => {
      const nextEventTitles: Record<number, string> = {};
      const nextDirectionTitles: Record<number, string> = {};
      const nextProjectTitles: Record<number, string> = {};

      requests.forEach((r) => {
        const eventId = Number(r.eventId);
        const projectId = Number(r.projectId);
        if (Number.isFinite(eventId) && r.eventTitle?.trim()) nextEventTitles[eventId] = r.eventTitle.trim();
        if (Number.isFinite(projectId) && r.projectTitle?.trim()) nextProjectTitles[projectId] = r.projectTitle.trim();
      });

      const missingEventIds = Array.from(
        new Set(
          requests
            .map((r) => Number(r.eventId))
            .filter((id) => Number.isFinite(id) && !nextEventTitles[id])
        )
      );
      const missingDirectionIds = Array.from(
        new Set(
          requests
            .map((r) => Number(r.directionId))
            .filter((id) => Number.isFinite(id) && !nextDirectionTitles[id])
        )
      );

      const projectIdsByDirection = new Map<number, Set<number>>();
      requests.forEach((r) => {
        const directionId = Number(r.directionId);
        const projectId = Number(r.projectId);
        if (!Number.isFinite(directionId) || !Number.isFinite(projectId)) return;
        if (!projectIdsByDirection.has(directionId)) projectIdsByDirection.set(directionId, new Set<number>());
        projectIdsByDirection.get(directionId)?.add(projectId);
      });

      const missingProjectByDirection = Array.from(projectIdsByDirection.entries())
        .map(([directionId, projectIds]) => ({
          directionId,
          projectIds: Array.from(projectIds).filter((projectId) => !nextProjectTitles[projectId]),
        }))
        .filter((x) => x.projectIds.length > 0);

      if (missingEventIds.length > 0) {
        const events = await Promise.all(missingEventIds.map((id) => getEventById(id).catch(() => undefined)));
        events.forEach((ev, index) => {
          const id = missingEventIds[index];
          const title = ev?.title?.trim();
          if (title) nextEventTitles[id] = title;
        });
      }

      if (missingDirectionIds.length > 0) {
        const directions = await Promise.all(missingDirectionIds.map((id) => getDirectionById(id).catch(() => undefined)));
        directions.forEach((dir, index) => {
          const id = missingDirectionIds[index];
          const title = dir?.title?.trim();
          if (title) nextDirectionTitles[id] = title;
        });
      }

      if (missingProjectByDirection.length > 0) {
        const lists = await Promise.all(
          missingProjectByDirection.map(async ({ directionId, projectIds }) => {
            const projects = await getProjectsByDirection(directionId).catch(() => []);
            const filtered = Array.isArray(projects)
              ? projects.filter((p) => projectIds.includes(Number(p.id)))
              : [];
            return filtered.map((p) => ({ id: Number(p.id), title: String(p.title || "").trim() })).filter((x) => x.id && x.title);
          })
        );
        lists.flat().forEach((p) => {
          nextProjectTitles[p.id] = p.title;
        });
      }

      if (!mounted) return;
      if (Object.keys(nextEventTitles).length > 0) setEventTitleById((prev) => ({ ...prev, ...nextEventTitles }));
      if (Object.keys(nextDirectionTitles).length > 0) setDirectionTitleById((prev) => ({ ...prev, ...nextDirectionTitles }));
      if (Object.keys(nextProjectTitles).length > 0) setProjectTitleById((prev) => ({ ...prev, ...nextProjectTitles }));
    };

    void fillTitles();
    return () => {
      mounted = false;
    };
  }, [requests]);

  const userNameById = useMemo(() => new Map(users.map((u) => [Number(u.id), fullName(u) || u.email])), [users]);
  const requestStudentNameById = useMemo(() => {
    const map = new Map<number, string>();
    requests.forEach((request) => {
      const ownerId = Number(request.ownerId);
      const name = String(request.studentName || "").trim();
      if (!Number.isFinite(ownerId) || !name) return;
      map.set(ownerId, name);
    });
    return map;
  }, [requests]);
  const participantNameById = useMemo(
    () => new Map(state.participants.map((p) => [Number(p.id), String(p.fullName || "").trim()])),
    [state.participants]
  );
  const specializationByOwnerId = useMemo(() => {
    const map = new Map<number, string>();
    requests.forEach((r) => {
      const ownerId = Number(r.ownerId);
      if (!Number.isFinite(ownerId)) return;
      const spec = String(r.specialization || "").trim();
      if (spec) map.set(ownerId, spec);
    });
    return map;
  }, [requests]);
  const memberTeamIdsAll = useMemo(() => state.teams.filter((t) => t.memberIds.includes(userId)).map((t) => t.id), [state.teams, userId]);
  const curatorTeamIds = useMemo(() => state.teams.filter((t) => Number(t.curatorId) === userId).map((t) => t.id), [state.teams, userId]);
  const canViewTeam = (teamId: number) => isOrganizer || isCurator || (isStudent && memberTeamIdsAll.includes(teamId));
  const canEditTeam = (teamId: number) => isOrganizer || (isCurator && curatorTeamIds.includes(teamId)) || (isStudent && memberTeamIdsAll.includes(teamId));

  const visibleTeams = state.teams.filter((t) => canViewTeam(t.id));
  const activeTeamId = teamFilter ? Number(teamFilter) : null;
  const activeTeam = activeTeamId != null ? visibleTeams.find((team) => Number(team.id) === Number(activeTeamId)) ?? null : null;
  useEffect(() => {
    if (visibleTeams.length === 0) {
      if (teamFilter) setTeamFilter("");
      return;
    }
    const hasSelectedTeam = visibleTeams.some((team) => String(team.id) === teamFilter);
    if (!hasSelectedTeam) {
      setTeamFilter(String(visibleTeams[0].id));
    }
  }, [teamFilter, visibleTeams]);
  const filteredParents = state.parentTasks.filter(
    (p) => canViewTeam(p.teamId) && activeTeamId != null && Number(activeTeamId) === Number(p.teamId)
  );
  const selectedParent = filteredParents.find((p) => Number(p.id) === Number(selectedParentId));
  const filteredSubtasks = state.subtasks.filter(
    (s) => canViewTeam(s.teamId) && activeTeamId != null && Number(activeTeamId) === Number(s.teamId)
  );
  const displayNameForUserId = (id: number) => {
    const userName = userNameById.get(id);
    if (userName) return userName;

    const requestName = requestStudentNameById.get(id);
    if (requestName) return requestName;

    const participantName = participantNameById.get(id);
    if (participantName && !isFallbackParticipantName(participantName)) return participantName;

    return `Участник #${id}`;
  };
  const displayAssigneeLabel = (id: number) => {
    const base = displayNameForUserId(id);
    const spec = specializationByOwnerId.get(id);
    return spec ? `${base} — ${spec}` : base;
  };
  const getTeamMemberIds = (teamId: number) =>
    state.teams.find((t) => Number(t.id) === Number(teamId))?.memberIds || [];
  const selectedTeamMembers = selectedParent
    ? state.teams.find((t) => Number(t.id) === Number(selectedParent.teamId))?.memberIds || []
    : [];
  const sourceLabelForTeam = (team: PlannerTeam) => {
    const eventLabel = team.eventId ? eventTitleById[team.eventId] || `Мероприятие #${team.eventId}` : "";
    const directionLabel = team.directionId ? directionTitleById[team.directionId] || `Направление #${team.directionId}` : "";
    const projectLabel = team.projectId ? projectTitleById[team.projectId] || `Проект #${team.projectId}` : "";
    return [eventLabel, directionLabel, projectLabel].filter(Boolean).join(" / ");
  };
  const openTeamInfo = (teamId: number) => {
    setTeamInfoId(teamId);
    setTeamInfoOpen(true);
  };
  const closeTeamInfo = () => {
    setTeamInfoOpen(false);
    setTeamInfoId(null);
  };
  const openTeamEdit = (teamId: number) => {
    const team = state.teams.find((t) => Number(t.id) === Number(teamId));
    if (!team) return;
    setTeamEditId(teamId);
    setTeamEditMembers([...team.memberIds]);
    setTeamEditOpen(true);
  };
  const closeTeamEdit = () => {
    setTeamEditOpen(false);
    setTeamEditId(null);
    setTeamEditMembers([]);
  };
  const toggleTeamEditMember = (id: number) => {
    setTeamEditMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const saveTeamEdit = () => {
    if (teamEditId == null) return;
    const unique = Array.from(new Set(teamEditMembers));
    if (unique.length === 0) {
      setError("Выберите хотя бы одного участника");
      return;
    }
    setState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (Number(t.id) === Number(teamEditId) ? { ...t, memberIds: unique } : t)),
    }));
    setError("");
    closeTeamEdit();
  };
  const openTaskCard = (type: "parent" | "subtask", id: number) => {
    setTaskCard({ type, id });
    setTaskCardOpen(true);
  };
  const closeTaskCard = () => {
    setTaskCardOpen(false);
    setTaskCard(null);
  };

  useEffect(() => {
    if (!subStatus && state.columns[0]) setSubStatus(state.columns[0]);
  }, [state.columns, subStatus]);

  const snapshotParticipants = () => buildParticipantsFromRequests(users, requests);

  const projectApplicantGroups = useMemo<ProjectApplicantsGroup[]>(() => {
    const groups = new Map<
      string,
      {
        key: string;
        eventId?: number;
        directionId?: number;
        projectId?: number;
        eventTitle: string;
        directionTitle: string;
        projectTitle: string;
        applicantsByOwner: Map<number, { ownerId: number; name: string; status?: string; requestIds: number[]; latestRequestId: number }>;
      }
    >();

    requests.forEach((r) => {
      const ownerId = Number(r.ownerId);
      if (!Number.isFinite(ownerId)) return;

      const eventIdRaw = Number(r.eventId);
      const directionIdRaw = Number(r.directionId);
      const projectIdRaw = Number(r.projectId);
      const eventId = Number.isFinite(eventIdRaw) ? eventIdRaw : undefined;
      const directionId = Number.isFinite(directionIdRaw) ? directionIdRaw : undefined;
      const projectId = Number.isFinite(projectIdRaw) ? projectIdRaw : undefined;

      const eventTitle = (r.eventTitle?.trim() || (eventId ? eventTitleById[eventId] : "") || (eventId ? `Мероприятие #${eventId}` : "Без мероприятия")).trim();
      const directionTitle = ((directionId ? directionTitleById[directionId] : "") || (directionId ? `Направление #${directionId}` : "Без направления")).trim();
      const projectTitle = (r.projectTitle?.trim() || (projectId ? projectTitleById[projectId] : "") || (projectId ? `Проект #${projectId}` : "Без проекта")).trim();

      const key = `${eventId ?? "none"}:${directionId ?? "none"}:${projectId ?? "none"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          eventId,
          directionId,
          projectId,
          eventTitle,
          directionTitle,
          projectTitle,
          applicantsByOwner: new Map(),
        });
      }
      const group = groups.get(key);
      if (!group) return;
      if (!group.eventTitle && eventTitle) group.eventTitle = eventTitle;
      if (!group.directionTitle && directionTitle) group.directionTitle = directionTitle;
      if (!group.projectTitle && projectTitle) group.projectTitle = projectTitle;

      const displayName = (userNameById.get(ownerId) || r.studentName || `Участник #${ownerId}`).trim();
      const current = group.applicantsByOwner.get(ownerId);
      if (!current) {
        group.applicantsByOwner.set(ownerId, {
          ownerId,
          name: displayName,
          status: r.status,
          requestIds: [r.id],
          latestRequestId: Number(r.id) || 0,
        });
        return;
      }
      current.requestIds.push(r.id);
      if ((Number(r.id) || 0) >= current.latestRequestId) {
        current.latestRequestId = Number(r.id) || current.latestRequestId;
        current.status = r.status;
        if (displayName) current.name = displayName;
      }
    });

    return Array.from(groups.values())
      .map((g) => ({
        key: g.key,
        eventId: g.eventId,
        directionId: g.directionId,
        projectId: g.projectId,
        eventTitle: g.eventTitle,
        directionTitle: g.directionTitle,
        projectTitle: g.projectTitle,
        applicants: Array.from(g.applicantsByOwner.values())
          .map((a) => ({ ownerId: a.ownerId, name: a.name, status: a.status, requestIds: a.requestIds }))
          .sort((a, b) => a.name.localeCompare(b.name, "ru")),
      }))
      .sort((a, b) =>
        a.eventTitle.localeCompare(b.eventTitle, "ru") ||
        a.directionTitle.localeCompare(b.directionTitle, "ru") ||
        a.projectTitle.localeCompare(b.projectTitle, "ru")
      );
  }, [directionTitleById, eventTitleById, projectTitleById, requests, userNameById]);

  const applicantsTree = useMemo<ApplicantsTreeNode[]>(() => {
    const eventsMap = new Map<
      string,
      {
        key: string;
        title: string;
        directionsMap: Map<string, { key: string; title: string; projects: ProjectApplicantsGroup[] }>;
      }
    >();

    projectApplicantGroups.forEach((group) => {
      const eventKey = `e:${(group.eventTitle || "").trim().toLowerCase() || group.eventId || "none"}`;
      if (!eventsMap.has(eventKey)) {
        eventsMap.set(eventKey, { key: eventKey, title: group.eventTitle, directionsMap: new Map() });
      }
      const eventNode = eventsMap.get(eventKey);
      if (!eventNode) return;

      const directionKey = `d:${(group.directionTitle || "").trim().toLowerCase() || group.directionId || "none"}`;
      if (!eventNode.directionsMap.has(directionKey)) {
        eventNode.directionsMap.set(directionKey, { key: directionKey, title: group.directionTitle, projects: [] });
      }
      eventNode.directionsMap.get(directionKey)?.projects.push(group);
    });

    return Array.from(eventsMap.values())
      .map((eventNode) => ({
        key: eventNode.key,
        title: eventNode.title,
        directions: Array.from(eventNode.directionsMap.values())
          .map((directionNode) => ({
            key: directionNode.key,
            title: directionNode.title,
            projects: directionNode.projects.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle, "ru")),
          }))
          .sort((a, b) => a.title.localeCompare(b.title, "ru")),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }, [projectApplicantGroups]);

  const toggleApplicantForGroup = (groupKey: string, ownerId: number) => {
    setSelectedApplicantsByGroup((prev) => {
      const current = prev[groupKey] || [];
      const hasOwner = current.includes(ownerId);
      const next = hasOwner ? current.filter((id) => id !== ownerId) : [...current, ownerId];
      return { ...prev, [groupKey]: next };
    });
  };

  const createTeamFromGroup = (group: ProjectApplicantsGroup) => {
    const selectedOwnerIds = Array.from(new Set(selectedApplicantsByGroup[group.key] || []));
    const availableIds = new Set(group.applicants.map((a) => a.ownerId));
    const memberIds = selectedOwnerIds.filter((id) => availableIds.has(id));
    if (memberIds.length === 0) {
      setError("Выберите хотя бы одного участника проекта");
      return;
    }

    const rawName = (teamNameByGroup[group.key] || "").trim();
    if (!rawName) {
      setError("Введите название команды");
      return;
    }
    const teamName = rawName;

    const curatorRaw = teamCuratorByGroup[group.key];
    const curatorIdNum = curatorRaw ? Number(curatorRaw) : undefined;
    const curatorId = typeof curatorIdNum === "number" && !Number.isNaN(curatorIdNum) ? curatorIdNum : undefined;

    const requestIds = group.applicants.filter((a) => memberIds.includes(a.ownerId)).flatMap((a) => a.requestIds);
    const created: PlannerTeam = {
      id: nextPlannerId(state.teams),
      name: teamName,
      curatorId,
      memberIds,
      confirmed: false,
      eventId: group.eventId,
      directionId: group.directionId,
      projectId: group.projectId,
      sourceRequestIds: requestIds,
    };

    setState((prev) => {
      const participantsById = new Map(prev.participants.map((p) => [Number(p.id), p]));
      memberIds.forEach((id) => {
        const fullName =
          group.applicants.find((a) => a.ownerId === id)?.name ||
          userNameById.get(id) ||
          requestStudentNameById.get(id) ||
          `Участник #${id}`;
        participantsById.set(id, { id, fullName });
      });
      return {
        ...prev,
        participants: Array.from(participantsById.values()),
        teams: [...prev.teams, created],
      };
    });

    setSelectedApplicantsByGroup((prev) => ({ ...prev, [group.key]: [] }));
    setTeamNameByGroup((prev) => ({ ...prev, [group.key]: "" }));
    setError("");
  };

  const addParentTask = () => {
    const teamId = Number(activeTeamId);
    if (!teamId || !canEditTeam(teamId)) return setError("Нет прав или команда не выбрана");
    if (!parentTitle.trim() || !parentStart || !parentEnd || parentStart > parentEnd) return setError("Проверьте поля большой задачи");
    setState((prev) => ({
      ...prev,
      parentTasks: [...prev.parentTasks, { id: nextPlannerId(prev.parentTasks), teamId, title: parentTitle.trim(), startDate: parentStart, endDate: parentEnd }],
    }));
    setParentTitle("");
    setParentStart("");
    setParentEnd("");
    setError("");
  };

  const addSubtask = () => {
    if (!selectedParent) return setError("Выберите большую задачу");
    if (!canEditTeam(selectedParent.teamId)) return setError("Нет прав на подзадачи этой команды");
    if (!subTitle.trim() || !subAssigneeId || !subStart || !subEnd || subStart > subEnd) return setError("Проверьте поля подзадачи");
    if (subStart < selectedParent.startDate || subEnd > selectedParent.endDate) return setError("Сроки подзадачи вне диапазона большой задачи");
    const created: PlannerSubtask = {
      id: nextPlannerId(state.subtasks),
      teamId: selectedParent.teamId,
      parentTaskId: selectedParent.id,
      title: subTitle.trim(),
      role: "",
      assigneeId: Number(subAssigneeId),
      startDate: subStart,
      endDate: subEnd,
      status: subStatus || state.columns[0],
      inSprint: subInSprint,
    };
    setState((prev) => ({ ...prev, subtasks: [...prev.subtasks, created] }));
    setSubTitle("");
    setSubAssigneeId("");
    setSubStart("");
    setSubEnd("");
    setSubInSprint(false);
    setError("");
  };

  const startEditParent = (parentId: number) => {
    const parent = state.parentTasks.find((p) => Number(p.id) === Number(parentId));
    if (!parent || !canEditTeam(parent.teamId)) return;
    setEditingParentId(parent.id);
    setEditingParentDraft({
      title: parent.title,
      startDate: parent.startDate,
      endDate: parent.endDate,
    });
    setError("");
  };

  const cancelEditParent = () => {
    setEditingParentId(null);
    setEditingParentDraft(null);
  };

  const saveEditedParent = () => {
    if (!editingParentId || !editingParentDraft) return;
    const nextTitle = editingParentDraft.title.trim();
    if (!nextTitle || !editingParentDraft.startDate || !editingParentDraft.endDate || editingParentDraft.startDate > editingParentDraft.endDate) {
      setError("Проверьте поля большой задачи");
      return;
    }
    const hasOutOfRangeSubtasks = state.subtasks.some(
      (s) =>
        Number(s.parentTaskId) === Number(editingParentId) &&
        (s.startDate < editingParentDraft.startDate || s.endDate > editingParentDraft.endDate)
    );
    if (hasOutOfRangeSubtasks) {
      setError("Сначала поправьте сроки подзадач: они должны быть в диапазоне большой задачи");
      return;
    }
    setState((prev) => ({
      ...prev,
      parentTasks: prev.parentTasks.map((p) =>
        Number(p.id) === Number(editingParentId)
          ? { ...p, title: nextTitle, startDate: editingParentDraft.startDate, endDate: editingParentDraft.endDate }
          : p
      ),
    }));
    cancelEditParent();
    setError("");
  };

  const startEditSubtask = (subtaskId: number) => {
    const subtask = state.subtasks.find((s) => Number(s.id) === Number(subtaskId));
    if (!subtask || !canEditTeam(subtask.teamId)) return;
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskDraft({
      title: subtask.title,
      assigneeId: subtask.assigneeId,
      startDate: subtask.startDate,
      endDate: subtask.endDate,
      status: subtask.status,
      inSprint: subtask.inSprint,
    });
    setError("");
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskDraft(null);
  };

  const saveEditedSubtask = () => {
    if (!editingSubtaskId || !editingSubtaskDraft) return;
    const nextTitle = editingSubtaskDraft.title.trim();
    if (!nextTitle || !editingSubtaskDraft.assigneeId || !editingSubtaskDraft.startDate || !editingSubtaskDraft.endDate || editingSubtaskDraft.startDate > editingSubtaskDraft.endDate) {
      setError("Проверьте поля подзадачи");
      return;
    }
    const current = state.subtasks.find((s) => Number(s.id) === Number(editingSubtaskId));
    const parent = state.parentTasks.find((p) => Number(p.id) === Number(current?.parentTaskId));
    if (!current || !parent) return;
    if (editingSubtaskDraft.startDate < parent.startDate || editingSubtaskDraft.endDate > parent.endDate) {
      setError("Сроки подзадачи вне диапазона большой задачи");
      return;
    }
    const safeStatus = state.columns.includes(editingSubtaskDraft.status) ? editingSubtaskDraft.status : state.columns[0] || current.status;
    setState((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) =>
        Number(s.id) === Number(editingSubtaskId)
          ? {
              ...s,
              title: nextTitle,
              assigneeId: editingSubtaskDraft.assigneeId,
              startDate: editingSubtaskDraft.startDate,
              endDate: editingSubtaskDraft.endDate,
              status: safeStatus,
              inSprint: Boolean(editingSubtaskDraft.inSprint),
            }
          : s
      ),
    }));
    cancelEditSubtask();
    setError("");
  };

  const removeKanbanColumn = (title: string) => {
    if (DEFAULT_KANBAN_COLUMNS.includes(title)) {
      setError("Базовые колонки удалить нельзя");
      return;
    }
    if (state.columns.length <= 1) {
      setError("Должна остаться хотя бы одна колонка");
      return;
    }

    const nextColumns = state.columns.filter((c) => c !== title);
    const fallbackStatus = nextColumns[0] || DEFAULT_KANBAN_COLUMNS[0];

    setState((prev) => ({
      ...prev,
      columns: nextColumns,
      subtasks: prev.subtasks.map((s) => (s.status === title ? { ...s, status: fallbackStatus } : s)),
    }));

    if (subStatus === title) setSubStatus(fallbackStatus);
    setError("");
  };

  const confirmCloseEnrollment = () => {
    setState((prev) => ({ ...prev, enrollmentClosed: true, participants: snapshotParticipants() }));
    setConfirmCloseEnrollmentOpen(false);
    setError("");
  };

  const {
    draggingSubtaskId,
    dragOverColumn,
    dragPreview,
    dragPreviewElRef,
    dragImageRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = usePlannerDrag({
    canEditTeam,
    onDropSubtask: (subtaskId, column) => {
      setState((prev) => ({
        ...prev,
        subtasks: prev.subtasks.map((subtask) =>
          Number(subtask.id) === Number(subtaskId) ? { ...subtask, status: column, inSprint: true } : subtask
        ),
      }));
    },
  });

  const taskCardParent = taskCard?.type === "parent"
    ? state.parentTasks.find((p) => Number(p.id) === Number(taskCard.id)) ?? null
    : null;
  const taskCardSubtask = taskCard?.type === "subtask"
    ? state.subtasks.find((s) => Number(s.id) === Number(taskCard.id)) ?? null
    : null;
  const taskCardTeamId = taskCardSubtask?.teamId ?? taskCardParent?.teamId;
  const taskCardTeam = taskCardTeamId ? state.teams.find((t) => Number(t.id) === Number(taskCardTeamId)) ?? null : null;
  const taskCardParentForSubtask = taskCardSubtask
    ? state.parentTasks.find((p) => Number(p.id) === Number(taskCardSubtask.parentTaskId)) ?? null
    : null;
  const taskCardSubtasksCount = taskCardParent
    ? state.subtasks.filter((s) => Number(s.parentTaskId) === Number(taskCardParent.id)).length
    : 0;
  const teamInfoTeam = teamInfoId != null ? state.teams.find((t) => Number(t.id) === Number(teamInfoId)) ?? null : null;
  const teamEditTeam = teamEditId != null ? state.teams.find((t) => Number(t.id) === Number(teamEditId)) ?? null : null;
  const teamEditCandidateIds = (() => {
    const ids = new Set<number>();
    if (teamEditTeam?.projectId) {
      requests.forEach((request) => {
        const ownerId = Number(request.ownerId);
        if (!Number.isFinite(ownerId)) return;
        if (Number(request.projectId) === Number(teamEditTeam.projectId)) {
          ids.add(ownerId);
        }
      });
    } else if (teamEditTeam?.sourceRequestIds?.length) {
      const sourceIds = new Set(teamEditTeam.sourceRequestIds.map((id) => Number(id)));
      requests.forEach((request) => {
        const ownerId = Number(request.ownerId);
        if (!Number.isFinite(ownerId)) return;
        if (sourceIds.has(Number(request.id))) {
          ids.add(ownerId);
        }
      });
    }
    (teamEditTeam?.memberIds || []).forEach((id) => ids.add(Number(id)));
    return Array.from(ids)
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => displayNameForUserId(a).localeCompare(displayNameForUserId(b), "ru"));
  })();

  if (!user) return <div className="page planner-page"><div className="planner-empty">Войдите для доступа к планировщику.</div></div>;
  if (loading) return <div className="page planner-page"><div className="planner-empty">Загрузка...</div></div>;
  if (isStudent && memberTeamIdsAll.length === 0) return <div className="page planner-page"><div className="planner-empty">Доступ откроется после подтверждения команды.</div></div>;

  return (
    <div className="page planner-page">
      <PlannerHeader visibleTeams={visibleTeams} teamFilter={teamFilter} onTeamFilterChange={setTeamFilter} />
      <PlannerTabs tab={tab} onChange={setTab} />
      {error && <div className="planner-error">{error}</div>}

      {tab === "teams" && (
        <TeamsTab
          isOrganizer={isOrganizer}
          state={state}
          applicantsTree={applicantsTree}
          selectedApplicantsByGroup={selectedApplicantsByGroup}
          teamNameByGroup={teamNameByGroup}
          teamCuratorByGroup={teamCuratorByGroup}
          currentUser={user}
          visibleTeams={visibleTeams}
          userNameById={userNameById}
          onOpenConfirmCloseEnrollment={() => setConfirmCloseEnrollmentOpen(true)}
          onSyncParticipants={() => setState((prev) => ({ ...prev, participants: snapshotParticipants() }))}
          onToggleApplicantForGroup={toggleApplicantForGroup}
          onTeamNameChange={(groupKey, value) => setTeamNameByGroup((prev) => ({ ...prev, [groupKey]: value }))}
          onTeamCuratorChange={(groupKey, value) => setTeamCuratorByGroup((prev) => ({ ...prev, [groupKey]: value }))}
          onCreateTeamFromGroup={createTeamFromGroup}
          onRenameTeam={(teamId, value) =>
            setState((prev) => ({ ...prev, teams: prev.teams.map((team) => (team.id === teamId ? { ...team, name: value } : team)) }))
          }
          onToggleTeamConfirmed={(teamId) =>
            setState((prev) => ({
              ...prev,
              teams: prev.teams.map((team) => (team.id === teamId ? { ...team, confirmed: !team.confirmed } : team)),
            }))
          }
          onOpenTeamInfo={openTeamInfo}
          onOpenTeamEdit={openTeamEdit}
          onDeleteTeam={(teamId) => setState((prev) => removeTeamCascade(prev, teamId))}
          sourceLabelForTeam={sourceLabelForTeam}
        />
      )}

      {tab === "backlog" && (
        <BacklogTab
          activeTeamName={activeTeam?.name || ""}
          parentTitle={parentTitle}
          parentStart={parentStart}
          parentEnd={parentEnd}
          onParentTitleChange={setParentTitle}
          onParentStartChange={setParentStart}
          onParentEndChange={setParentEnd}
          onAddParentTask={addParentTask}
          filteredParents={filteredParents}
          selectedParentId={selectedParentId}
          onSelectParent={setSelectedParentId}
          editingParentId={editingParentId}
          editingParentDraft={editingParentDraft}
          setEditingParentDraft={setEditingParentDraft}
          onOpenTaskCard={openTaskCard}
          onStartEditParent={startEditParent}
          onSaveEditedParent={saveEditedParent}
          onCancelEditParent={cancelEditParent}
          onDeleteParent={(parentId) =>
            setState((prev) => ({
              ...prev,
              parentTasks: prev.parentTasks.filter((parentTask) => parentTask.id !== parentId),
              subtasks: prev.subtasks.filter((subtask) => subtask.parentTaskId !== parentId),
            }))
          }
          canEditTeam={canEditTeam}
          selectedParent={selectedParent}
          selectedTeamMembers={selectedTeamMembers}
          subAssigneeId={subAssigneeId}
          subTitle={subTitle}
          subStart={subStart}
          subEnd={subEnd}
          subInSprint={subInSprint}
          subStatus={subStatus}
          columns={state.columns}
          onSubAssigneeChange={setSubAssigneeId}
          onSubTitleChange={setSubTitle}
          onSubStartChange={setSubStart}
          onSubEndChange={setSubEnd}
          onSubInSprintChange={setSubInSprint}
          onSubStatusChange={setSubStatus}
          onAddSubtask={addSubtask}
          filteredSubtasks={filteredSubtasks}
          editingSubtaskId={editingSubtaskId}
          editingSubtaskDraft={editingSubtaskDraft}
          setEditingSubtaskDraft={setEditingSubtaskDraft}
          getTeamMemberIds={getTeamMemberIds}
          displayAssigneeLabel={displayAssigneeLabel}
          onStartEditSubtask={startEditSubtask}
          onSaveEditedSubtask={saveEditedSubtask}
          onCancelEditSubtask={cancelEditSubtask}
          onDeleteSubtask={(subtaskId) =>
            setState((prev) => ({ ...prev, subtasks: prev.subtasks.filter((subtask) => subtask.id !== subtaskId) }))
          }
        />
      )}

      {tab === "kanban" && (
        <KanbanTab
          newColumn={newColumn}
          columns={state.columns}
          filteredSubtasks={filteredSubtasks}
          draggingSubtaskId={draggingSubtaskId}
          dragOverColumn={dragOverColumn}
          dragPreview={dragPreview}
          dragPreviewElRef={dragPreviewElRef}
          dragImageRef={dragImageRef}
          canEditTeam={canEditTeam}
          onNewColumnChange={setNewColumn}
          onAddColumn={() => {
            const title = newColumn.trim();
            if (!title) return;
            if (state.columns.some((column) => column.toLowerCase() === title.toLowerCase())) return;
            setState((prev) => ({ ...prev, columns: [...prev.columns, title] }));
            setNewColumn("");
          }}
          onRemoveColumn={removeKanbanColumn}
          onOpenTaskCard={openTaskCard}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}

      {tab === "gantt" && (
        <GanttTab
          activeTeamName={activeTeam?.name || ""}
          parents={filteredParents}
          subtasks={filteredSubtasks}
          displayAssigneeLabel={displayAssigneeLabel}
          onOpenTaskCard={openTaskCard}
        />
      )}

      <ConfirmCloseEnrollmentModal
        isOpen={confirmCloseEnrollmentOpen}
        onClose={() => setConfirmCloseEnrollmentOpen(false)}
        onConfirm={confirmCloseEnrollment}
      />
      <TeamInfoModal
        isOpen={teamInfoOpen}
        team={teamInfoTeam}
        specializationByOwnerId={specializationByOwnerId}
        displayNameForUserId={displayNameForUserId}
        onClose={closeTeamInfo}
      />
      <TeamEditModal
        isOpen={teamEditOpen}
        team={teamEditTeam}
        teamEditMembers={teamEditMembers}
        candidateIds={teamEditCandidateIds}
        displayAssigneeLabel={displayAssigneeLabel}
        onToggleMember={toggleTeamEditMember}
        onClose={closeTeamEdit}
        onSave={saveTeamEdit}
      />
      <TaskCardModal
        isOpen={taskCardOpen}
        taskCardParent={taskCardParent}
        taskCardSubtask={taskCardSubtask}
        taskCardTeam={taskCardTeam}
        taskCardParentForSubtask={taskCardParentForSubtask}
        taskCardSubtasksCount={taskCardSubtasksCount}
        displayAssigneeLabel={displayAssigneeLabel}
        sourceLabelForTeam={sourceLabelForTeam}
        onClose={closeTaskCard}
      />
    </div>
  );
}












