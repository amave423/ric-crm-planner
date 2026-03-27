import { useCallback, useEffect, useMemo, useState } from "react";
import { getDirectionsByEvent } from "../../../api/directions";
import { getProjectsByDirection, saveProjectsForDirection } from "../../../api/projects";
import { getAllUsers } from "../../../storage/storage";
import type { Project } from "../../../types/project";
import type { User } from "../../../types/user";
import { useToast } from "../../Toast/ToastProvider";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel, ProjectModel } from "../types";

type LocalProject = ProjectModel & { directionId?: string };

function normalizeUser(u: User | Record<string, unknown>): User {
  const obj = u as User & Record<string, unknown>;
  return {
    ...obj,
    id: Number(obj.id),
    email: String(obj.email ?? ""),
    role: String(obj.role ?? ""),
    name: obj.name ?? String(obj.firstName ?? obj.first_name ?? ""),
    surname: obj.surname ?? String(obj.lastName ?? obj.last_name ?? ""),
  };
}

export default function ProjectForm() {
  const { mode, eventId, savedDirections, directionId: ctxDirectionId, projectId: ctxProjectId } = useWizard();

  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [directionId, setDirectionId] = useState<string>(ctxDirectionId ? String(ctxDirectionId) : "");
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(mode === "edit" && ctxProjectId ? Number(ctxProjectId) : null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curatorId, setCuratorId] = useState("");
  const [teams, setTeams] = useState<number | "">("");
  const [usersList, setUsersList] = useState<User[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingDirs, setLoadingDirs] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const { showToast } = useToast();

  const userNameById = useMemo(
    () => new Map<number, string>(usersList.map((user) => [Number(user.id), `${user.surname ?? ""} ${user.name ?? ""}`.trim()])),
    [usersList]
  );
  const userIdByName = useMemo(
    () => new Map<string, number>(usersList.map((user) => [`${user.surname ?? ""} ${user.name ?? ""}`.trim(), Number(user.id)])),
    [usersList]
  );

  const resolveCuratorId = useCallback(
    (value: unknown): number | undefined => {
      if (typeof value === "number" && !Number.isNaN(value)) return value;
      if (typeof value === "string") {
        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) return numericValue;
        const byName = userIdByName.get(value.trim());
        if (typeof byName !== "undefined") return byName;
      }
      return undefined;
    },
    [userIdByName]
  );

  const curatorLabel = (project: LocalProject) => {
    const resolvedCuratorId = resolveCuratorId(project.curatorId ?? project.curator);
    if (typeof resolvedCuratorId !== "undefined") return userNameById.get(resolvedCuratorId) ?? String(resolvedCuratorId);
    return project.curator ?? "";
  };

  const fillForm = useCallback(
    (project?: LocalProject) => {
      if (!project) return;
      setEditingProjectId(Number(project.id));
      setDirectionId(String(project.directionId ?? ctxDirectionId ?? ""));
      setTitle(project.title ?? "");
      setDescription(project.description ?? "");
      const nextCuratorId = resolveCuratorId(project.curatorId ?? project.curator);
      setCuratorId(typeof nextCuratorId === "undefined" ? "" : String(nextCuratorId));
      setTeams(typeof project.teams === "number" ? project.teams : project.teams ? Number(project.teams) : "");
      setErrors({});
    },
    [ctxDirectionId, resolveCuratorId]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await getAllUsers();
        if (mounted) setUsersList((users || []).map((user) => normalizeUser(user)));
      } catch {
        if (mounted) setUsersList([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (savedDirections && savedDirections.length > 0) {
        if (!mounted) return;
        setDirections(savedDirections);
        if (!directionId && savedDirections.length > 0) setDirectionId(String(ctxDirectionId ?? savedDirections[0].id));
        return;
      }

      if (!eventId) return;
      setLoadingDirs(true);
      try {
        const loadedDirections = await getDirectionsByEvent(eventId ?? 0);
        if (!mounted) return;
        setDirections(loadedDirections || []);
        if (!directionId && loadedDirections && loadedDirections.length > 0) {
          setDirectionId(String(ctxDirectionId ?? loadedDirections[0].id));
        }
      } catch {
        if (mounted) setDirections([]);
      } finally {
        if (mounted) setLoadingDirs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ctxDirectionId, directionId, eventId, savedDirections]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!directionId) {
        setProjects([]);
        return;
      }

      const directionFromSaved = (savedDirections || []).find((direction) => String(direction.id) === String(directionId));
      if (directionFromSaved?.projects?.length) {
        if (!mounted) return;
        const mappedProjects = directionFromSaved.projects.map((project) => ({
          ...project,
          directionId: String(directionId),
          curatorId: resolveCuratorId(project.curatorId ?? project.curator),
        }));
        setProjects(mappedProjects);
        if (mode === "edit" && ctxProjectId) {
          fillForm(mappedProjects.find((project) => Number(project.id) === Number(ctxProjectId)));
        }
        return;
      }

      setLoadingProjects(true);
      try {
        const apiProjects = await getProjectsByDirection(Number(directionId));
        if (!mounted) return;
        const mappedProjects = (apiProjects || []).map((project) => ({
          id: Number(project.id),
          title: project.title ?? "",
          description: project.description ?? "",
          directionId: String(directionId),
          curatorId: resolveCuratorId(project.curatorId ?? project.curator),
          curator: project.curator ?? "",
          teams: project.teams ?? 0,
        }));
        setProjects(mappedProjects);
        if (mode === "edit" && ctxProjectId) {
          fillForm(mappedProjects.find((project) => Number(project.id) === Number(ctxProjectId)));
        }
      } catch {
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ctxProjectId, directionId, fillForm, mode, resolveCuratorId, savedDirections]);

  useEffect(() => {
    if (ctxDirectionId) setDirectionId(String(ctxDirectionId));
  }, [ctxDirectionId]);

  const validateDraft = () => {
    const nextErrors: Record<string, string> = {};
    if (!directionId) nextErrors.directionId = "Выберите направление";
    if (!title.trim()) nextErrors.title = "Введите название проекта";
    if (!curatorId) nextErrors.curator = "Выберите куратора";
    if (teams === "" || Number(teams) < 0) nextErrors.teams = "Укажите количество команд";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveDraftToList = () => {
    if (!validateDraft()) return;

    const curatorIdNum = Number(curatorId);
    const nextProject: LocalProject = {
      id: editingProjectId ?? Date.now(),
      title: title.trim(),
      description: description.trim(),
      directionId,
      curatorId: Number.isNaN(curatorIdNum) ? undefined : curatorIdNum,
      curator: userNameById.get(curatorIdNum) ?? "",
      teams: typeof teams === "number" ? teams : Number(teams),
    };

    if (editingProjectId != null) {
      setProjects((prev) =>
        prev.map((project) => (Number(project.id) === Number(editingProjectId) ? { ...project, ...nextProject } : project))
      );
      showToast("success", "Изменения проекта добавлены в черновик");
      return;
    }

    setProjects((prev) => [...prev, nextProject]);
    setTitle("");
    setDescription("");
    setCuratorId("");
    setTeams("");
    setErrors({});
  };

  const removeProject = (id: number) => {
    setProjects((prev) => prev.filter((project) => Number(project.id) !== Number(id)));
    if (Number(editingProjectId) === Number(id)) {
      setEditingProjectId(null);
      setTitle("");
      setDescription("");
      setCuratorId("");
      setTeams("");
    }
  };

  const handleSave = async () => {
    if (!directionId) {
      showToast("error", "Выберите направление");
      return;
    }

    const preparedProjects =
      editingProjectId != null
        ? projects.map((project) =>
            Number(project.id) === Number(editingProjectId)
              ? {
                  ...project,
                  title: title.trim(),
                  description: description.trim(),
                  directionId,
                  curatorId: resolveCuratorId(curatorId),
                  curator: userNameById.get(Number(curatorId)) ?? project.curator ?? "",
                  teams: typeof teams === "number" ? teams : Number(teams),
                }
              : project
          )
        : projects;

    for (const project of preparedProjects) {
      if (!project.title?.trim()) {
        showToast("error", "У одного из проектов нет названия");
        return;
      }
      if (!resolveCuratorId(project.curatorId ?? project.curator)) {
        showToast("error", "У одного из проектов не выбран куратор");
        return;
      }
    }

    try {
      const toSave: Project[] = preparedProjects.map((project) => ({
        id: Number(project.id),
        title: project.title ?? "",
        description: project.description ?? "",
        curatorId: resolveCuratorId(project.curatorId ?? project.curator),
        curator: project.curator ?? "",
        teams: project.teams,
        directionId: Number(directionId),
      }));
      const saved = await saveProjectsForDirection(Number(directionId), toSave);
      const mappedProjects = (saved || []).map((project) => ({
        id: Number(project.id),
        title: project.title ?? "",
        description: project.description ?? "",
        directionId: String(directionId),
        curatorId: resolveCuratorId(project.curatorId ?? project.curator),
        curator: project.curator ?? "",
        teams: project.teams ?? 0,
      }));
      setProjects(mappedProjects);
      if (mode === "edit" && ctxProjectId) {
        fillForm(mappedProjects.find((project) => Number(project.id) === Number(ctxProjectId)));
      }
      showToast("success", "Проекты сохранены");
    } catch {
      showToast("error", "Ошибка при сохранении проектов");
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "edit" ? "Редактирование проекта" : "Добавление проектов"}</h2>

      <div className={`field-wrap ${errors.directionId ? "error" : ""}`}>
        <label className="text-small">
          Выберите направление
          <select
            value={directionId ?? ""}
            disabled={mode === "edit" && !!ctxDirectionId}
            onChange={(event) => {
              setDirectionId(String(event.target.value));
              setErrors((prev) => {
                const next = { ...prev };
                delete next.directionId;
                return next;
              });
            }}
          >
            <option value="" disabled>
              Выберите направление
            </option>
            {loadingDirs ? (
              <option>Загрузка...</option>
            ) : (
              directions.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {direction.title}
                </option>
              ))
            )}
          </select>
        </label>
        {errors.directionId && <div className="field-error">{errors.directionId}</div>}
      </div>

      <div className={`field-wrap ${errors.title ? "error" : ""}`}>
        <label className="text-small">
          Название проекта
          <input
            placeholder="Введите название проекта"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.title;
                return next;
              });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveDraftToList();
              }
            }}
          />
        </label>
        {errors.title && <div className="field-error">{errors.title}</div>}
      </div>

      <div className={`field-wrap ${errors.curator ? "error" : ""}`}>
        <label className="text-small">
          Куратор
          <select
            value={curatorId}
            onChange={(event) => {
              setCuratorId(event.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.curator;
                return next;
              });
            }}
          >
            <option value="">Выберите куратора</option>
            {usersList.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.surname} {user.name} ({user.role})
              </option>
            ))}
          </select>
        </label>
        {errors.curator && <div className="field-error">{errors.curator}</div>}
      </div>

      <div className={`field-wrap ${errors.teams ? "error" : ""}`}>
        <label className="text-small">
          Команды
          <input
            type="number"
            min={0}
            value={teams}
            onChange={(event) => {
              setTeams(event.target.value === "" ? "" : Number(event.target.value));
              setErrors((prev) => {
                const next = { ...prev };
                delete next.teams;
                return next;
              });
            }}
          />
        </label>
        {errors.teams && <div className="field-error">{errors.teams}</div>}
      </div>

      <label className="text-small">
        Описание
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Краткое описание проекта"
        />
      </label>

      <div className="tags" style={{ marginTop: 12 }}>
        {loadingProjects ? (
          <div>Загрузка...</div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="tag"
              style={Number(editingProjectId) === Number(project.id) ? { outline: "2px solid var(--wizard-accent)" } : undefined}
            >
              <button
                type="button"
                style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                onClick={() => fillForm(project)}
              >
                <strong style={{ lineHeight: 1 }}>{project.title}</strong>
                {project.description && <span className="text-small" style={{ opacity: 0.8 }}>{project.description}</span>}
                {curatorLabel(project) && <span className="text-small" style={{ opacity: 0.8 }}>Куратор: {curatorLabel(project)}</span>}
                {typeof project.teams !== "undefined" && <span className="text-small" style={{ opacity: 0.8 }}>Команд: {project.teams}</span>}
              </button>
              <button type="button" onClick={() => removeProject(Number(project.id))}>x</button>
            </div>
          ))
        )}
      </div>

      <div className="wizard-actions">
        <button className="primary" type="button" onClick={saveDraftToList} style={{ marginRight: 8 }}>
          {editingProjectId != null ? "Обновить проект" : "Добавить проект"}
        </button>

        <button className="primary" type="button" onClick={handleSave}>
          Сохранить настройки проекта
        </button>
      </div>
    </div>
  );
}
