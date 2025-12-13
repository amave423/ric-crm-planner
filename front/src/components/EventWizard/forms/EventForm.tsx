interface Props {
  data: any;
  onSave: (d: any) => void;
  onNext: () => void;
}

export default function EventForm({ data, onSave, onNext }: Props) {
  return (
    <>
      <h2>{data?.id ? "Редактирование мероприятия" : "Добавление мероприятия"}</h2>

      <input
        placeholder="Название мероприятия"
        value={data.title || ""}
        onChange={(e) => onSave({ ...data, title: e.target.value })}
      />

      <textarea
        placeholder="Описание"
        value={data.description || ""}
        onChange={(e) => onSave({ ...data, description: e.target.value })}
      />

      <div className="row">
        <input
          type="date"
          value={data.start_date || ""}
          onChange={(e) => onSave({ ...data, start_date: e.target.value })}
        />

        <input
          type="date"
          value={data.end_date || ""}
          onChange={(e) => onSave({ ...data, end_date: e.target.value })}
        />
      </div>

      <div className="actions">
        <button onClick={onNext}>Настройка направлений</button>
        <button
          onClick={() => {
            onSave(data);
            alert("Данные мероприятия успешно сохранены");
          }}
        >
          Сохранить настройки
        </button>
      </div>
    </>
  );
}
