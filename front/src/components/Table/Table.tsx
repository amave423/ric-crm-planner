import React, { useContext } from "react";
import editIcon from "../../assets/icons/edit.svg";
import infoIcon from "../../assets/icons/info.svg";
import { AuthContext } from "../../context/AuthContext";
import "./table.scss";

type Column = { key: string; title: string; width?: string };
type RowWithId = { id?: number | string };

interface Props<T> {
  columns: Column[];
  data: T[];
  badgeKeys?: string[];
  onInfoClick?: (row: T) => void;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  selectedId?: number;
  gridColumns?: string;
  renderCell?: (row: T, colKey: string) => React.ReactNode | undefined;
}

function buildGridTemplate(columns: Column[], gridColumns?: string) {
  if (gridColumns && gridColumns.trim()) return gridColumns;
  const cols = columns.map((c) => (c.width ? `minmax(${c.width}, ${c.width})` : "minmax(150px, 1fr)"));
  cols.push("60px");
  return cols.join(" ");
}

function getRowId(row: unknown): number | string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const candidate = (row as RowWithId).id;
  if (typeof candidate === "number" || typeof candidate === "string") return candidate;
  return undefined;
}

export default function Table<T>({
  columns,
  data,
  badgeKeys = [],
  onRowClick,
  onEdit,
  onInfoClick,
  selectedId,
  gridColumns = "",
  renderCell,
}: Props<T>) {
  const { user } = useContext(AuthContext);
  const isOrganizer = user?.role === "organizer";

  const template = buildGridTemplate(columns, gridColumns);
  const gridStyle = { "--table-grid": template } as React.CSSProperties;

  return (
    <div className="custom-table-container">
      <div className="custom-table">
        <div className="table-grid table-grid-head" style={gridStyle}>
          {columns.map((c) => (
            <div key={c.key} className="head-cell text-small">
              {c.title}
            </div>
          ))}
          <div className="head-cell head-cell-actions" />
        </div>

        {data.length === 0 ? (
          <div className="table-placeholder">Нет данных</div>
        ) : (
          data.map((row, idx) => (
            <div
              key={getRowId(row) ?? idx}
              className={`row-box table-grid${getRowId(row) === selectedId ? " selected" : ""}`}
              style={gridStyle}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => {
                if (renderCell) {
                  const custom = renderCell(row, col.key);
                  if (custom !== undefined) {
                    return (
                      <div key={col.key} className="cell">
                        {custom}
                      </div>
                    );
                  }
                }

                if (col.key === "status") {
                  const statusRaw = (row as Record<string, unknown>)[col.key];
                  const isActive = String(statusRaw ?? "").toLowerCase() === "активно";
                  return (
                    <div key={col.key} className="cell status-cell">
                      <span className={`cell-badge status-${isActive ? "active" : "inactive"}`}>{String(statusRaw ?? "—")}</span>
                    </div>
                  );
                }

                const raw = (row as Record<string, unknown>)[col.key];
                const isBadge = badgeKeys.includes(col.key);
                const display = raw == null ? "—" : Array.isArray(raw) ? raw.map((x) => String(x)).join(", ") : String(raw);

                return (
                  <div key={col.key} className="cell">
                    {isBadge ? <span className="cell-badge">{display}</span> : <div className="title-text">{display}</div>}
                  </div>
                );
              })}

              <div className="cell cell-actions">
                {isOrganizer && onEdit && (
                  <button
                    className="edit-btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                    }}
                  >
                    <img src={editIcon} alt="edit" />
                  </button>
                )}

                {!isOrganizer && onInfoClick && (
                  <button
                    className="info-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInfoClick(row);
                    }}
                    aria-label="Информация"
                  >
                    <img src={infoIcon} alt="info" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
