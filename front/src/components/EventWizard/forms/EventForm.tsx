import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SPECIALIZATION_OPTIONS } from "../../../constants/specializations";
import { getEventById, removeEvent as apiRemoveEvent, saveEvent as persistEvent } from "../../../api/events";
import { getAllUsers } from "../../../storage/storage";
import type { Event } from "../../../types/event";
import type { User } from "../../../types/user";
import AppButton from "../../UI/Button";
import DateField, { DateRangeField } from "../../UI/DateField";
import AppInput, { AppTextArea } from "../../UI/Input";
import Modal from "../../Modal/Modal";
import AppSelect from "../../UI/Select";
import { useToast } from "../../Toast/ToastProvider";
import { useWizard } from "../EventWizardModal";

interface SpecializationOption {
  id: number;
  title: string;
}

function FieldWrap({ name, errors, children }: { name: string; errors: Record<string, string>; children: ReactNode }) {
  return (
    <div className={`field-wrap ${errors[name] ? "error" : ""}`}>
      {children}
      {errors[name] && <div className="field-error">{errors[name]}</div>}
    </div>
  );
}

function normalizeDateFieldValue(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function extractErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;

    const parts = Object.values(record)
      .flatMap((value) => {
        if (typeof value === "string") return [value];
        if (Array.isArray(value)) {
          return value.filter((item): item is string => typeof item === "string");
        }
        return [];
      })
      .filter((part) => part.trim());

    if (parts.length > 0) return parts.join(" ");
  }

  return "Ошибка при сохранении мероприятия";
}

export default function EventForm() {
  const { mode, saveEvent, savedEvent, eventId } = useWizard();
  const seededEvent = savedEvent as Event | undefined;
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(seededEvent?.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");
  const [leader, setLeader] = useState<string>("");
  const [specializations, setSpecializations] = useState<SpecializationOption[]>([]);
  const [selectedSpecializationId, setSelectedSpecializationId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      setTitle(event.title || "");
      setDescription(event.description || "");
      setStartDate(normalizeDateFieldValue(event.startDate));
      setEndDate(normalizeDateFieldValue(event.endDate));
      setApplyDeadline(normalizeDateFieldValue(event.applyDeadline));
      setLeader(String(event.leader ?? ""));
      setSpecializations((event.specializations || []).map((item) => ({ id: item.id, title: item.title })));
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
      if (
        prev.some(
          (item) =>
            Number(item.id) === Number(selected.id) || item.title.trim().toLowerCase() === selected.title.trim().toLowerCase()
        )
      ) {
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
    } catch (error) {
      showToast("error", extractErrorMessage(error));
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "create" ? "Добавление мероприятия" : "Редактирование мероприятия"}</h2>

      <FieldWrap name="title" errors={errors}>
        <label className="text-small">
          Название мероприятия
          <AppInput value={title} onChange={(event) => setTitle(event.target.value)} autoComplete="off" spellCheck={false} />
        </label>
      </FieldWrap>

      <label className="text-small">
        Описание
        <AppTextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className="date-row">
        <div className={`field-wrap ${errors.startDate || errors.endDate ? "error" : ""}`}>
          <DateRangeField
            className="app-date-range-field--compact"
            label="Дата начала и завершения"
            startValue={startDate}
            endValue={endDate}
            placeholders={["Дата начала", "Дата завершения"]}
            onChange={(nextStartDate, nextEndDate) => {
              setStartDate(nextStartDate);
              setEndDate(nextEndDate);
            }}
          />
          {(errors.startDate || errors.endDate) && <div className="field-error">{errors.startDate || errors.endDate}</div>}
        </div>

        <FieldWrap name="applyDeadline" errors={errors}>
          <DateField label="Срок приёма заявок" value={applyDeadline} onChange={setApplyDeadline} placeholder="Срок приёма" />
        </FieldWrap>
      </div>

      <FieldWrap name="leader" errors={errors}>
        <label className="text-small">
          Руководитель мероприятия
          <AppSelect
            tone="event"
            value={leader}
            onChange={(value) => setLeader(String(value))}
            options={[
              { value: "", label: "Выберите руководителя" },
              ...organizers.map((organizer) => ({
                value: String(organizer.id),
                label: `${organizer.surname} ${organizer.name}`.trim(),
              })),
            ]}
          />
        </label>
      </FieldWrap>

      <FieldWrap name="specializations" errors={errors}>
        <label className="text-small">
          Специализации
          <div className="wizard-inline-add-row wizard-inline-add-row--specializations">
            <AppSelect
              tone="event"
              value={selectedSpecializationId}
              onChange={(value) => setSelectedSpecializationId(String(value))}
              options={[
                { value: "", label: "Выберите специализацию" },
                ...SPECIALIZATION_OPTIONS.map((specialization) => ({
                  value: String(specialization.id),
                  label: specialization.title,
                })),
              ]}
            />
            <AppButton
              className="primary wizard-inline-add-button wizard-inline-add-button--event"
              type="button"
              onClick={addSpecialization}
              disabled={!selectedSpecializationId}
            >
              Добавить
            </AppButton>
          </div>
        </label>
      </FieldWrap>

      <div className="tags">
        {specializations.map((specialization) => (
          <div key={specialization.id} className="tag">
            {specialization.title}
            <AppButton
              className="tag-remove"
              type="button"
              onClick={() => removeSpecialization(specialization.id)}
              aria-label="Удалить специализацию"
            >
              x
            </AppButton>
          </div>
        ))}
      </div>

      <div className="wizard-actions">
        {mode === "edit" && (
          <AppButton className="danger-outline" onClick={() => setConfirmOpen(true)} style={{ marginRight: "auto" }}>
            Удалить
          </AppButton>
        )}

        <AppButton className="primary" onClick={handleSave} type="button">
          Сохранить мероприятие
        </AppButton>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите действие">
        <div style={{ padding: 8 }}>
          <div>Вы уверены, что хотите удалить мероприятие? Действие необратимо.</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <AppButton className="close-btn" onClick={() => setConfirmOpen(false)}>
              Отмена
            </AppButton>
            <AppButton
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
            </AppButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
