import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel } from "../types";
import { getDirectionsByEvent } from "../../../api/directions";
import { saveDirectionsForEvent as persistDirections } from "../../../api/directions";
import { getEventById } from "../../../api/events";
import users from "../../../mock-data/users.json";

export default function DirectionForm() {
  const { saveDirections, eventId, savedDirections } = useWizard();

  const [description, setDescription] = useState("");
  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [input, setInput] = useState("");
  const organizers = users.filter((u) => u.role === "organizer");
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>("");

  useEffect(() => {
    if (savedDirections && savedDirections.length > 0) {
      setDirections(savedDirections);
      setSelectedOrganizer(savedDirections[0]?.organizer ?? "");
    } else if (eventId) {
      const api = getDirectionsByEvent(Number(eventId));
      setDirections(
        api.map((d) => ({
          id: d.id,
          title: d.title,
          description: (d as any).description ?? undefined,
          projects: (d as any).projects ?? [],
          organizer: (d as any).organizer ?? ""
        }))
      );

      const ev = getEventById(Number(eventId));
      if (ev) {
        const leaderId = (ev as any).leader;
        if (leaderId != null) {
          const u = organizers.find((o) => String(o.id) === String(leaderId));
          if (u) setSelectedOrganizer(`${u.surname} ${u.name}`);
          else setSelectedOrganizer(String(leaderId));
        }
      }
    }
  }, [savedDirections, eventId]);

  const addDirection = () => {
    if (!input.trim()) {
      alert("Введите название направления");
      return;
    }
    if (!selectedOrganizer) {
      alert("Выберите организатора направления");
      return;
    }
    setDirections((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: input.trim(),
        description: description.trim() || undefined,
        projects: [],
        organizer: selectedOrganizer
      }
    ]);
    setInput("");
    setDescription("");
    setSelectedOrganizer("");
  };

  const removeDirection = (id: number) => {
    const dir = directions.find((d) => d.id === id);
    if (!dir) return;
    if ((dir.projects?.length ?? 0) > 0) {
      if (!confirm("Если вы удалите направление, все проекты в нём будут удалены!")) {
        return;
      }
    }
    setDirections((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = () => {
    if (!eventId) {
      alert("Сохраните сначала мероприятие (первая вкладка).");
      return;
    }
    if (directions.length === 0) {
      alert("Добавьте хотя бы одно направление перед сохранением");
      return;
    }
    for (const d of directions) {
      if (!d.title || !d.title.trim()) {
        alert("У одного из направлений нет названия");
        return;
      }
      if (!d.organizer || !d.organizer.trim()) {
        alert("У одного из направлений не выбран организатор");
        return;
      }
    }
    const saved = persistDirections(Number(eventId), directions as any);
    saveDirections?.(saved as any);
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDirection()}
        />
      </label>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="text-small">
        Организатор направления
        <select value={selectedOrganizer} onChange={(e) => setSelectedOrganizer(e.target.value)}>
          <option value="">-- выбрать организатора --</option>
          {organizers.map((o) => (
            <option key={o.id} value={`${o.surname} ${o.name}`}>
              {o.surname} {o.name}
            </option>
          ))}
        </select>
      </label>

      <div className="tags">
        {directions.map((d) => (
          <div key={d.id} className="tag">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <strong style={{ lineHeight: 1 }}>{d.title}</strong>
              {d.description && <span className="text-small" style={{ opacity: 0.8 }}>{d.description}</span>}
              {d.organizer && <span className="text-small" style={{ opacity: 0.8 }}>Организатор: {d.organizer}</span>}
            </div>
            <button onClick={() => removeDirection(d.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button className="primary" onClick={handleSave}>
          Сохранить направления
        </button>
      </div>
    </div>
  );
}