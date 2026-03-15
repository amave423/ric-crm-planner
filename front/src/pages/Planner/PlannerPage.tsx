import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
import Modal from "../../components/Modal/Modal";
import infoIcon from "../../assets/icons/info.svg";
import "./planner.scss";

type Tab = "teams" | "backlog" | "kanban" | "gantt";
type ParentEditDraft = { title: string; startDate: string; endDate: string };
type SubtaskEditDraft = { title: string; assigneeId?: number; startDate: string; endDate: string; status: string; inSprint: boolean };
type ProjectApplicantsGroup = {
  key: string;
  eventId?: number;
  directionId?: number;
  projectId?: number;
  eventTitle: string;
  directionTitle: string;
  projectTitle: string;
  applicants: Array<{ ownerId: number; name: string; status?: string; requestIds: number[] }>;
};

function buildGanttTicks(minDate: string, maxDate: string, span: number) {
  if (!minDate || !maxDate) return [];
  const start = new Date(minDate);
  const end = new Date(maxDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000));
  const step = days > 90 ? 14 : days > 45 ? 7 : days > 21 ? 3 : 1;
  const ticks: Array<{ offset: number; label: string }> = [];
  for (let d = 0; d <= days; d += step) {
    const date = new Date(start.getTime() + d * 86400000);
    const label = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    ticks.push({ offset: (d / span) * 100, label });
  }
  return ticks;
}

const fullName = (u: User) => `${u.surname || ""} ${u.name || ""}`.trim();

function roleFlags(roleRaw?: string) {
  const role = String(roleRaw || "").toLowerCase();
  return {
    isOrganizer: role === "organizer" || role.includes("admin"),
    isCurator: role.includes("curator"),
    isStudent: role === "student" || role.includes("project"),
  };
}

export default function PlannerPage() {
  const { user } = useContext(AuthContext);
  const { isOrganizer, isCurator, isStudent } = roleFlags(user?.role);
  const userId = Number(user?.id || 0);

  const [tab, setTab] = useState<Tab>(() => {
    const raw = localStorage.getItem("planner_tab_v1");
    if (raw === "teams" || raw === "backlog" || raw === "kanban" || raw === "gantt") return raw;
    return "teams";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPlannerLoaded, setIsPlannerLoaded] = useState(false);
  const [teamFilter, setTeamFilter] = useState("all");
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

  const [parentTeamId, setParentTeamId] = useState("");
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
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ subtask: PlannerSubtask; x: number; y: number; width: number; tilt: number } | null>(null);
  const dragTargetRef = useRef<{ x: number; y: number; tilt: number } | null>(null);
  const dragPreviewRef = useRef<{ subtask: PlannerSubtask; x: number; y: number; width: number; tilt: number } | null>(null);
  const dragAnimRef = useRef<number | null>(null);
  const dragPreviewElRef = useRef<HTMLDivElement | null>(null);
  const [editingParentId, setEditingParentId] = useState<number | null>(null);
  const [editingParentDraft, setEditingParentDraft] = useState<ParentEditDraft | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskDraft, setEditingSubtaskDraft] = useState<SubtaskEditDraft | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isPlannerLoaded) return;
    void savePlannerState(state);
  }, [isPlannerLoaded, state]);

  useEffect(() => {
    localStorage.setItem("planner_tab_v1", tab);
  }, [tab]);

  useEffect(() => {
    if (!dragOffset || dragStartX == null || !draggingSubtaskId) return;
    const handleGlobalDragOver = (e: DragEvent) => {
      if (!e.clientX && !e.clientY) return;
      const deltaX = e.clientX - dragStartX;
      const tilt = Math.abs(deltaX) >= 12 ? (deltaX > 0 ? 6 : -6) : 0;
      dragTargetRef.current = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
        tilt,
      };
    };
    window.addEventListener("dragover", handleGlobalDragOver);
    return () => window.removeEventListener("dragover", handleGlobalDragOver);
  }, [dragOffset, dragStartX, draggingSubtaskId]);

  useEffect(() => {
    if (!draggingSubtaskId) return;
    const step = () => {
      const target = dragTargetRef.current;
      const current = dragPreviewRef.current;
      if (target && current) {
        const lerp = (a: number, b: number) => a + (b - a) * 0.18;
        const next = {
          ...current,
          x: lerp(current.x, target.x),
          y: lerp(current.y, target.y),
          tilt: lerp(current.tilt, target.tilt),
        };
        dragPreviewRef.current = next;
        const el = dragPreviewElRef.current;
        if (el) {
          el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.tilt}deg)`;
        }
      }
      dragAnimRef.current = requestAnimationFrame(step);
    };
    dragAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (dragAnimRef.current) cancelAnimationFrame(dragAnimRef.current);
      dragAnimRef.current = null;
    };
  }, [draggingSubtaskId]);

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
  const filteredParents = state.parentTasks.filter(
    (p) => canViewTeam(p.teamId) && (teamFilter === "all" || Number(teamFilter) === Number(p.teamId))
  );
  const selectedParent = filteredParents.find((p) => Number(p.id) === Number(selectedParentId));
  const filteredSubtasks = state.subtasks.filter(
    (s) => canViewTeam(s.teamId) && (teamFilter === "all" || Number(teamFilter) === Number(s.teamId))
  );
  const displayNameForUserId = (id: number) =>
    participantNameById.get(id) || userNameById.get(id) || `Участник #${id}`;
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

  const applicantsTree = useMemo(() => {
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
        const fullName = group.applicants.find((a) => a.ownerId === id)?.name || userNameById.get(id) || `Участник #${id}`;
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
    const teamId = Number(parentTeamId);
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

  const ganttRows: Array<{ key: string; label: string; start: string; end: string; type: "parent" | "sub" }> = filteredParents.flatMap(
    (p) => [
      { key: `p_${p.id}`, label: p.title, start: p.startDate, end: p.endDate, type: "parent" as const },
      ...filteredSubtasks
        .filter((s) => Number(s.parentTaskId) === Number(p.id))
        .map((s) => ({ key: `s_${s.id}`, label: `L ${s.title}`, start: s.startDate, end: s.endDate, type: "sub" as const })),
    ]
  );
  const minDate = ganttRows.reduce((acc, r) => (!acc || r.start < acc ? r.start : acc), "");
  const maxDate = ganttRows.reduce((acc, r) => (!acc || r.end > acc ? r.end : acc), "");
  const span = minDate && maxDate ? Math.max(1, Math.floor((Date.parse(maxDate) - Date.parse(minDate)) / 86400000) + 1) : 1;
  const ganttTicks = buildGanttTicks(minDate, maxDate, span);

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, subtask: PlannerSubtask, teamId: number) => {
    if (!canEditTeam(teamId)) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(subtask.id));
    if (dragImageRef.current) e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragOffset({ x: offsetX, y: offsetY });
    setDragStartX(e.clientX || null);
    const preview = {
      subtask,
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
      width: rect.width,
      tilt: 0,
    };
    dragPreviewRef.current = preview;
    dragTargetRef.current = { x: preview.x, y: preview.y, tilt: 0 };
    setDragPreview(preview);
    setDraggingSubtaskId(subtask.id);
  };

  const handleDragMove = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragStartX == null || !dragOffset) return;
    if (!e.clientX && !e.clientY) return;
    const deltaX = e.clientX - dragStartX;
    const tilt = Math.abs(deltaX) >= 12 ? (deltaX > 0 ? 6 : -6) : 0;
    dragTargetRef.current = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
      tilt,
    };
  };

  const handleDragEnd = () => {
    setDraggingSubtaskId(null);
    setDragOverColumn(null);
    setDragStartX(null);
    setDragOffset(null);
    setDragPreview(null);
    dragTargetRef.current = null;
    dragPreviewRef.current = null;
    if (dragAnimRef.current) cancelAnimationFrame(dragAnimRef.current);
    dragAnimRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, column: string) => {
    e.preventDefault();
    if (dragOverColumn !== column) setDragOverColumn(column);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, column: string) => {
    if (dragOverColumn !== column) return;
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, column: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const subtaskId = Number(raw);
    if (!subtaskId) return;
    setState((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) =>
        Number(s.id) === Number(subtaskId)
          ? { ...s, status: column, inSprint: true }
          : s
      ),
    }));
    setDraggingSubtaskId(null);
    setDragOverColumn(null);
    setDragStartX(null);
    setDragOffset(null);
    setDragPreview(null);
    dragTargetRef.current = null;
    dragPreviewRef.current = null;
    if (dragAnimRef.current) cancelAnimationFrame(dragAnimRef.current);
    dragAnimRef.current = null;
  };

  if (!user) return <div className="page planner-page"><div className="planner-empty">Войдите для доступа к планировщику.</div></div>;
  if (loading) return <div className="page planner-page"><div className="planner-empty">Загрузка...</div></div>;
  if (isStudent && memberTeamIdsAll.length === 0) return <div className="page planner-page"><div className="planner-empty">Доступ откроется после подтверждения команды.</div></div>;

  return (
    <div className="page planner-page">
      <div className="planner-head">
        <h1 className="h1">Планировщик</h1>
        <label className="planner-label">
          Команда
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            {(isOrganizer || isCurator) && <option value="all">Все команды</option>}
            {visibleTeams.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <div className="planner-tabs">
        <button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}>Команды</button>
        <button className={tab === "backlog" ? "active" : ""} onClick={() => setTab("backlog")}>Бэклог</button>
        <button className={tab === "kanban" ? "active" : ""} onClick={() => setTab("kanban")}>Канбан</button>
        <button className={tab === "gantt" ? "active" : ""} onClick={() => setTab("gantt")}>Гант</button>
      </div>
      {error && <div className="planner-error">{error}</div>}

      {tab === "teams" && <div className="planner-card">
        {isOrganizer && <div className="planner-row planner-row--right">
          {!state.enrollmentClosed
            ? <button className="primary" onClick={() => setConfirmCloseEnrollmentOpen(true)}>Завершить набор</button>
            : <button className="primary" onClick={() => setState((p) => ({ ...p, participants: snapshotParticipants() }))}>Обновить пул</button>}
        </div>}
        {isOrganizer && <div className="planner-source-tree">
          {applicantsTree.length === 0
            ? <div className="planner-empty-inline">Нет заявок для формирования команд.</div>
            : applicantsTree.map((eventNode) => <details key={eventNode.key} className="planner-source-node planner-source-node--event" open>
                <summary className="planner-source-summary">
                  <span>Мероприятие: {eventNode.title}</span>
                </summary>
                <div className="planner-source-content">
                  {eventNode.directions.map((directionNode) => <details key={directionNode.key} className="planner-source-node planner-source-node--direction">
                    <summary className="planner-source-summary">
                      <span>Направление: {directionNode.title}</span>
                    </summary>
                    <div className="planner-source-content">
                      {directionNode.projects.map((group) => <details key={group.key} className="planner-source-node planner-source-node--project">
                        <summary className="planner-source-summary">
                          <span>Проект: {group.projectTitle}</span>
                          <span className="planner-source-meta">{group.applicants.length} заявок</span>
                        </summary>
                        <div className="planner-source-content">
                          <div className="planner-members-grid">
                            {group.applicants.map((a) => <label key={`${group.key}:${a.ownerId}`} className="planner-check planner-applicant-row">
                              <input
                                type="checkbox"
                                checked={(selectedApplicantsByGroup[group.key] || []).includes(a.ownerId)}
                                onChange={() => toggleApplicantForGroup(group.key, a.ownerId)}
                              />
                              <span>{a.name}{a.status ? ` (${a.status})` : ""}</span>
                            </label>)}
                          </div>
                          <div className="planner-grid planner-grid--team-from-project">
                            <input
                              value={teamNameByGroup[group.key] || ""}
                              onChange={(e) => setTeamNameByGroup((prev) => ({ ...prev, [group.key]: e.target.value }))}
                              placeholder="Название команды (обязательно)"
                            />
                            <select
                              value={teamCuratorByGroup[group.key] || ""}
                              onChange={(e) => setTeamCuratorByGroup((prev) => ({ ...prev, [group.key]: e.target.value }))}
                            >
                              <option value="" disabled>Куратор (из заявок проекта)</option>
                              {!group.applicants.some((a) => Number(a.ownerId) === Number(user.id)) && (
                                <option value={String(user.id)}>
                                  Организатор: {fullName(user) || user.email || `ID ${user.id}`}
                                </option>
                              )}
                              {group.applicants.map((a) => <option key={`${group.key}:curator:${a.ownerId}`} value={String(a.ownerId)}>{a.name}</option>)}
                            </select>
                            <button className="primary" onClick={() => createTeamFromGroup(group)}>Сформировать команду</button>
                          </div>
                        </div>
                      </details>)}
                    </div>
                  </details>)}
                </div>
              </details>)}
        </div>}
        <div className="teams-list">
          {state.teams.filter((t) => canViewTeam(t.id)).map((t) => <div key={t.id} className="team-item">
            <div className="team-top">
              {isOrganizer ? <input value={t.name} onChange={(e) => setState((p) => ({ ...p, teams: p.teams.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x) }))} /> : <div className="team-title">{t.name}</div>}
              {isOrganizer ? (
                <div className={`team-badge ${t.confirmed ? "ok" : "draft"}`}>{t.confirmed ? "Подтверждена" : "Черновик"}</div>
              ) : (
                <div className="team-badge-stack">
                  <div className={`team-badge ${t.confirmed ? "ok" : "draft"}`}>{t.confirmed ? "Подтверждена" : "Черновик"}</div>
                  <button className="info-icon-btn" onClick={() => openTeamInfo(t.id)} aria-label="Информация о команде">
                    <img src={infoIcon} alt="info" />
                  </button>
                </div>
              )}
            </div>
            <div className="team-value">Куратор: {t.curatorId ? userNameById.get(t.curatorId) || `ID ${t.curatorId}` : "—"}</div>
            <div className="team-value">Участники: {t.memberIds.length}</div>
            {sourceLabelForTeam(t) && <div className="team-value">Источник: {sourceLabelForTeam(t)}</div>}
            {isOrganizer && (
              <div className="team-actions">
                <button className="primary" onClick={() => setState((p) => ({ ...p, teams: p.teams.map((x) => x.id === t.id ? { ...x, confirmed: !x.confirmed } : x) }))}>{t.confirmed ? "Снять подтверждение" : "Подтвердить"}</button>
                <button className="danger-outline" onClick={() => setState((p) => removeTeamCascade(p, t.id))}>Удалить</button>
              </div>
            )}
          </div>)}
        </div>
      </div>}

      {tab === "backlog" && <div className="planner-stack">
        <div className="planner-card">
          <div className="planner-grid planner-grid--parent-create">
            <select value={parentTeamId} onChange={(e) => setParentTeamId(e.target.value)}><option value="">Команда</option>{visibleTeams.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}</select>
            <input value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="Большая задача" />
            <input type="date" value={parentStart} onChange={(e) => setParentStart(e.target.value)} />
            <input type="date" value={parentEnd} onChange={(e) => setParentEnd(e.target.value)} />
            <button className="primary" onClick={addParentTask}>Добавить большую задачу</button>
          </div>
          <div className="backlog-list">{filteredParents.map((p) => <div key={p.id} className={`backlog-parent ${selectedParentId === p.id ? "active" : ""}`}>
            <div className="backlog-parent-main" onClick={() => (editingParentId !== p.id ? setSelectedParentId(p.id) : undefined)}>
              {editingParentId === p.id && editingParentDraft
                ? <div className="planner-inline-edit">
                    <input
                      value={editingParentDraft.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingParentDraft((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                    />
                    <div className="planner-inline-edit-row">
                      <input
                        type="date"
                        value={editingParentDraft.startDate}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingParentDraft((prev) => prev ? { ...prev, startDate: e.target.value } : prev)}
                      />
                      <input
                        type="date"
                        value={editingParentDraft.endDate}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingParentDraft((prev) => prev ? { ...prev, endDate: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                : <>
                    <div className="title">{p.title}</div><div className="meta"><span>{p.startDate}</span><span>{p.endDate}</span></div>
                  </>}
            </div>
            {canEditTeam(p.teamId) && <div className="planner-item-actions">
              {editingParentId === p.id
                ? <>
                    <button className="link-btn" onClick={saveEditedParent}>Сохранить</button>
                    <button className="link-btn" onClick={cancelEditParent}>Отмена</button>
                  </>
                : <button className="link-btn" onClick={() => startEditParent(p.id)}>Редактировать</button>}
              <button className="link-btn danger" onClick={() => setState((prev) => ({ ...prev, parentTasks: prev.parentTasks.filter((x) => x.id !== p.id), subtasks: prev.subtasks.filter((x) => x.parentTaskId !== p.id) }))}>Удалить</button>
            </div>}
          </div>)}</div>
        </div>
        <div className="planner-card">
          <h3 className="h3">Подзадачи</h3>
          {selectedParent && <div className="planner-grid planner-grid--4">
            <select
              value={subAssigneeId}
              onChange={(e) => setSubAssigneeId(e.target.value)}
              disabled={selectedTeamMembers.length === 0}
            >
              <option value="" disabled>Ответственный</option>
              {selectedTeamMembers.map((id) => (
                <option key={`assignee-${id}`} value={String(id)}>{displayAssigneeLabel(Number(id))}</option>
              ))}
            </select>
            <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Подзадача" />
            <input type="date" value={subStart} onChange={(e) => setSubStart(e.target.value)} />
            <input type="date" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
            <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>{state.columns.map((c) => <option key={c}>{c}</option>)}</select>
            <label className="planner-check planner-check--inline"><input type="checkbox" checked={subInSprint} onChange={(e) => setSubInSprint(e.target.checked)} /><span>В спринт</span></label>
            <button className="primary" onClick={addSubtask}>Добавить подзадачу</button>
          </div>}
          <div className="subtask-list">{filteredSubtasks.filter((s) => Number(s.parentTaskId) === Number(selectedParentId)).map((s) => <div key={s.id} className="subtask-item">
            <div className="subtask-main">
              {editingSubtaskId === s.id && editingSubtaskDraft
                  ? <div className="planner-inline-edit">
                    <div className="planner-inline-edit-row">
                      <select
                        value={editingSubtaskDraft.assigneeId ?? ""}
                        onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, assigneeId: Number(e.target.value) } : prev)}
                      >
                        <option value="" disabled>Ответственный</option>
                        {getTeamMemberIds(s.teamId).map((id) => (
                          <option key={`edit-assignee-${s.id}-${id}`} value={String(id)}>{displayAssigneeLabel(Number(id))}</option>
                        ))}
                      </select>
                      <input value={editingSubtaskDraft.title} onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, title: e.target.value } : prev)} placeholder="Подзадача" />
                    </div>
                    <div className="planner-inline-edit-row">
                      <input type="date" value={editingSubtaskDraft.startDate} onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, startDate: e.target.value } : prev)} />
                      <input type="date" value={editingSubtaskDraft.endDate} onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, endDate: e.target.value } : prev)} />
                      <select value={editingSubtaskDraft.status} onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, status: e.target.value } : prev)}>
                        {state.columns.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <label className="planner-check">
                      <input type="checkbox" checked={editingSubtaskDraft.inSprint} onChange={(e) => setEditingSubtaskDraft((prev) => prev ? { ...prev, inSprint: e.target.checked } : prev)} />
                      <span>В спринт</span>
                    </label>
                  </div>
                  : <>
                    <div className="title">{s.title}</div><div className="meta"><span>{s.assigneeId ? displayAssigneeLabel(s.assigneeId) : s.role}</span><span>{s.startDate} — {s.endDate}</span><span>{s.status}</span></div>
                  </>}
            </div>
            {canEditTeam(s.teamId) && <div className="planner-item-actions">
              {editingSubtaskId === s.id
                ? <>
                    <button className="link-btn" onClick={saveEditedSubtask}>Сохранить</button>
                    <button className="link-btn" onClick={cancelEditSubtask}>Отмена</button>
                  </>
                : <button className="link-btn" onClick={() => startEditSubtask(s.id)}>Редактировать</button>}
              <button className="link-btn danger" onClick={() => setState((p) => ({ ...p, subtasks: p.subtasks.filter((x) => x.id !== s.id) }))}>Удалить</button>
            </div>}
          </div>)}</div>
        </div>
      </div>}

      {tab === "kanban" && <div className="planner-stack">
        <div className="planner-card">
          <div className="planner-inline-form">
            <input value={newColumn} onChange={(e) => setNewColumn(e.target.value)} placeholder="Кастомный статус" />
            <button className="primary" onClick={() => {
              const title = newColumn.trim();
              if (!title) return;
              if (state.columns.some((c) => c.toLowerCase() === title.toLowerCase())) return;
              setState((p) => ({ ...p, columns: [...p.columns, title] }));
              setNewColumn("");
            }}>Добавить</button>
          </div>
        </div>
        <div className="kanban-board">{state.columns.map((col) => <div key={col} className={`kanban-column${dragOverColumn === col ? " drag-over" : ""}`}>
          <div className="kanban-column-title"><span>{col}</span><button className="kanban-column-remove" onClick={() => removeKanbanColumn(col)} title="Удалить колонку" aria-label="Удалить колонку">{"\u00d7"}</button></div>
          <div
            className="kanban-column-body"
            onDragOver={(e) => handleDragOver(e, col)}
            onDragLeave={(e) => handleDragLeave(e, col)}
            onDrop={(e) => handleDrop(e, col)}
          >
            {filteredSubtasks.filter((s) => s.inSprint && s.status === col).map((s) => (
              <div
                key={s.id}
                className={`kanban-card${draggingSubtaskId === s.id ? " dragging" : ""}`}
                draggable={canEditTeam(s.teamId)}
                onDragStart={(e) => handleDragStart(e, s, s.teamId)}
                onDrag={handleDragMove}
                onDragEnd={handleDragEnd}
              >
            <div className="kanban-card-title">{s.title}</div><div className="kanban-card-meta">{s.startDate} — {s.endDate}</div>
              </div>
            ))}
          </div>
        </div>)}</div>
        {dragPreview && (
          <div
            className="kanban-card drag-preview"
            ref={dragPreviewElRef}
            style={{
              width: dragPreview.width,
              transform: `translate3d(${dragPreview.x}px, ${dragPreview.y}px, 0) rotate(${dragPreview.tilt}deg)`,
            } as React.CSSProperties}
          >
            <div className="kanban-card-title">{dragPreview.subtask.title}</div>
            <div className="kanban-card-meta">{dragPreview.subtask.startDate} — {dragPreview.subtask.endDate}</div>
          </div>
        )}
        <div ref={dragImageRef} className="kanban-drag-image" />
      </div>}

      {tab === "gantt" && <div className="planner-card">
        <h3 className="h3">Диаграмма Ганта</h3>
        {ganttRows.length === 0 ? <div className="planner-empty-inline">Нет задач для отображения.</div> : <>
          <div className="gantt-range"><span>{minDate}</span><span>{maxDate}</span></div>
          <div className="gantt-axis">
            <div className="gantt-axis-spacer" />
            <div className="gantt-axis-track">
              {ganttTicks.map((t) => (
                <div key={`${t.offset}-${t.label}`} className="gantt-axis-tick" style={{ left: `${t.offset}%` }}>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gantt-rows">{ganttRows.map((r) => {
            const startOffset = Math.floor((Date.parse(r.start) - Date.parse(minDate)) / 86400000);
            const endOffset = Math.floor((Date.parse(r.end) - Date.parse(minDate)) / 86400000);
            const left = `${Math.max(0, (startOffset / span) * 100)}%`;
            const width = `${Math.max(1.5, ((endOffset - startOffset + 1) / span) * 100)}%`;
            return <div key={r.key} className={`gantt-row ${r.type}`}><div className="gantt-label">{r.label}</div><div className="gantt-track"><div className="gantt-bar" style={{ left, width }} /></div></div>;
          })}</div>
        </>}
      </div>}

      <Modal isOpen={confirmCloseEnrollmentOpen} onClose={() => setConfirmCloseEnrollmentOpen(false)} title="Подтверждение">
        <div className="confirm-body">
          <div className="confirm-text">Завершить набор участников и зафиксировать текущий пул?</div>
          <div className="confirm-actions">
            <button className="link-btn" onClick={() => setConfirmCloseEnrollmentOpen(false)}>
              Отмена
            </button>
            <button className="primary" onClick={confirmCloseEnrollment}>
              Подтвердить
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={teamInfoOpen} onClose={closeTeamInfo} title="Состав команды">
        <div className="confirm-body">
          {teamInfoId == null ? (
            <div className="confirm-text">Команда не выбрана.</div>
          ) : (
            <>
              <div className="confirm-text">
                {state.teams.find((t) => t.id === teamInfoId)?.name || "Команда"}
              </div>
              <div className="planner-team-info-list">
                {(state.teams.find((t) => t.id === teamInfoId)?.memberIds || []).map((id) => (
                  <div key={`team-info-${teamInfoId}-${id}`} className="planner-team-info-row">
                    <div className="planner-team-info-name">{displayNameForUserId(id)}</div>
                    <div className="planner-team-info-role">{specializationByOwnerId.get(id) || "—"}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}








