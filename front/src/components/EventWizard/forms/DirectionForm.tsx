import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel } from "../types";
import { getDirectionsByEvent } from "../../../api/directions";

export default function DirectionForm() {
  const { saveDirections, eventId, savedDirections } = useWizard();

  const [description, setDescription] = useState("");
  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (savedDirections && savedDirections.length > 0) {
      setDirections(savedDirections);
    } else if (eventId) {
      const api = getDirectionsByEvent(Number(eventId));
      setDirections(
        api.map((d) => ({
          id: d.id,
          title: d.title,
          description: (d as any).description ?? undefined,
          projects: []
        }))
      );
    }
  }, [savedDirections, eventId]);

  const addDirection = () => {
    if (!input.trim()) return;

    setDirections([
      ...directions,
      { id: Date.now(), title: input.trim(), description: description.trim() || undefined, projects: [] }
    ]);

    setInput("");
    setDescription("");
  };

  const removeDirection = (id: number) => {
    const dir = directions.find(d => d.id === id);
    if (!dir) return;

    if ((dir.projects?.length ?? 0) > 0) {
      if (!confirm("Если вы удалите направление, все проекты в нём будут удалены!")) {
        return;
      }
    }

    setDirections(directions.filter(d => d.id !== id));
  };

  const handleSave = () => {
    if (directions.length === 0) {
      alert("Добавьте хотя бы одно направление перед сохранением");
      return;
    }
    saveDirections?.(directions);
    alert("Направления сохранены");
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">Добавление направлений</h2>
      <label className="text-small">
        Название направления
        <input
            placeholder="Введите название направления и нажмите Enter"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDirection()}
        />
      </label>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </label>

      <div className="tags">
        {directions.map(d => (
          <div key={d.id} className="tag">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <strong style={{ lineHeight: 1 }}>{d.title}</strong>
              {d.description && <span className="text-small" style={{ opacity: 0.8 }}>{d.description}</span>}
            </div>
            <button onClick={() => removeDirection(d.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button className="primary" onClick={handleSave}>Сохранить направления</button>
      </div>
    </div>
  );
}