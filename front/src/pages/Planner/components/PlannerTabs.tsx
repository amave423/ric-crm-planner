import type { PlannerTab } from "../planner.types";
import AppButton from "../../../components/UI/Button";

type PlannerTabsProps = {
  tab: PlannerTab;
  onChange: (tab: PlannerTab) => void;
};

export default function PlannerTabs({ tab, onChange }: PlannerTabsProps) {
  return (
    <div className="planner-tabs">
      <AppButton className={tab === "teams" ? "active" : ""} onClick={() => onChange("teams")}>
        Команды
      </AppButton>
      <AppButton className={tab === "backlog" ? "active" : ""} onClick={() => onChange("backlog")}>
        Бэклог
      </AppButton>
      <AppButton className={tab === "kanban" ? "active" : ""} onClick={() => onChange("kanban")}>
        Канбан
      </AppButton>
      <AppButton className={tab === "gantt" ? "active" : ""} onClick={() => onChange("gantt")}>
        Гант
      </AppButton>
    </div>
  );
}
