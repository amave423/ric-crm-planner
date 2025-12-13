import { useState } from "react";

interface Project {
  id?: number;
  title: string;
  description: string;
  curator_id?: number;
  direction_id?: number;
}

interface Props {
  data: Project[];
  directions: any[];
  onBack: () => void;
}

export default function ProjectForm({
  data,
  directions,
  onBack
}: Props) {
  const [projects, setProjects] = useState<Project[]>(data || []);
  const [expanded, setExpanded] = useState(false);

  const addProject = () => {
    setProjects(prev => [
      ...prev,
      {
        title: "",
        description: "",
        direction_id: directions[0]?.id
      }
    ]);
  };

  const updateProject = (
    index: number,
    key: string,
    value: any
  ) => {
    const copy = [...projects];
    copy[index] = { ...copy[index], [key]: value };
    setProjects(copy);
  };

  const visibleDirections = expanded
    ? directions
    : directions.slice(0, 3);

  return (
    <>
      <h2>Добавление проектов</h2>

      {projects.map((p, i) => (
        <div key={i} className="card-block">
          <input
            placeholder="Название проекта"
            value={p.title}
            onChange={(e) =>
              updateProject(i, "title", e.target.value)
            }
          />

          <textarea
            placeholder="Описание проекта"
            value={p.description}
            onChange={(e) =>
              updateProject(i, "description", e.target.value)
            }
          />

          <div className="direction-select">
            <span>Выбрать направление:</span>

            <div className="direction-list">
              {visibleDirections.map((d: any) => (
                <label key={d.id}>
                  <input
                    type="radio"
                    name={`direction-${i}`}
                    checked={p.direction_id === d.id}
                    onChange={() =>
                      updateProject(i, "direction_id", d.id)
                    }
                  />
                  {d.title}
                </label>
              ))}
            </div>

            {directions.length > 3 && (
              <button
                className="link-btn"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Свернуть" : "Развернуть"}
              </button>
            )}
          </div>
        </div>
      ))}

      <button className="secondary-btn" onClick={addProject}>
        + Добавить проект
      </button>

      <div className="actions">
        <button onClick={onBack}>Настройка направлений</button>

        <button
          onClick={() => {
            console.log("SAVE PROJECTS:", projects);
            alert("Проекты успешно сохранены");
          }}
        >
          Сохранить настройки проекта
        </button>
      </div>
    </>
  );
}
