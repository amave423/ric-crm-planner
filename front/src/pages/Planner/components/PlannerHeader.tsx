import type { PlannerTeam } from "../../../types/planner";

type PlannerHeaderProps = {
  visibleTeams: PlannerTeam[];
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
};

export default function PlannerHeader({ visibleTeams, teamFilter, onTeamFilterChange }: PlannerHeaderProps) {
  return (
    <div className="planner-head">
      <h1 className="h1">Планировщик</h1>
      <label className="planner-label">
        Команда
        <select value={teamFilter} onChange={(event) => onTeamFilterChange(event.target.value)} disabled={visibleTeams.length === 0}>
          {visibleTeams.length === 0 && <option value="">Нет команд</option>}
          {visibleTeams.map((team) => (
            <option key={team.id} value={String(team.id)}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
