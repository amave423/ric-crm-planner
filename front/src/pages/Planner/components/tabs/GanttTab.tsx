import type { GanttRow, GanttTick } from "../../planner.types";

type GanttTabProps = {
  rows: GanttRow[];
  ticks: GanttTick[];
  minDate: string;
  maxDate: string;
  span: number;
};

export default function GanttTab({ rows, ticks, minDate, maxDate, span }: GanttTabProps) {
  return (
    <div className="planner-card">
      <h3 className="h3">Диаграмма Ганта</h3>

      {rows.length === 0 ? (
        <div className="planner-empty-inline">Нет задач для отображения.</div>
      ) : (
        <>
          <div className="gantt-range">
            <span>{minDate}</span>
            <span>{maxDate}</span>
          </div>

          <div className="gantt-axis">
            <div className="gantt-axis-spacer" />
            <div className="gantt-axis-track">
              {ticks.map((tick) => (
                <div key={`${tick.offset}-${tick.label}`} className="gantt-axis-tick" style={{ left: `${tick.offset}%` }}>
                  <span>{tick.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-rows">
            {rows.map((row) => {
              const startOffset = Math.floor((Date.parse(row.start) - Date.parse(minDate)) / 86400000);
              const endOffset = Math.floor((Date.parse(row.end) - Date.parse(minDate)) / 86400000);
              const left = `${Math.max(0, (startOffset / span) * 100)}%`;
              const width = `${Math.max(1.5, ((endOffset - startOffset + 1) / span) * 100)}%`;

              return (
                <div key={row.key} className={`gantt-row ${row.type}`}>
                  <div className="gantt-label">{row.label}</div>
                  <div className="gantt-track">
                    <div className="gantt-bar" style={{ left, width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
