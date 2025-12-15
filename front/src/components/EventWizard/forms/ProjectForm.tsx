import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import { getDirectionsByEvent } from "../../../api/directions";
import { getProjectsByDirection } from "../../../api/projects";

interface Project {
  id: number;
  title: string;
  description: string;
  directionId?: string;
}

export default function ProjectForm() {
  const { eventId, savedDirections, directionId: ctxDirectionId } = useWizard();

  const directions: any[] =
    savedDirections && savedDirections.length > 0
      ? savedDirections
      : getDirectionsByEvent(eventId ?? 0);

  const [directionId, setDirectionId] = useState<string>(
    ctxDirectionId ? String(ctxDirectionId) : directions[0]?.id ? String(directions[0].id) : ""
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  // load existing projects for selected direction (from savedDirections or API)
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
    setProjects(apiProjects.map(p => ({ id: p.id, title: p.title, description: (p as any).description ?? "", directionId: String(directionId) })));
  }, [directionId, savedDirections]);

  const addProject = () => {
    if (!title.trim() || !directionId) {
      alert("Выберите направление и введите название проекта");
      return;
    }

    setProjects([
      ...projects,
      { id: Date.now(), title: title.trim(), description: description.trim(), directionId }
    ]);

    setTitle("");
    setDescription("");
  };

  const removeProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">Добавление проектов</h2>

      <label className="text-small">
        Выберите направление
        <select
          value={directionId ?? ""}
          onChange={(e) => setDirectionId(String(e.target.value))}
        >
          <option value="" disabled>Выберите направление</option>
          {directions.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </label>

      <label className="text-small">
        Название проекта
        <input
          placeholder="Введите название проекта и нажмите Enter"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addProject()}
        />
      </label>

      <label className="text-small">
        Описание
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Краткое описание проекта (необязательно)"
        />
      </label>

      <div className="tags" style={{ marginTop: 12 }}>
        {projects.map(p => (
          <div key={p.id} className="tag">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <strong style={{ lineHeight: 1 }}>{p.title}</strong>
              {p.description && <span className="text-small" style={{ opacity: 0.8 }}>{p.description}</span>}
            </div>
            <button onClick={() => removeProject(p.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button className="primary" type="button">Сохранить настройки проекта</button>
      </div>
    </div>
  );
}