import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import editIcon from "../../assets/icons/edit.svg";
import "./table.scss";

type Column = { key: string; title: string; width?: string };

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

export default function Table<T>({
  columns,
  data,
  badgeKeys = [],
  onRowClick,
  onEdit,
  selectedId,
  gridColumns = "",
  renderCell
}: Props<T>) {
  const { user } = useContext(AuthContext);
  const isOrganizer = user?.role === "organizer";

  return (
    <div className="custom-table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className="text-small"> {c.title}</th>
            ))}
            <th style={{ width: "60px" }} />
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="td-full">
                <div className="table-placeholder">Нет данных</div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={(row as any).id ?? idx}>
                <td colSpan={columns.length + 1} className="td-full">
                  <div
                    className={`row-box${(row as any).id === selectedId ? " selected" : ""}`}
                    style={{ "--table-grid": gridColumns } as React.CSSProperties}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => {
                      if (renderCell) {
                        const custom = renderCell(row, col.key);
                        if (custom !== undefined) {
                          return (
                            <div key={col.key} className="cell" style={{ width: col.width }}>
                              {custom}
                            </div>
                          );
                        }
                      }

                      if (col.key === "status") {
                        const statusRaw = (row as Record<string, unknown>)[col.key];
                        const isActive = String(statusRaw ?? "").toLowerCase() === "активно";
                        return (
                          <div key={col.key} className="cell status-cell" style={{ width: col.width }}>
                            <span className={`cell-badge status-${isActive ? "active" : "inactive"}`}>
                              {String(statusRaw ?? "—")}
                            </span>
                          </div>
                        );
                      }

                      const raw = (row as Record<string, unknown>)[col.key];
                      const isBadge = badgeKeys.includes(col.key);
                      const display = raw == null ? "—" : Array.isArray(raw) ? (raw as any[]).map((x) => String(x)).join(", ") : String(raw);

                      return (
                        <div key={col.key} className="cell" style={{ width: col.width }}>
                          {isBadge ? <span className="cell-badge">{display}</span> : <div className="title-text">{display}</div>}
                        </div>
                      );
                    })}

                    <div className="cell" style={{ width: 60 }}>
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
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}