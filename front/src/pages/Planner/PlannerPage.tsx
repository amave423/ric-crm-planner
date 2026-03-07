import { useContext, useEffect, useMemo, useState } from "react";
import { buildParticipantsFromRequests, getPlannerState, savePlannerState, syncParticipants } from "../../api/planner";
import { getRequests } from "../../api/requests";
import { AuthContext } from "../../context/AuthContext";
import { DEFAULT_KANBAN_COLUMNS, nextPlannerId, removeTeamCascade } from "../../storage/planner";
import { getAllUsers } from "../../storage/storage";
import type { PlannerState, PlannerSubtask, PlannerTeam } from "../../types/planner";
import type { Request } from "../../types/request";
import type { User } from "../../types/user";
import Modal from "../../components/Modal/Modal";
import "./planner.scss";

type Tab = "teams" | "backlog" | "kanban" | "gantt";

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

  const [tab, setTab] = useState<Tab>("teams");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  const [teamName, setTeamName] = useState("");
  const [teamCuratorId, setTeamCuratorId] = useState("");
  const [teamMembers, setTeamMembers] = useState<number[]>([]);

  const [parentTeamId, setParentTeamId] = useState("");
  const [parentTitle, setParentTitle] = useState("");
  const [parentStart, setParentStart] = useState("");
  const [parentEnd, setParentEnd] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const [subTitle, setSubTitle] = useState("");
  const [subRole, setSubRole] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [subInSprint, setSubInSprint] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const [confirmCloseEnrollmentOpen, setConfirmCloseEnrollmentOpen] = useState(false);

  useEffect(() => {
    void savePlannerState(state);
  }, [state]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
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
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isOrganizer, user?.id, user?.role]);

  const userNameById = useMemo(() => new Map(users.map((u) => [Number(u.id), fullName(u) || u.email])), [users]);
  const curators = useMemo(
    () => users.filter((u) => ["organizer", "admin"].includes(String(u.role || "").toLowerCase()) || String(u.role || "").toLowerCase().includes("curator")),
    [users]
  );
  const memberTeamIds = useMemo(() => state.teams.filter((t) => t.confirmed && t.memberIds.includes(userId)).map((t) => t.id), [state.teams, userId]);
  const curatorTeamIds = useMemo(() => state.teams.filter((t) => Number(t.curatorId) === userId).map((t) => t.id), [state.teams, userId]);
  const canViewTeam = (teamId: number) => isOrganizer || isCurator || (isStudent && memberTeamIds.includes(teamId));
  const canEditTeam = (teamId: number) => isOrganizer || (isCurator && curatorTeamIds.includes(teamId)) || (isStudent && memberTeamIds.includes(teamId));

  const visibleTeams = state.teams.filter((t) => canViewTeam(t.id));
  const filteredParents = state.parentTasks.filter(
    (p) => canViewTeam(p.teamId) && (teamFilter === "all" || Number(teamFilter) === Number(p.teamId))
  );
  const selectedParent = filteredParents.find((p) => Number(p.id) === Number(selectedParentId));
  const filteredSubtasks = state.subtasks.filter(
    (s) => canViewTeam(s.teamId) && (teamFilter === "all" || Number(teamFilter) === Number(s.teamId))
  );

  useEffect(() => {
    if (!subStatus && state.columns[0]) setSubStatus(state.columns[0]);
  }, [state.columns, subStatus]);

  if (!user) return <div className="page planner-page"><div className="planner-empty">Войдите для доступа к планировщику.</div></div>;
  if (loading) return <div className="page planner-page"><div className="planner-empty">Загрузка...</div></div>;
  if (isStudent && memberTeamIds.length === 0) return <div className="page planner-page"><div className="planner-empty">Доступ откроется после подтверждения команды.</div></div>;

  const snapshotParticipants = () => buildParticipantsFromRequests(users, requests);

  const addTeam = () => {
    if (!teamName.trim()) return setError("Введите название команды");
    if (teamMembers.length === 0) return setError("Выберите участников");
    const created: PlannerTeam = {
      id: nextPlannerId(state.teams),
      name: teamName.trim(),
      curatorId: teamCuratorId ? Number(teamCuratorId) : undefined,
      memberIds: [...teamMembers],
      confirmed: false,
    };
    setState((prev) => ({ ...prev, teams: [...prev.teams, created] }));
    setTeamName("");
    setTeamCuratorId("");
    setTeamMembers([]);
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
    if (!subTitle.trim() || !subRole.trim() || !subStart || !subEnd || subStart > subEnd) return setError("Проверьте поля подзадачи");
    if (subStart < selectedParent.startDate || subEnd > selectedParent.endDate) return setError("Сроки подзадачи вне диапазона большой задачи");
    const created: PlannerSubtask = {
      id: nextPlannerId(state.subtasks),
      teamId: selectedParent.teamId,
      parentTaskId: selectedParent.id,
      title: subTitle.trim(),
      role: subRole.trim(),
      startDate: subStart,
      endDate: subEnd,
      status: subStatus || state.columns[0],
      inSprint: subInSprint,
    };
    setState((prev) => ({ ...prev, subtasks: [...prev.subtasks, created] }));
    setSubTitle("");
    setSubRole("");
    setSubStart("");
    setSubEnd("");
    setSubInSprint(false);
    setError("");
  };

  const ganttRows: Array<{ key: string; label: string; start: string; end: string; type: "parent" | "sub" }> = filteredParents.flatMap(
    (p) => [
      { key: `p_${p.id}`, label: p.title, start: p.startDate, end: p.endDate, type: "parent" as const },
      ...filteredSubtasks
        .filter((s) => Number(s.parentTaskId) === Number(p.id))
        .map((s) => ({ key: `s_${s.id}`, label: `└ ${s.title}`, start: s.startDate, end: s.endDate, type: "sub" as const })),
    ]
  );
  const minDate = ganttRows.reduce((acc, r) => (!acc || r.start < acc ? r.start : acc), "");
  const maxDate = ganttRows.reduce((acc, r) => (!acc || r.end > acc ? r.end : acc), "");
  const span = minDate && maxDate ? Math.max(1, Math.floor((Date.parse(maxDate) - Date.parse(minDate)) / 86400000) + 1) : 1;

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

  return (
    <div className="page planner-page">
      <div className="planner-head">
        <h1 className="h1">Планировщик</h1>
        <label className="planner-label">
          Команда
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="all">Все команды</option>
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
        {isOrganizer && <div className="planner-grid planner-grid--team-create">
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Название команды" />
          <select value={teamCuratorId} onChange={(e) => setTeamCuratorId(e.target.value)}>
            <option value="">Куратор</option>
            {curators.map((c) => <option key={c.id} value={String(c.id)}>{fullName(c)}</option>)}
          </select>
          <div className="planner-team-actions">
            {!state.enrollmentClosed
              ? <button className="primary" onClick={() => setConfirmCloseEnrollmentOpen(true)}>Завершить набор</button>
              : <button className="primary" onClick={() => setState((p) => ({ ...p, participants: snapshotParticipants() }))}>Обновить пул</button>}
            <button className="primary" onClick={addTeam}>Сформировать команду</button>
          </div>
        </div>}
        {isOrganizer && <div className="planner-members-grid">{state.participants.map((p) => (
          <label key={p.id} className="planner-check"><input type="checkbox" checked={teamMembers.includes(p.id)} onChange={() => setTeamMembers((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])} /><span>{p.fullName}</span></label>
        ))}</div>}
        <div className="teams-list">
          {state.teams.filter((t) => canViewTeam(t.id)).map((t) => <div key={t.id} className="team-item">
            <div className="team-top">
              {isOrganizer ? <input value={t.name} onChange={(e) => setState((p) => ({ ...p, teams: p.teams.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x) }))} /> : <div className="team-title">{t.name}</div>}
              <div className={`team-badge ${t.confirmed ? "ok" : "draft"}`}>{t.confirmed ? "Подтверждена" : "Черновик"}</div>
            </div>
            <div className="team-value">Куратор: {t.curatorId ? userNameById.get(t.curatorId) || `ID ${t.curatorId}` : "—"}</div>
            {isOrganizer && <div className="team-actions">
              <button className="primary" onClick={() => setState((p) => ({ ...p, teams: p.teams.map((x) => x.id === t.id ? { ...x, confirmed: !x.confirmed } : x) }))}>{t.confirmed ? "Снять подтверждение" : "Подтвердить"}</button>
              <button className="danger-outline" onClick={() => setState((p) => removeTeamCascade(p, t.id))}>Удалить</button>
            </div>}
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
            <div className="backlog-parent-main" onClick={() => setSelectedParentId(p.id)}>
              <div className="title">{p.title}</div><div className="meta"><span>{p.startDate}</span><span>{p.endDate}</span></div>
            </div>
            {canEditTeam(p.teamId) && <button className="link-btn danger" onClick={() => setState((prev) => ({ ...prev, parentTasks: prev.parentTasks.filter((x) => x.id !== p.id), subtasks: prev.subtasks.filter((x) => x.parentTaskId !== p.id) }))}>Удалить</button>}
          </div>)}</div>
        </div>
        <div className="planner-card">
          <h3 className="h3">Подзадачи</h3>
          {selectedParent && <div className="planner-grid planner-grid--4">
            <input value={subRole} onChange={(e) => setSubRole(e.target.value)} placeholder="Роль" />
            <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Подзадача" />
            <input type="date" value={subStart} onChange={(e) => setSubStart(e.target.value)} />
            <input type="date" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
            <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>{state.columns.map((c) => <option key={c}>{c}</option>)}</select>
            <label className="planner-check planner-check--inline"><input type="checkbox" checked={subInSprint} onChange={(e) => setSubInSprint(e.target.checked)} /><span>В спринт</span></label>
            <button className="primary" onClick={addSubtask}>Добавить подзадачу</button>
          </div>}
          <div className="subtask-list">{filteredSubtasks.filter((s) => Number(s.parentTaskId) === Number(selectedParentId)).map((s) => <div key={s.id} className="subtask-item">
            <div className="subtask-main"><div className="title">{s.title}</div><div className="meta"><span>{s.role}</span><span>{s.startDate} — {s.endDate}</span><span>{s.status}</span></div></div>
            {canEditTeam(s.teamId) && <button className="link-btn danger" onClick={() => setState((p) => ({ ...p, subtasks: p.subtasks.filter((x) => x.id !== s.id) }))}>Удалить</button>}
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
        <div className="kanban-board">{state.columns.map((col) => <div key={col} className="kanban-column">
          <div className="kanban-column-title"><span>{col}</span><button className="kanban-column-remove" onClick={() => removeKanbanColumn(col)} title="Удалить колонку" aria-label="Удалить колонку">×</button></div>
          <div className="kanban-column-body">{filteredSubtasks.filter((s) => s.inSprint && s.status === col).map((s) => <div key={s.id} className="kanban-card">
            <div className="kanban-card-title">{s.title}</div><div className="kanban-card-meta">{s.startDate} — {s.endDate}</div>
            {canEditTeam(s.teamId) && <select value={s.status} onChange={(e) => setState((p) => ({ ...p, subtasks: p.subtasks.map((x) => x.id === s.id ? { ...x, status: e.target.value } : x) }))}>{state.columns.map((c) => <option key={c}>{c}</option>)}</select>}
          </div>)}</div>
        </div>)}</div>
      </div>}

      {tab === "gantt" && <div className="planner-card">
        <h3 className="h3">Диаграмма Ганта</h3>
        {ganttRows.length === 0 ? <div className="planner-empty-inline">Нет задач для отображения.</div> : <>
          <div className="gantt-range"><span>{minDate}</span><span>{maxDate}</span></div>
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
    </div>
  );
}

