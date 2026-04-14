import { Button as AntButton, Calendar as AntCalendar, Card } from "antd";
import type { CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import AppSelect from "./Select";
import "./calendar.scss";

interface Props {
  value?: string;
  onSelect: (date: string) => void;
}

function parseIsoDate(value?: string) {
  if (!value) return dayjs();
  const parsed = dayjs(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed : dayjs();
}

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

const renderCalendarHeader: CalendarProps<Dayjs>["headerRender"] = ({
  value,
  type,
  onChange,
  onTypeChange,
}) => (
  <div className="ui-calendar-header" onMouseDown={(event) => event.stopPropagation()}>
    <AppSelect
      className="ui-calendar-select ui-calendar-select--year"
      aria-label="Год"
      value={value.year()}
      onChange={(nextYear) => onChange(value.year(Number(nextYear)))}
      popupMatchSelectWidth={false}
      options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
    />

    <AppSelect
      className="ui-calendar-select ui-calendar-select--month"
      aria-label="Месяц"
      value={value.month()}
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

export default function Calendar({ value, onSelect }: Props) {
  const selected = parseIsoDate(value);

  const handleSelect = (date: Dayjs) => {
    onSelect(date.format("YYYY-MM-DD"));
  };

  return (
    <Card className="calendar calendar--antd" styles={{ body: { padding: 0 } }}>
      <AntCalendar fullscreen={false} value={selected} headerRender={renderCalendarHeader} onSelect={handleSelect} />
    </Card>
  );
}
