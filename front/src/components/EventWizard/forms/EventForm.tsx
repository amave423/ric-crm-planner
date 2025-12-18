import { useState, useEffect } from "react";
import { useWizard } from "../EventWizardModal";
import calendarIcon from "../../../assets/icons/calendar.svg";
import users from "../../../mock-data/users.json";
import Calendar from "../../UI/Calendar";
import { getEventById, saveEvent as persistEvent } from "../../../api/events";
import type { Event } from "../../../types/event";

interface Specialization {
  id: number;
  title: string;
}

export default function EventForm() {
  const { mode, saveEvent, savedEvent, eventId } = useWizard();

  const [title, setTitle] = useState("");
  const se = savedEvent as Event | undefined;
  const [description, setDescription] = useState<string>(se?.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");
  const [leader, setLeader] = useState("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [specInput, setSpecInput] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const organizers = users.filter((u) => u.role === "organizer");

  useEffect(() => {
    if (se) {
      setTitle(se.title || "");
      setDescription(se.description || "");
      setStartDate(se.startDate || "");
      setEndDate(se.endDate || "");
      setApplyDeadline(se.applyDeadline || "");
      setLeader(se.leader ?? "");
      setSpecializations(se.specializations || []);
    } else if (mode === "edit" && eventId) {
      const e = getEventById(Number(eventId));
        if (e) {
        setTitle(e.title || "");
        setDescription(e.description || "");
        setStartDate(e.startDate || "");
        setEndDate(e.endDate || "");
        setApplyDeadline(e.applyDeadline || "");
        setLeader(e.leader ?? "");
        setSpecializations(e.specializations || []);
      }
    }
  }, [se, mode, eventId]);

  const addSpec = () => {
    if (!specInput.trim()) return;
    setSpecializations([...specializations, { id: Date.now(), title: specInput.trim() }]);
    setSpecInput("");
  };

  const removeSpec = (id: number) => {
    setSpecializations(specializations.filter((s) => s.id !== id));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Вы пропустили поле";
    if (!startDate) e.startDate = "Вы пропустили поле";
    if (!endDate) e.endDate = "Вы пропустили поле";
    if (!applyDeadline) e.applyDeadline = "Вы пропустили поле";
    if (!leader) e.leader = "Вы пропустили поле";
    if (!specializations || specializations.length === 0) e.specializations = "Вы пропустили поле";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const computedStatus = (() => {
      const endObj = new Date(endDate);
      return endObj >= new Date() ? "Активно" : "Неактивно";
    })();

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      applyDeadline,
      leader,
      specializations,
      status: computedStatus
    };
    if (mode === "edit" && eventId) payload.id = eventId;
    const saved = persistEvent(payload);
    saveEvent?.(saved);
  };

  const FieldWrap = ({ name, children }: { name: string; children: React.ReactNode }) => (
    <div className={`field-wrap ${errors[name] ? "error" : ""}`} style={{ marginBottom: 8 }}>
      {children}
      {errors[name] && <div className="field-error">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "create" ? "Добавление мероприятия" : "Редактирование мероприятия"}</h2>

      <FieldWrap name="title">
        <label className="text-small">
          Название мероприятия
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </FieldWrap>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="date-row">
        <FieldWrap name="startDate">
          <DateField label="Дата начала" value={startDate} onChange={setStartDate} />
        </FieldWrap>

        <FieldWrap name="endDate">
          <DateField label="Дата завершения" value={endDate} onChange={setEndDate} />
        </FieldWrap>

        <FieldWrap name="applyDeadline">
          <DateField label="Срок приёма заявок" value={applyDeadline} onChange={setApplyDeadline} />
        </FieldWrap>
      </div>

      <FieldWrap name="leader">
        <label className="text-small">Руководитель мероприятия</label>
        <select value={leader ?? ""} onChange={(e) => setLeader(e.target.value)}>
          <option value="" disabled>
            Выберите руководителя
          </option>
          {organizers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.surname} {o.name}
            </option>
          ))}
        </select>
      </FieldWrap>

      <FieldWrap name="specializations">
        <label className="text-small">
          Специализации
          <input
            value={specInput}
            onChange={(e) => setSpecInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSpec()}
            placeholder="Введите специализацию и нажмите Enter"
          />
        </label>
      </FieldWrap>

      <div className="tags">
        {specializations.map((s) => (
          <div key={s.id} className="tag">
            {s.title}
            <button onClick={() => removeSpec(s.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button
          className="primary"
          onClick={handleSave}
          type="button"
        >
          Сохранить мероприятие
        </button>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <label className="date-field">
      <span className="text-small">{label}</span>

      <div className="date-input">
        <input type="text" placeholder="YYYY-MM-DD" value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setOpen(true)} />

        <button type="button" className="calendar-btn" onClick={() => setOpen((prev) => !prev)}>
          <img src={calendarIcon} alt="calendar" />
        </button>

        {open && (
          <Calendar
            value={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        )}
      </div>
    </label>
  );
}