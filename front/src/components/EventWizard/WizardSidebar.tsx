interface Props {
  active: string;
  onChange: (v: any) => void;
}

export default function WizardSidebar({ active, onChange }: Props) {
  return (
    <div className="wizard-sidebar">
      <button
        className={active === "event" ? "active" : ""}
        onClick={() => onChange("event")}
      >
        Настройка мероприятия
      </button>

      <button
        className={active === "directions" ? "active" : ""}
        onClick={() => onChange("directions")}
      >
        Настройка направлений
      </button>

      <button
        className={active === "projects" ? "active" : ""}
        onClick={() => onChange("projects")}
      >
        Настройка проектов
      </button>

      <button
        className={active === "summary" ? "active" : ""}
        onClick={() => onChange("summary")}
      >
        Итоговые данные
      </button>
    </div>
  );
}
