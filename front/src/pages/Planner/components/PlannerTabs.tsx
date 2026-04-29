import type { PlannerTab } from "../planner.types";
import AppButton from "../../../components/UI/Button";

const TEXT = {
  teams: "Команды",
  backlog: "Бэклог",
  kanban: "Канбан",
  gantt: "Гант",
} as const;

type PlannerTabsProps = {
  tab: PlannerTab;
  onChange: (tab: PlannerTab) => void;
};

export default function PlannerTabs({ tab, onChange }: PlannerTabsProps) {
  return (
    <div className="planner-tabs">
      <AppButton className={tab === "teams" ? "active" : ""} onClick={() => onChange("teams")}>
        {TEXT.teams}
      </AppButton>
      <AppButton className={tab === "backlog" ? "active" : ""} onClick={() => onChange("backlog")}>
        {TEXT.backlog}
      </AppButton>
      <AppButton className={tab === "kanban" ? "active" : ""} onClick={() => onChange("kanban")}>
        {TEXT.kanban}
      </AppButton>
      <AppButton className={tab === "gantt" ? "active" : ""} onClick={() => onChange("gantt")}>
        {TEXT.gantt}
      </AppButton>
    </div>
  );
}
