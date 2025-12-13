import { useState } from "react";

interface Direction {
  id?: number;
  title: string;
  description: string;
  leader_id?: number;
}

interface Props {
  data: Direction[];
  event: any;
  onNext: () => void;
  onBack: () => void;
}

export default function DirectionForm({
  data,
  event,
  onNext,
  onBack
}: Props) {
  const [directions, setDirections] = useState<Direction[]>(data || []);

  const addDirection = () => {
    setDirections(prev => [
      ...prev,
      { title: "", description: "" }
    ]);
  };

  const updateDirection = (index: number, key: string, value: string) => {
    const copy = [...directions];
    copy[index] = { ...copy[index], [key]: value };
    setDirections(copy);
  };

  const removeDirection = (index: number) => {
    setDirections(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <h2>
        {event?.title
          ? `Добавление направлений — ${event.title}`
          : "Добавление направлений"}
      </h2>

      {directions.map((d, i) => (
        <div key={i} className="card-block">
          <input
            placeholder="Название направления"
            value={d.title}
            onChange={(e) =>
              updateDirection(i, "title", e.target.value)
            }
          />

          <textarea
            placeholder="Описание направления"
            value={d.description}
            onChange={(e) =>
              updateDirection(i, "description", e.target.value)
            }
          />

          <button
            className="danger-btn"
            onClick={() => removeDirection(i)}
          >
            Удалить направление
          </button>
        </div>
      ))}

      <button className="secondary-btn" onClick={addDirection}>
        + Добавить направление
      </button>

      <div className="actions">
        <button onClick={onBack}>Назад к мероприятию</button>
        <button
          onClick={() => {
            // тут позже будет API / сохранение в БД
            console.log("SAVE DIRECTIONS:", directions);
            onNext();
          }}
        >
          Настройка проектов
        </button>
      </div>
    </>
  );
}
