import { useState, useEffect, useRef } from "react";
import { useWizard } from "../EventWizardModal";
import calendarIcon from "../../../assets/icons/calendar.svg";
import users from "../../../mock-data/users.json";
import Calendar from "../../UI/Calendar";
import { getEventById, saveEvent as persistEvent } from "../../../api/events";
import type { Event } from "../../../types/event";
import { removeEvent } from "../../../api/events";
import Modal from "../../Modal/Modal";
import { useToast } from "../../../components/Toast/ToastProvider";

interface Specialization {
  id: number;
  title: string;
}

export default function EventForm() {
  const { mode, saveEvent, savedEvent, eventId } = useWizard();

  const se = savedEvent as Event | undefined;
  const titleRef = useRef<HTMLInputElement | null>(null);
  const specInputRef = useRef<HTMLInputElement | null>(null);

  const [description, setDescription] = useState<string>(se?.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");
  const [leader, setLeader] = useState("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { showToast } = useToast();

  const organizers = users.filter((u) => u.role === "organizer");

  useEffect(() => {
    if (se) {
      if (titleRef.current) titleRef.current.value = se.title || "";
      setDescription(se.description || "");
      setStartDate(se.startDate || "");
      setEndDate(se.endDate || "");
      setApplyDeadline(se.applyDeadline || "");
      setLeader(se.leader ?? "");
      setSpecializations(se.specializations || []);
      setTitle(se.title || "");
    } else if (mode === "edit" && eventId) {
      const e = getEventById(Number(eventId));
      if (e) {
        if (titleRef.current) titleRef.current.value = e.title || "";
        setDescription(e.description || "");
        setStartDate(e.startDate || "");
        setEndDate(e.endDate || "");
        setApplyDeadline(e.applyDeadline || "");
        setLeader(e.leader ?? "");
        setSpecializations(e.specializations || []);
        setTitle(e.title || "");
      }
    } else {
      if (!se && mode === "create") {
        if (titleRef.current) titleRef.current.value = "";
        setDescription("");
        setStartDate("");
        setEndDate("");
        setApplyDeadline("");
        setLeader("");
        setTitle("");
        setSpecializations([]);
      }
    }
  }, [se, mode, eventId]);

  const addSpec = () => {
    const val = specInputRef.current?.value || "";
    if (!val.trim()) return;
    setSpecializations((prev) => [...prev, { id: Date.now(), title: val.trim() }]);
    if (specInputRef.current) specInputRef.current.value = "";
  };

  const removeSpec = (id: number) => {
    setSpecializations(specializations.filter((s) => s.id !== id));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const curTitle = (title || "").trim();
    if (!curTitle) e.title = "Вы пропустили поле";
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
      title: (title || "").trim(),
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
    showToast("success", "Мероприятие сохранено");
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
            <input
              ref={titleRef}
              defaultValue={title}
              onBlur={() => {
                const v = titleRef.current?.value ?? "";
                setTitle(v);
              }}
              autoComplete="off"
              spellCheck={false}
              />
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
            ref={specInputRef}
            defaultValue=""
            onKeyDown={(e) => e.key === "Enter" && addSpec()}
            placeholder="Введите специализацию и нажмите Enter"
            autoComplete="off"
            spellCheck={false}
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
        {mode === "edit" && (
          <button className="danger-outline" onClick={() => setConfirmOpen(true)} style={{ marginRight: "auto" }}>
          Удалить
          </button>
        )}
        <button
          className="primary"
          onClick={handleSave}
          type="button"
        >
          Сохранить мероприятие
        </button>
      </div>
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите">
        <div style={{ padding: 8 }}>
            <div>Вы уверены, что хотите удалить мероприятие? Действие необратимо.</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="close-btn" onClick={() => setConfirmOpen(false)}>Отмена</button>
            <button
                className="danger-outline"
                onClick={() => {
                if (eventId) {
                    showToast("success", "Мероприятие успешно удалено");
                    removeEvent(Number(eventId));
                    window.location.reload();
                } else {
                    showToast("error", "Невозможно удалить: id мероприятия не найден");
                }
                }}
            >
                Удалить
            </button>
            </div>
        </div>
      </Modal>
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value || "";
    }
  }, [value]);

  return (
    <label className="date-field">
      <span className="text-small">{label}</span>

      <div className="date-input">
        <input
          ref={inputRef}
          type="text"
          placeholder="YYYY-MM-DD"
          defaultValue={value}
          onBlur={() => {
            const v = inputRef.current?.value ?? "";
            if (v !== value) onChange(v);
          }}
          onFocus={() => setOpen(true)}
        />

        <button type="button" className="calendar-btn" onClick={() => setOpen((prev) => !prev)}>
          <img src={calendarIcon} alt="calendar" />
        </button>

        {open && (
          <Calendar
            value={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
              if (inputRef.current) inputRef.current.value = date;
            }}
          />
        )}
      </div>
    </label>
  );
}