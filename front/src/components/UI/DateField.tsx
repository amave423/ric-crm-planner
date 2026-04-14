import { useEffect, useRef, useState } from "react";
import { Button as AntButton, Calendar as AntCalendar, Card } from "antd";
import type { CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import calendarIcon from "../../assets/icons/calendar.svg";
import AppSelect from "./Select";
import "./date-field.scss";

dayjs.extend(customParseFormat);

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const YEAR_OPTIONS = Array.from({ length: 201 }, (_, index) => 1900 + index);

interface DateFieldProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parseIsoDate(value?: string) {
  if (!value) return undefined;
  const parsed = dayjs(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed : undefined;
}

function formatDateRu(value?: string) {
  if (!value) return "";
  const parsed = parseIsoDate(value);
  return parsed ? parsed.format("DD.MM.YYYY") : value;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoDate = dayjs(trimmed, "YYYY-MM-DD", true);
  if (isoDate.isValid()) return isoDate.format("YYYY-MM-DD");

  const ruDate = dayjs(trimmed, ["DD.MM.YYYY", "DD/MM/YYYY", "DD-MM-YYYY"], true);
  return ruDate.isValid() ? ruDate.format("YYYY-MM-DD") : null;
}

const renderCalendarHeader: CalendarProps<Dayjs>["headerRender"] = ({
  value,
  type,
  onChange,
  onTypeChange,
}) => {
  const currentYear = value.year();
  const currentMonth = value.month();

  return (
    <div className="ui-calendar-header" onMouseDown={(event) => event.stopPropagation()}>
      <AppSelect
        className="ui-calendar-select ui-calendar-select--year"
        aria-label="Год"
        value={currentYear}
        onChange={(nextYear) => onChange(value.year(Number(nextYear)))}
        popupMatchSelectWidth={false}
        options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
      />

      <AppSelect
        className="ui-calendar-select ui-calendar-select--month"
        aria-label="Месяц"
        value={currentMonth}
        onChange={(nextMonth) => onChange(value.month(Number(nextMonth)))}
        popupMatchSelectWidth={false}
        options={MONTH_NAMES.map((month, index) => ({ value: index, label: month }))}
      />

      <div className="ui-calendar-mode" aria-label="Режим календаря">
        <AntButton
          htmlType="button"
          type="text"
          className={`ui-calendar-mode-btn${type === "month" ? " is-active" : ""}`}
          onClick={() => onTypeChange("month")}
        >
          Месяц
        </AntButton>
        <AntButton
          htmlType="button"
          type="text"
          className={`ui-calendar-mode-btn${type === "year" ? " is-active" : ""}`}
          onClick={() => onTypeChange("year")}
        >
          Год
        </AntButton>
      </div>
    </div>
  );
};

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
  const [calendarValue, setCalendarValue] = useState<Dayjs>(() => parseIsoDate(value) ?? dayjs());
  const wrapperRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    setInputValue(formatDateRu(value));
    setCalendarValue(parseIsoDate(value) ?? dayjs());
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".ant-select-dropdown, .ant-picker-dropdown")) return;

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
    setCalendarValue(parseIsoDate(parsed) ?? dayjs());
  };

  const selectDate = (date: Dayjs) => {
    const isoDate = date.format("YYYY-MM-DD");
    onChange(isoDate);
    setInputValue(date.format("DD.MM.YYYY"));
    setCalendarValue(date);
    setOpen(false);
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
        <AntButton
          htmlType="button"
          type="text"
          className="ui-calendar-btn"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          aria-label="Открыть календарь"
          disabled={disabled}
          icon={<img src={calendarIcon} alt="" />}
        />
        {open && !disabled && (
          <Card className="ui-calendar-card" styles={{ body: { padding: 0 } }} onMouseDown={(event) => event.stopPropagation()}>
            <AntCalendar
              fullscreen={false}
              value={calendarValue}
              headerRender={renderCalendarHeader}
              onPanelChange={(date) => setCalendarValue(date)}
              onSelect={selectDate}
            />
          </Card>
        )}
      </div>
    </label>
  );
}
