import { useState } from "react";
import "./event-wizard.scss";

type Mode = "create" | "edit";
type Step = "event" | "directions" | "projects";

interface Props {
  mode: Mode;
  initialData?: any;
  onClose: () => void;
}

export default function EventWizard({ mode, initialData, onClose }: Props) {
  const [step, setStep] = useState<Step>("event");

  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    applyDeadline: initialData?.applyDeadline || "",
    organizerId: initialData?.organizerId || null,
    specializations: initialData?.specializations || [],
    chatLink: initialData?.chatLink || ""
  });

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="wizard-overlay">
      <div className="wizard">
        <aside className="wizard-nav">
          <button
            className={step === "event" ? "active" : ""}
            onClick={() => setStep("event")}
          >
            Настройка мероприятия
          </button>

          <button
            className={step === "directions" ? "active" : ""}
            onClick={() => setStep("directions")}
          >
            Настройка направлений
          </button>

          <button
            className={step === "projects" ? "active" : ""}
            onClick={() => setStep("projects")}
          >
            Настройка проектов
          </button>
        </aside>

        <div className="wizard-content">
          <h2>
            {step === "event" &&
              (mode === "create"
                ? "Добавление мероприятия"
                : "Редактирование мероприятия")}

            {step === "directions" && "Добавление направлений"}
            {step === "projects" && "Добавление проектов"}
          </h2>

          {step === "event" && (
            <div className="form-grid">
              <input
                placeholder="Название мероприятия"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />

              <textarea
                placeholder="Описание"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />

              <div className="row">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
                <input
                  type="date"
                  value={form.applyDeadline}
                  onChange={(e) => update("applyDeadline", e.target.value)}
                />
              </div>

              <input
                placeholder="Ссылка на орг. чат"
                value={form.chatLink}
                onChange={(e) => update("chatLink", e.target.value)}
              />
            </div>
          )}

          {step !== "event" && (
            <div className="stub">
              Контент шага «{step}»
            </div>
          )}

          <div className="wizard-actions">
            <button className="secondary" onClick={onClose}>
              Закрыть
            </button>

            <button className="primary">
              Сохранить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
