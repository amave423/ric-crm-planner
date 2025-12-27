import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel } from "../types";
import { getDirectionsByEvent, saveDirectionsForEvent as persistDirections } from "../../../api/directions";
import { getEventById } from "../../../api/events";
import users from "../../../mock-data/users.json";
import { useToast } from "../../Toast/ToastProvider";

export default function DirectionForm() {
  const { saveDirections, eventId, savedDirections } = useWizard();

  const [description, setDescription] = useState("");
  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [input, setInput] = useState("");
  const organizers = users.filter((u) => u.role === "organizer");
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>("");
  const { showToast } = useToast();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (savedDirections && savedDirections.length > 0) {
        if (!mounted) return;
        setDirections(savedDirections);
        setSelectedOrganizer(savedDirections[0]?.organizer ?? "");
        return;
      }
      if (!eventId) return;
      setLoading(true);
      try {
        const apiDirs = await getDirectionsByEvent(Number(eventId));
        if (!mounted) return;
        setDirections(
          apiDirs.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description ?? undefined,
            projects: d.projects ?? [],
            organizer: d.organizer ?? ""
          }))
        );

        const ev = await getEventById(Number(eventId));
        if (!mounted) return;
        if (ev) {
          const leaderId = (ev as any).leader;
          if (leaderId != null) {
            const u = organizers.find((o) => String(o.id) === String(leaderId));
            if (u) setSelectedOrganizer(`${u.surname} ${u.name}`);
            else setSelectedOrganizer(String(leaderId));
          }
        }
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [savedDirections, eventId]);

  const addDirection = () => {
    const title = input.trim();
    const desc = description.trim();
    if (!title) {
      setErrors((p) => ({ ...p, input: "Введите название направления" }));
      return;
    }
    if (!selectedOrganizer) {
      setErrors((p) => ({ ...p, selectedOrganizer: "Выберите организатора" }));
      return;
    }
    setDirections((prev) => [
      ...prev,
      {
        id: Date.now(),
        title,
        description: desc || undefined,
        projects: [],
        organizer: selectedOrganizer
      }
    ]);
    setInput("");
    setDescription("");
    setSelectedOrganizer("");
    setErrors({});
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

  const handleSave = async () => {
    if (!eventId) {
      showToast("error", "Сохраните сначала мероприятие (первая вкладка).");
      return;
    }
    for (const d of directions) {
      if (!d.title || !d.title.trim()) {
        showToast("error", "У одного из направлений нет названия");
        return;
      }
      if (!d.organizer || !d.organizer.trim()) {
        showToast("error", "У одного из направлений не выбран организатор");
        return;
      }
    }

    try {
      const saved = await persistDirections(Number(eventId), directions as any);
      saveDirections?.(saved as any);
      showToast("success", "Направления сохранены");
    } catch {
      showToast("error", "Ошибка при сохранении направлений");
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">Добавление направлений</h2>

      <div className={`field-wrap ${errors.input ? "error" : ""}`}>
        <label className="text-small">
          Название направления
          <input
            placeholder="Введите название направления"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setErrors((p) => {
                const np = { ...p };
                delete np.input;
                return np;
              });
            }}
            onKeyDown={(e) => e.key === "Enter" && addDirection()}
          />
        </label>
        {errors.input && <div className="field-error">{errors.input}</div>}
      </div>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className={`field-wrap ${errors.selectedOrganizer ? "error" : ""}`}>
        <label className="text-small">
          Организатор направления
          <select
            value={selectedOrganizer}
            onChange={(e) => {
              setSelectedOrganizer(e.target.value);
              setErrors((p) => {
                const np = { ...p };
                delete np.selectedOrganizer;
                return np;
              });
            }}
          >
            <option value="">-- выбрать организатора --</option>
            {organizers.map((o) => (
              <option key={o.id} value={`${o.surname} ${o.name}`}>
                {o.surname} {o.name}
              </option>
            ))}
          </select>
        </label>
        {errors.selectedOrganizer && <div className="field-error">{errors.selectedOrganizer}</div>}
      </div>

      <div className="tags">
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          directions.map((d) => (
            <div key={d.id} className="tag">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <strong style={{ lineHeight: 1 }}>{d.title}</strong>
                {d.description && <span className="text-small" style={{ opacity: 0.8 }}>{d.description}</span>}
                {d.organizer && <span className="text-small" style={{ opacity: 0.8 }}>Организатор: {d.organizer}</span>}
              </div>
              <button onClick={() => removeDirection(d.id)}>×</button>
            </div>
          ))
        )}
      </div>

      <div className="wizard-actions">
        <button className="primary" type="button" onClick={addDirection} style={{ marginRight: 8 }}>
          Добавить направление
        </button>

        <button className="primary" onClick={handleSave} type="button">
          Сохранить направления
        </button>
      </div>
    </div>
  );
}