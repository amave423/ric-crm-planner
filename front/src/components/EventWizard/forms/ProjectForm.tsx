import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import { getDirectionsByEvent } from "../../../api/directions";
import { getProjectsByDirection, saveProjectsForDirection } from "../../../api/projects";
import users from "../../../mock-data/users.json";
import { useToast } from "../../Toast/ToastProvider";

interface Project {
  id: number;
  title?: string;
  description?: string;
  directionId?: string;
  curator?: string;
  teams?: number;
}

export default function ProjectForm() {
  const { eventId, savedDirections, directionId: ctxDirectionId } = useWizard();

  const directions: any[] = savedDirections && savedDirections.length > 0 ? savedDirections : getDirectionsByEvent(eventId ?? 0);

  const [directionId, setDirectionId] = useState<string>(ctxDirectionId ? String(ctxDirectionId) : directions[0]?.id ? String(directions[0].id) : "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curator, setCurator] = useState("");
  const [teams, setTeams] = useState<number | "">("");
  const { showToast } = useToast();
  const usersList = users;

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ctxDirectionId) {
      setDirectionId(String(ctxDirectionId));
    }
  }, [ctxDirectionId]);

  useEffect(() => {
    if (!directionId && directions.length > 0) {
      setDirectionId(String(directions[0].id));
    }
  }, [directions]);

  useEffect(() => {
    if (!directionId) {
      setProjects([]);
      return;
    }
    const dirFromSaved = (savedDirections || []).find((d: any) => String(d.id) === String(directionId));
    if (dirFromSaved && dirFromSaved.projects && dirFromSaved.projects.length > 0) {
      setProjects(dirFromSaved.projects.map((p: any) => ({ ...p, directionId: String(directionId) })));
      return;
    }
    const apiProjects = getProjectsByDirection(Number(directionId));
    setProjects(apiProjects.map((p) => ({ id: p.id, title: p.title ?? "", description: (p as any).description ?? "", directionId: String(directionId), curator: (p as any).curator ?? "", teams: (p as any).teams ?? 0 })));
  }, [directionId, savedDirections]);

  const addProject = () => {
    if (!directionId) {
      setErrors((p) => ({ ...p, directionId: "Выберите направление" }));
      return;
    }
    if (!title.trim()) {
      setErrors((p) => ({ ...p, title: "Введите название проекта" }));
      return;
    }
    if (!curator) {
      setErrors((p) => ({ ...p, curator: "Выберите куратора" }));
      return;
    }
    if (teams === "" || Number(teams) < 0) {
      setErrors((p) => ({ ...p, teams: "Укажите количество команд (0 или больше)" }));
      return;
    }
    setProjects([...projects, { id: Date.now(), title: title.trim(), description: description.trim(), directionId, curator, teams: typeof teams === "number" ? teams : Number(teams) }]);
    setTitle("");
    setDescription("");
    setCurator("");
    setTeams("");
    setErrors({});
  };

  const removeProject = (id: number) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    if (!directionId) {
      showToast("error", "Выберите направление");
      return;
    }
    for (const p of projects) {
      if (!p.title || !p.title.trim()) {
        showToast("error", "У одного из проектов нет названия");
        return;
      }
      if (!p.curator || !p.curator.trim()) {
        showToast("error", "У одного из проектов не выбран куратор");
        return;
      }
    }
    saveProjectsForDirection(Number(directionId), projects as any);
    showToast("success", "Проекты сохранены");
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">Добавление проектов</h2>

      <div className={`field-wrap ${errors.directionId ? "error" : ""}`}>
        <label className="text-small">
          Выберите направление
          <select value={directionId ?? ""} onChange={(e) => {
            setDirectionId(String(e.target.value));
            setErrors((p) => { const np = { ...p }; delete np.directionId; return np; });
          }}>
            <option value="" disabled>
              Выберите направление
            </option>
            {directions.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        {errors.directionId && <div className="field-error">{errors.directionId}</div>}
      </div>

      <div className={`field-wrap ${errors.title ? "error" : ""}`}>
        <label className="text-small">
          Название проекта
          <input placeholder="Введите название проекта" value={title} onChange={(e) => {
            setTitle(e.target.value);
            setErrors((p) => { const np = { ...p }; delete np.title; return np; });
          }} onKeyDown={(e) => e.key === "Enter" && addProject()} />
        </label>
        {errors.title && <div className="field-error">{errors.title}</div>}
      </div>

      <div className={`field-wrap ${errors.curator ? "error" : ""}`}>
        <label className="text-small">
          Куратор
          <select value={curator ?? ""} onChange={(e) => { setCurator(e.target.value); setErrors((p) => { const np = { ...p }; delete np.curator; return np; }); }}>
            <option value="">-- выбрать куратора --</option>
            {usersList.map((u) => (
              <option key={u.id} value={`${u.surname} ${u.name}`}>
                {u.surname} {u.name} ({u.role})
              </option>
            ))}
          </select>
        </label>
        {errors.curator && <div className="field-error">{errors.curator}</div>}
      </div>

      <div className={`field-wrap ${errors.teams ? "error" : ""}`}>
        <label className="text-small">
          Команд
          <input type="number" min={0} value={teams as any} onChange={(e) => { setTeams(e.target.value === "" ? "" : Number(e.target.value)); setErrors((p) => { const np = { ...p }; delete np.teams; return np; }); }} />
        </label>
        {errors.teams && <div className="field-error">{errors.teams}</div>}
      </div>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание проекта (необязательно)" />
      </label>

      <div className="tags" style={{ marginTop: 12 }}>
        {projects.map((p) => (
          <div key={p.id} className="tag">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <strong style={{ lineHeight: 1 }}>{p.title}</strong>
              {p.description && <span className="text-small" style={{ opacity: 0.8 }}>{p.description}</span>}
              {p.curator && <span className="text-small" style={{ opacity: 0.8 }}>Куратор: {p.curator}</span>}
              {typeof p.teams !== "undefined" && <span className="text-small" style={{ opacity: 0.8 }}>Команд: {p.teams}</span>}
            </div>
            <button onClick={() => removeProject(p.id)}>×</button>
          </div>
        ))}
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