import { useEffect, useMemo, useState } from "react";
import "./calendar.scss";

interface Props {
  value?: string;
  onSelect: (date: string) => void;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseIsoDate(value?: string) {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return undefined;
  return date;
}

export default function Calendar({ value, onSelect }: Props) {
  const today = useMemo(() => new Date(), []);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [current, setCurrent] = useState(selectedDate ?? today);

  useEffect(() => {
    if (!selectedDate) return;
    setCurrent(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay() || 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const selectDate = (day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelect(iso);
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" onClick={() => setCurrent(new Date(year, month - 1, 1))} aria-label="Предыдущий месяц">
          {"<"}
        </button>
        <span>{current.toLocaleString("ru-RU", { month: "long", year: "numeric" })}</span>
        <button type="button" onClick={() => setCurrent(new Date(year, month + 1, 1))} aria-label="Следующий месяц">
          {">"}
        </button>
      </div>

      <div className="calendar-grid">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((dayName) => (
          <span key={dayName} className="calendar-day-name">{dayName}</span>
        ))}

        {Array(firstDay - 1).fill(null).map((_, index) => (
          <span key={`empty-${year}-${month}-${index}`} />
        ))}

        {days.map((day) => {
          const currentDate = new Date(year, month, day);
          const isSelected = selectedDate ? isSameDate(currentDate, selectedDate) : false;
          const isToday = isSameDate(currentDate, today);

          return (
            <button
              type="button"
              key={day}
              className={`calendar-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
              onClick={() => selectDate(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
