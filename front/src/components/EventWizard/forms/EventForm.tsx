import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getEventById, removeEvent as apiRemoveEvent, saveEvent as persistEvent } from "../../../api/events";
import { SPECIALIZATION_OPTIONS } from "../../../constants/specializations";
import { getAllUsers } from "../../../storage/storage";
import type { Event } from "../../../types/event";
import type { User } from "../../../types/user";
import Modal from "../../Modal/Modal";
import { useToast } from "../../Toast/ToastProvider";
import DateField from "../../UI/DateField";
import { useWizard } from "../EventWizardModal";

interface Specialization {
  id: number;
  title: string;
}

export default function EventForm() {
  const { mode, saveEvent, savedEvent, eventId } = useWizard();
  const seededEvent = savedEvent as Event | undefined;
  const titleRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const [description, setDescription] = useState(seededEvent?.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");
  const [leader, setLeader] = useState<string>("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecializationId, setSelectedSpecializationId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const users = await getAllUsers();
        const normalized = (users || []).map((user) => {
          const raw = user as User & Record<string, unknown>;
          return {
            ...raw,
            name: raw.name ?? String(raw.firstName ?? raw.first_name ?? ""),
            surname: raw.surname ?? String(raw.lastName ?? raw.last_name ?? ""),
          };
        });

        if (mounted) setUsersList(normalized);
      } catch {
        if (mounted) setUsersList([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const organizers = usersList.filter((user) => user.role === "organizer");

  useEffect(() => {
    let mounted = true;

    const fillState = (event: Event) => {
      if (titleRef.current) titleRef.current.value = event.title || "";
      setTitle(event.title || "");
      setDescription(event.description || "");
      setStartDate(event.startDate || "");
      setEndDate(event.endDate || "");
      setApplyDeadline(event.applyDeadline || "");
      setLeader(String(event.leader ?? ""));
      setSpecializations(event.specializations || []);
      setSelectedSpecializationId("");
    };

    (async () => {
      if (seededEvent) {
        fillState(seededEvent);
        return;
      }

      if (mode === "edit" && eventId) {
        try {
          const event = await getEventById(Number(eventId));
          if (!mounted || !event) return;
          fillState(event);
        } catch {
          return;
        }
        return;
      }

      if (mode === "create") {
        if (titleRef.current) titleRef.current.value = "";
        setTitle("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setApplyDeadline("");
        setLeader("");
        setSpecializations([]);
        setSelectedSpecializationId("");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId, mode, seededEvent]);

  const addSpecialization = () => {
    const selected = SPECIALIZATION_OPTIONS.find((item) => String(item.id) === String(selectedSpecializationId));
    if (!selected) return;

    setSpecializations((prev) => {
      if (prev.some((item) => Number(item.id) === Number(selected.id) || item.title.trim().toLowerCase() === selected.title.trim().toLowerCase())) {
        return prev;
      }
      return [...prev, selected];
    });

    setSelectedSpecializationId("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.specializations;
      return next;
    });
  };

  const removeSpecialization = (id: number) => {
    setSpecializations((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) nextErrors.title = "Заполните поле";
    if (!startDate) nextErrors.startDate = "Заполните поле";
    if (!endDate) nextErrors.endDate = "Заполните поле";
    if (!applyDeadline) nextErrors.applyDeadline = "Заполните поле";
    if (!leader) nextErrors.leader = "Заполните поле";
    if (!specializations.length) nextErrors.specializations = "Выберите хотя бы одну специализацию";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const computedStatus = new Date(endDate) >= new Date() ? "Активно" : "Неактивно";
    const payload: Event = {
      id: mode === "edit" && eventId ? Number(eventId) : 0,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      applyDeadline,
      leader,
      specializations,
      status: computedStatus,
    };

    try {
      const saved = await persistEvent(payload);
      saveEvent?.(saved);
      showToast("success", "Мероприятие сохранено");
    } catch {
      showToast("error", "Ошибка при сохранении мероприятия");
    }
  };

  const FieldWrap = ({ name, children }: { name: string; children: ReactNode }) => (
    <div className={`field-wrap ${errors[name] ? "error" : ""}`}>
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
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </FieldWrap>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
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
        <label className="text-small">
          Руководитель мероприятия
          <select value={leader} onChange={(event) => setLeader(event.target.value)}>
            <option value="">Выберите руководителя</option>
            {organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.surname} {organizer.name}
              </option>
            ))}
          </select>
        </label>
      </FieldWrap>

      <FieldWrap name="specializations">
        <label className="text-small">
          Специализации
          <div className="wizard-inline-add-row wizard-inline-add-row--specializations">
            <select value={selectedSpecializationId} onChange={(event) => setSelectedSpecializationId(event.target.value)}>
              <option value="">Выберите специализацию</option>
              {SPECIALIZATION_OPTIONS.map((specialization) => (
                <option key={specialization.id} value={String(specialization.id)}>
                  {specialization.title}
                </option>
              ))}
            </select>
            <button className="primary wizard-inline-add-button wizard-inline-add-button--event" type="button" onClick={addSpecialization}>
              Добавить
            </button>
          </div>
        </label>
      </FieldWrap>

      <div className="tags">
        {specializations.map((specialization) => (
          <div key={specialization.id} className="tag">
            {specialization.title}
            <button type="button" onClick={() => removeSpecialization(specialization.id)} aria-label="Удалить специализацию">
              x
            </button>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        {mode === "edit" && (
          <button className="danger-outline" onClick={() => setConfirmOpen(true)} style={{ marginRight: "auto" }}>
            Удалить
          </button>
        )}
        <button className="primary" onClick={handleSave} type="button">
          Сохранить мероприятие
        </button>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите действие">
        <div style={{ padding: 8 }}>
          <div>Вы уверены, что хотите удалить мероприятие? Действие необратимо.</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="close-btn" onClick={() => setConfirmOpen(false)}>
              Отмена
            </button>
            <button
              className="danger-outline"
              onClick={async () => {
                if (!eventId) {
                  showToast("error", "Невозможно удалить мероприятие: id не найден");
                  return;
                }

                try {
                  await apiRemoveEvent(Number(eventId));
                  showToast("success", "Мероприятие успешно удалено");
                  window.location.reload();
                } catch {
                  showToast("error", "Ошибка при удалении мероприятия");
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
