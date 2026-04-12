import { useEffect, useRef, useState } from "react";
import calendarIcon from "../../assets/icons/calendar.svg";
import Calendar from "./Calendar";
import "./date-field.scss";

interface DateFieldProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDateRu(value?: string) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) return trimmed;

  const ruMatch = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(trimmed);
  if (!ruMatch) return null;

  const day = Number(ruMatch[1]);
  const month = Number(ruMatch[2]);
  const year = Number(ruMatch[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DateField({
  value = "",
  onChange,
  label,
  placeholder = "ДД.ММ.ГГГГ",
  className = "",
  disabled = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(formatDateRu(value));
  const wrapperRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    setInputValue(formatDateRu(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const commitValue = () => {
    const parsed = parseDateInput(inputValue);
    if (parsed === null) {
      setInputValue(formatDateRu(value));
      return;
    }
    onChange(parsed);
    setInputValue(formatDateRu(parsed));
  };

  return (
    <label ref={wrapperRef} className={`ui-date-field ${className}`.trim()}>
      {label && <span className="text-small">{label}</span>}
      <div className="ui-date-input">
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="numeric"
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={commitValue}
        />
        <button
          type="button"
          className="ui-calendar-btn"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          aria-label="Открыть календарь"
          disabled={disabled}
        >
          <img src={calendarIcon} alt="calendar" />
        </button>
        {open && !disabled && (
          <Calendar
            value={value}
            onSelect={(date) => {
              onChange(date);
              setInputValue(formatDateRu(date));
              setOpen(false);
            }}
          />
        )}
      </div>
    </label>
  );
}
