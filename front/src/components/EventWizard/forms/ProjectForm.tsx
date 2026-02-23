import { useEffect, useState, useMemo, useCallback } from "react";
import { getDirectionsByEvent } from "../../../api/directions";
import { getProjectsByDirection, saveProjectsForDirection } from "../../../api/projects";
import { getAllUsers } from "../../../storage/storage";
import type { Project } from "../../../types/project";
import type { User } from "../../../types/user";
import { useToast } from "../../Toast/ToastProvider";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel, ProjectModel } from "../types";

type LocalProject = ProjectModel & { directionId?: string };

export default function ProjectForm() {
  const { eventId, savedDirections, directionId: ctxDirectionId } = useWizard();

  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [directionId, setDirectionId] = useState<string>(ctxDirectionId ? String(ctxDirectionId) : "");
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curatorId, setCuratorId] = useState("");
  const [teams, setTeams] = useState<number | "">("");
  const [usersList, setUsersList] = useState<User[]>([]);
  const { showToast } = useToast();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingDirs, setLoadingDirs] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const userNameById = useMemo(
    () => new Map<number, string>(usersList.map((u) => [Number(u.id), `${u.surname ?? ""} ${u.name ?? ""}`.trim()])),
    [usersList]
  );
  const userIdByName = useMemo(
    () => new Map<string, number>(usersList.map((u) => [`${u.surname ?? ""} ${u.name ?? ""}`.trim(), Number(u.id)])),
    [usersList]
  );

  const resolveCuratorId = useCallback(
    (value: unknown): number | undefined => {
      if (typeof value === "number" && !Number.isNaN(value)) return value;
      if (typeof value === "string") {
        const n = Number(value);
        if (!Number.isNaN(n)) return n;
        const byName = userIdByName.get(value.trim());
        if (typeof byName !== "undefined") return byName;
      }
      return undefined;
    },
    [userIdByName]
  );

  const curatorLabel = (p: LocalProject) => {
    const id = resolveCuratorId(p.curatorId ?? p.curator);
    if (typeof id !== "undefined") return userNameById.get(id) ?? String(id);
    return p.curator ?? "";
  };

  const normalizeUser = (u: User | Record<string, unknown>): User => {
    const obj = u as User & Record<string, unknown>;
    return {
      ...obj,
      id: Number(obj.id),
      email: String(obj.email ?? ""),
      role: String(obj.role ?? ""),
      name: obj.name ?? String(obj.firstName ?? obj.first_name ?? ""),
      surname: obj.surname ?? String(obj.lastName ?? obj.last_name ?? ""),
    };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await getAllUsers();
        const mapped = (users || []).map((u) => normalizeUser(u));
        if (mounted) setUsersList(mapped);
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
        if (!directionId && savedDirections.length > 0) setDirectionId(String(savedDirections[0].id));
        return;
      }

      if (!eventId) return;
      setLoadingDirs(true);
      try {
        const dirs = await getDirectionsByEvent(eventId ?? 0);
        if (!mounted) return;
        setDirections(dirs || []);
        if (!directionId && dirs && dirs.length > 0) setDirectionId(String(dirs[0].id));
      } catch {
      } finally {
        if (mounted) setLoadingDirs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [directionId, eventId, savedDirections]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!directionId) {
        setProjects([]);
        return;
      }

      const dirFromSaved = (savedDirections || []).find((d: DirectionModel) => String(d.id) === String(directionId));
      if (dirFromSaved && dirFromSaved.projects && dirFromSaved.projects.length > 0) {
        if (!mounted) return;
        setProjects(
          dirFromSaved.projects.map((p: ProjectModel) => ({
            ...p,
            directionId: String(directionId),
            curatorId: resolveCuratorId(p.curatorId ?? p.curator),
          }))
        );
        return;
      }

      setLoadingProjects(true);
      try {
        const apiProjects = await getProjectsByDirection(Number(directionId));
        if (!mounted) return;
        setProjects(
          (apiProjects || []).map((p: Project) => ({
            id: p.id,
            title: p.title ?? "",
            description: p.description ?? "",
            directionId: String(directionId),
            curatorId: resolveCuratorId(p.curatorId ?? p.curator),
            curator: p.curator ?? "",
            teams: p.teams ?? 0,
          }))
        );
      } catch {
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [directionId, resolveCuratorId, savedDirections, usersList]);

  useEffect(() => {
    if (ctxDirectionId) setDirectionId(String(ctxDirectionId));
  }, [ctxDirectionId]);

  useEffect(() => {
    if (!directionId && directions.length > 0) setDirectionId(String(directions[0].id));
  }, [directionId, directions]);

  const addProject = () => {
    if (!directionId) {
      setErrors((p) => ({ ...p, directionId: "Выберите направление" }));
      return;
    }
    if (!title.trim()) {
      setErrors((p) => ({ ...p, title: "Введите название проекта" }));
      return;
    }
    if (!curatorId) {
      setErrors((p) => ({ ...p, curator: "Выберите куратора" }));
      return;
    }
    if (teams === "" || Number(teams) < 0) {
      setErrors((p) => ({ ...p, teams: "Укажите количество команд (0 или больше)" }));
      return;
    }

    const curatorIdNum = Number(curatorId);
    setProjects([
      ...projects,
      {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        directionId,
        curatorId: Number.isNaN(curatorIdNum) ? undefined : curatorIdNum,
        curator: userNameById.get(curatorIdNum) ?? "",
        teams: typeof teams === "number" ? teams : Number(teams),
      },
    ]);

    setTitle("");
    setDescription("");
    setCuratorId("");
    setTeams("");
    setErrors({});
  };

  const removeProject = (id: number) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    if (!directionId) {
      showToast("error", "Выберите направление");
      return;
    }

    for (const p of projects) {
      if (!p.title || !p.title.trim()) {
        showToast("error", "У одного из проектов нет названия");
        return;
      }
      if (!resolveCuratorId(p.curatorId ?? p.curator)) {
        showToast("error", "У одного из проектов не выбран куратор");
        return;
      }
    }

    try {
      const toSave: Project[] = projects.map((p) => ({
        id: Number(p.id),
        title: p.title ?? "",
        description: p.description ?? "",
        curatorId: resolveCuratorId(p.curatorId ?? p.curator),
        curator: p.curator ?? "",
        teams: p.teams,
        directionId: Number(directionId),
      }));
      const saved = await saveProjectsForDirection(Number(directionId), toSave);
      setProjects(
        (saved || []).map((p: Project) => ({
          id: p.id,
          title: p.title ?? "",
          description: p.description ?? "",
          directionId: String(directionId),
          curatorId: resolveCuratorId(p.curatorId ?? p.curator),
          curator: p.curator ?? "",
          teams: p.teams ?? 0,
        }))
      );
      showToast("success", "Проекты сохранены");
    } catch {
      showToast("error", "Ошибка при сохранении проектов");
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">Добавление проектов</h2>

      <div className={`field-wrap ${errors.directionId ? "error" : ""}`}>
        <label className="text-small">
          Выберите направление
          <select
            value={directionId ?? ""}
            onChange={(e) => {
              setDirectionId(String(e.target.value));
              setErrors((p) => {
                const np = { ...p };
                delete np.directionId;
                return np;
              });
            }}
          >
            <option value="" disabled>
              Выберите направление
            </option>
            {loadingDirs ? (
              <option>Загрузка...</option>
            ) : (
              directions.map((d: DirectionModel) => (
                <option key={d.id} value={d.id}>
                  {d.title}
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
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((p) => {
                const np = { ...p };
                delete np.title;
                return np;
              });
            }}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
          />
        </label>
        {errors.title && <div className="field-error">{errors.title}</div>}
      </div>

      <div className={`field-wrap ${errors.curator ? "error" : ""}`}>
        <label className="text-small">
          Куратор
          <select
            value={curatorId}
            onChange={(e) => {
              setCuratorId(e.target.value);
              setErrors((p) => {
                const np = { ...p };
                delete np.curator;
                return np;
              });
            }}
          >
            <option value="">-- выбрать куратора --</option>
            {usersList.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.surname} {u.name} ({u.role})
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
            onChange={(e) => {
              setTeams(e.target.value === "" ? "" : Number(e.target.value));
              setErrors((p) => {
                const np = { ...p };
                delete np.teams;
                return np;
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
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание проекта (необязательно)"
        />
      </label>

      <div className="tags" style={{ marginTop: 12 }}>
        {loadingProjects ? (
          <div>Загрузка...</div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="tag">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <strong style={{ lineHeight: 1 }}>{p.title}</strong>
                {p.description && (
                  <span className="text-small" style={{ opacity: 0.8 }}>
                    {p.description}
                  </span>
                )}
                {curatorLabel(p) && (
                  <span className="text-small" style={{ opacity: 0.8 }}>
                    Куратор: {curatorLabel(p)}
                  </span>
                )}
                {typeof p.teams !== "undefined" && (
                  <span className="text-small" style={{ opacity: 0.8 }}>
                    Команд: {p.teams}
                  </span>
                )}
              </div>
              <button onClick={() => removeProject(p.id)}>×</button>
            </div>
          ))
        )}
      </div>

      <div className="wizard-actions">
        <button className="primary" type="button" onClick={addProject} style={{ marginRight: 8 }}>
          Добавить проект
        </button>

        <button className="primary" type="button" onClick={handleSave}>
          Сохранить настройки проекта
        </button>
      </div>
    </div>
  );
}
