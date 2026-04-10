import type { PlannerTab } from "../planner.types";

type PlannerTabsProps = {
  tab: PlannerTab;
  onChange: (tab: PlannerTab) => void;
};

export default function PlannerTabs({ tab, onChange }: PlannerTabsProps) {
  return (
    <div className="planner-tabs">
      <button className={tab === "teams" ? "active" : ""} onClick={() => onChange("teams")}>
        Команды
      </button>
      <button className={tab === "backlog" ? "active" : ""} onClick={() => onChange("backlog")}>
        Бэклог
      </button>
      <button className={tab === "kanban" ? "active" : ""} onClick={() => onChange("kanban")}>
        Канбан
      </button>
      <button className={tab === "gantt" ? "active" : ""} onClick={() => onChange("gantt")}>
        Гант
      </button>
    </div>
  );
}
