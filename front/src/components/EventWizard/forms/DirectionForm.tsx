import { useEffect, useState } from "react";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel } from "../types";
import { getDirectionsByEvent, saveDirectionsForEvent as persistDirections } from "../../../api/directions";
import { getEventById } from "../../../api/events";
import type { Direction } from "../../../types/direction";
import type { Event } from "../../../types/event";
import type { User } from "../../../types/user";
import { getAllUsers } from "../../../storage/storage";
import { useToast } from "../../Toast/ToastProvider";
import AppButton from "../../UI/Button";
import AppInput, { AppTextArea } from "../../UI/Input";
import AppSelect from "../../UI/Select";

function normalizeUser(user: User | Record<string, unknown>): User {
  const raw = user as User & Record<string, unknown>;
  return {
    ...raw,
    id: Number(raw.id),
    email: String(raw.email ?? ""),
    role: String(raw.role ?? ""),
    name: raw.name ?? String(raw.firstName ?? raw.first_name ?? ""),
    surname: raw.surname ?? String(raw.lastName ?? raw.last_name ?? ""),
  };
}

function toDirectionModel(direction: Direction): DirectionModel {
  return {
    id: Number(direction.id),
    title: direction.title ?? "",
    description: direction.description ?? undefined,
    projects: direction.projects ?? [],
    organizer: typeof direction.organizer === "string" ? direction.organizer : String(direction.organizer ?? ""),
  };
}

export default function DirectionForm() {
  const { mode, saveDirections, eventId, savedDirections, directionId: ctxDirectionId } = useWizard();
  const { showToast } = useToast();

  const [description, setDescription] = useState("");
  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [input, setInput] = useState("");
  const [selectedOrganizer, setSelectedOrganizer] = useState("");
  const [editingDirectionId, setEditingDirectionId] = useState<number | null>(mode === "edit" && ctxDirectionId ? Number(ctxDirectionId) : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);

  const organizers = usersList.filter((user) => user.role === "organizer");

  const fillForm = (direction?: DirectionModel) => {
    if (!direction) return;
    setEditingDirectionId(Number(direction.id));
    setInput(direction.title ?? "");
    setDescription(direction.description ?? "");
    setSelectedOrganizer(typeof direction.organizer === "string" ? direction.organizer : String(direction.organizer ?? ""));
    setErrors({});
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await getAllUsers();
        if (mounted) setUsersList((users || []).map((user) => normalizeUser(user)));
      } catch {
        if (mounted) setUsersList([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (savedDirections && savedDirections.length > 0) {
        if (!mounted) return;
        setDirections(savedDirections);
        if (mode === "edit" && ctxDirectionId) {
          fillForm(savedDirections.find((direction) => Number(direction.id) === Number(ctxDirectionId)));
        } else {
          setSelectedOrganizer((prev) => prev || savedDirections[0]?.organizer || "");
        }
        return;
      }

      if (!eventId) return;
      setLoading(true);
      try {
        const apiDirections = await getDirectionsByEvent(Number(eventId));
        if (!mounted) return;
        const mapped = apiDirections.map((direction) => toDirectionModel(direction));
        setDirections(mapped);

        if (mode === "edit" && ctxDirectionId) {
          fillForm(mapped.find((direction) => Number(direction.id) === Number(ctxDirectionId)));
        } else {
          const event = await getEventById(Number(eventId)).catch(() => undefined);
          if (!mounted) return;
          const leaderId = (event as Event | undefined)?.leader;
          if (leaderId != null) {
            const organizer = usersList.find((user) => user.role === "organizer" && String(user.id) === String(leaderId));
            if (organizer) {
              setSelectedOrganizer((prev) => prev || `${organizer.surname} ${organizer.name}`.trim());
            }
          }
        }
      } catch {
        if (mounted) setDirections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ctxDirectionId, eventId, mode, savedDirections, usersList]);

  const validateDraft = () => {
    const nextErrors: Record<string, string> = {};
    if (!input.trim()) nextErrors.input = "Введите название направления";
    if (!selectedOrganizer.trim()) nextErrors.selectedOrganizer = "Выберите организатора";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveDraftToList = () => {
    if (!validateDraft()) return;

    const title = input.trim();
    const nextDescription = description.trim();

    if (editingDirectionId != null) {
      setDirections((prev) =>
        prev.map((direction) =>
          Number(direction.id) === Number(editingDirectionId)
            ? {
                ...direction,
                title,
                description: nextDescription || undefined,
                organizer: selectedOrganizer,
              }
            : direction
        )
      );
      showToast("success", "Изменения направления добавлены в черновик");
      return;
    }

    setDirections((prev) => [
      ...prev,
      {
        id: Date.now(),
        title,
        description: nextDescription || undefined,
        projects: [],
        organizer: selectedOrganizer,
      },
    ]);
    setInput("");
    setDescription("");
    setSelectedOrganizer("");
    setErrors({});
  };

  const removeDirection = (id: number) => {
    setDirections((prev) => prev.filter((direction) => Number(direction.id) !== Number(id)));
    if (Number(editingDirectionId) === Number(id)) {
      setEditingDirectionId(null);
      setInput("");
      setDescription("");
      setSelectedOrganizer("");
    }
  };

  const handleSave = async () => {
    if (!eventId) {
      showToast("error", "Сначала сохраните мероприятие.");
      return;
    }

    const preparedDirections =
      editingDirectionId != null
        ? directions.map((direction) =>
            Number(direction.id) === Number(editingDirectionId)
              ? {
                  ...direction,
                  title: input.trim(),
                  description: description.trim() || undefined,
                  organizer: selectedOrganizer,
                }
              : direction
          )
        : directions;

    for (const direction of preparedDirections) {
      if (!direction.title?.trim()) {
        showToast("error", "У одного из направлений нет названия");
        return;
      }
      if (!String(direction.organizer ?? "").trim()) {
        showToast("error", "У одного из направлений не выбран организатор");
        return;
      }
    }

    type DirectionDraft = Omit<Direction, "id"> & { id?: number };

    const payload = preparedDirections.map((direction): DirectionDraft => {
      let leaderId: number | undefined;
      const organizerValue = String(direction.organizer ?? "").trim();
      const numericOrganizer = Number(organizerValue);

      if (!Number.isNaN(numericOrganizer)) {
        leaderId = numericOrganizer;
      } else {
        const foundOrganizer = usersList.find((user) => `${user.surname} ${user.name}`.trim() === organizerValue);
        if (foundOrganizer) leaderId = Number(foundOrganizer.id);
      }

      const nextDirection: DirectionDraft = {
        ...(direction.id ? { id: Number(direction.id) } : {}),
        title: direction.title?.trim() ?? "",
        description: direction.description ?? "",
        organizer: organizerValue,
      };

      if (typeof leaderId !== "undefined") nextDirection.leader = leaderId;
      return nextDirection;
    });

    try {
      const saved = await persistDirections(Number(eventId), payload as Direction[]);
      const mapped = (saved as Direction[]).map((direction) => toDirectionModel(direction));
      setDirections(mapped);
      saveDirections?.(mapped);
      if (mode === "edit" && ctxDirectionId) {
        fillForm(mapped.find((direction) => Number(direction.id) === Number(ctxDirectionId)));
      }
      showToast("success", "Направления сохранены");
    } catch {
      showToast("error", "Ошибка при сохранении направлений");
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "edit" ? "Редактирование направления" : "Добавление направлений"}</h2>

      <div className={`field-wrap ${errors.input ? "error" : ""}`}>
        <label className="text-small">
          Название направления
          <div className="wizard-inline-add-row wizard-inline-add-row--entity">
            <AppInput
              placeholder="Введите название направления"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.input;
                  return next;
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveDraftToList();
                }
              }}
            />
            <AppButton className="primary wizard-inline-add-button wizard-inline-add-button--secondary" type="button" onClick={saveDraftToList}>
              {editingDirectionId != null ? "Обновить" : "Добавить"}
            </AppButton>
          </div>
        </label>
        {errors.input && <div className="field-error">{errors.input}</div>}
      </div>

      <label className="text-small">
        Описание
        <AppTextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className={`field-wrap ${errors.selectedOrganizer ? "error" : ""}`}>
        <label className="text-small">
          Организатор направления
          <AppSelect
            tone="directions"
            value={selectedOrganizer}
            onChange={(value) => {
              setSelectedOrganizer(String(value));
              setErrors((prev) => {
                const next = { ...prev };
                delete next.selectedOrganizer;
                return next;
              });
            }}
            options={[
              { value: "", label: "Выберите организатора" },
              ...organizers.map((organizer) => {
                const name = `${organizer.surname} ${organizer.name}`.trim();
                return { value: name, label: name };
              }),
            ]}
          />
        </label>
        {errors.selectedOrganizer && <div className="field-error">{errors.selectedOrganizer}</div>}
      </div>

      <div className="tags">
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          directions.map((direction) => (
            <div
              key={direction.id}
              className="tag"
              style={Number(editingDirectionId) === Number(direction.id) ? { outline: "2px solid var(--wizard-accent)" } : undefined}
            >
              <AppButton
                className="tag-edit"
                type="button"
                style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                onClick={() => fillForm(direction)}
              >
                <strong style={{ lineHeight: 1 }}>{direction.title}</strong>
                {direction.description && <span className="text-small" style={{ opacity: 0.8 }}>{direction.description}</span>}
                {direction.organizer && <span className="text-small" style={{ opacity: 0.8 }}>Организатор: {direction.organizer}</span>}
              </AppButton>
              <AppButton className="tag-remove" type="button" onClick={() => removeDirection(Number(direction.id))} aria-label="Удалить направление">
                x
              </AppButton>
            </div>
          ))
        )}
      </div>

      <div className="wizard-actions">
        <AppButton className="primary" onClick={handleSave} type="button">
          Сохранить направления
        </AppButton>
      </div>
    </div>
  );
}
