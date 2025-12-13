interface Props {
  mode: "create" | "edit";
  data: any;
  onChange: (v: any) => void;
  onNext: () => void;
}

export default function WizardEventForm({
  mode,
  data,
  onChange,
  onNext
}: Props) {
  const update = (key: string, value: any) =>
    onChange({ ...data, [key]: value });

  return (
    <>
      <h2>
        {mode === "create"
          ? "Добавление мероприятия"
          : "Редактирование мероприятия"}
      </h2>

      <div className="form-grid">
        <input
          placeholder="Название мероприятия"
          value={data.title || ""}
          onChange={(e) => update("title", e.target.value)}
        />

        <textarea
          placeholder="Описание"
          value={data.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />

        <div className="row">
          <input
            type="date"
            value={data.startDate || ""}
            onChange={(e) => update("startDate", e.target.value)}
          />
          <input
            type="date"
            value={data.endDate || ""}
            onChange={(e) => update("endDate", e.target.value)}
          />
        </div>

        <input
          placeholder="Ссылка на орг. чат"
          value={data.chatLink || ""}
          onChange={(e) => update("chatLink", e.target.value)}
        />
      </div>

      <div className="wizard-actions">
        <button className="primary" onClick={onNext}>
          Сохранить настройки
        </button>

        <button className="secondary" onClick={onNext}>
          Настройка направлений
        </button>
      </div>
    </>
  );
}
