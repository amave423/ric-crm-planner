import { useState } from "react";
import { useWizard } from "../EventWizardModal";
import calendarIcon from "../../../assets/icons/calendar.svg";
import users from "../../../mock-data/users.json";
import Calendar from "../../UI/Calendar";

interface Specialization {
  id: number;
  title: string;
}

export default function EventForm() {
  const { mode, saveEvent } = useWizard();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");

  const [leader, setLeader] = useState("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [specInput, setSpecInput] = useState("");
  const organizers = users.filter(u => u.role === "organizer");

  const addSpec = () => {
    if (!specInput.trim()) return;

    setSpecializations([
      ...specializations,
      { id: Date.now(), title: specInput.trim() }
    ]);
    setSpecInput("");
  };

  const removeSpec = (id: number) => {
    setSpecializations(specializations.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Введите название мероприятия");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      applyDeadline,
      leader,
      specializations
    };
    saveEvent?.(payload);
    alert("Мероприятие сохранено");
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "create" ? "Добавление мероприятия" : "Редактирование мероприятия"}</h2>

      <label  className="text-small">
        Название мероприятия
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </label>

      <label  className="text-small">
        Описание
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </label>

      <div className="date-row">
        <DateField label="Дата начала" value={startDate} onChange={setStartDate} />
        <DateField label="Дата завершения" value={endDate} onChange={setEndDate} />
        <DateField label="Срок приёма заявок" value={applyDeadline} onChange={setApplyDeadline} />
      </div>

      <label  className="text-small">Руководитель мероприятия</label>
      <select
        value={leader ?? ""}
        onChange={(e) => setLeader(e.target.value)}
      >
        <option value="" disabled>Выберите руководителя</option>
        {organizers.map(o => (
          <option key={o.id} value={o.id}>
            {o.surname} {o.name}
          </option>
        ))}
      </select>

      <label  className="text-small">
        Специализации
        <input
          value={specInput}
          onChange={e => setSpecInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addSpec()}
          placeholder="Введите специализацию и нажмите Enter"
        />
      </label>

      <div className="tags">
        {specializations.map(s => (
          <div key={s.id} className="tag">
            {s.title}
            <button onClick={() => removeSpec(s.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        <button className="primary" onClick={handleSave}>Сохранить мероприятие</button>
      </div>
    </div>
  );
}


function DateField({
  label,
  value,
  onChange
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
        <input
          type="text"
          placeholder="дд.дд.гггг"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />

        <button
          type="button"
          className="calendar-btn"
          onClick={() => setOpen(prev => !prev)}
        >
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
