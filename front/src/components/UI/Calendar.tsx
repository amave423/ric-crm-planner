import { useState } from "react";
import "./calendar.scss";

interface Props {
  value?: string;
  onSelect: (date: string) => void;
}

export default function Calendar({ value, onSelect }: Props) {
  const today = new Date();
  const [current, setCurrent] = useState(today);

  const year = current.getFullYear();
  const month = current.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay() || 7;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectDate = (day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelect(iso);
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}>‹</button>
        <span>{current.toLocaleString("ru", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="calendar-grid">
        {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d => (
          <span key={d} className="calendar-day-name">{d}</span>
        ))}

        {Array(firstDay - 1).fill(null).map((_, i) => (
          <span key={`e-${i}`} />
        ))}

        {days.map(day => (
          <button
            key={day}
            className="calendar-day"
            onClick={() => selectDate(day)}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
