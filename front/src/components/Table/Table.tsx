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

function toDisplay(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map((x) => String(x)).join(", ");
  return String(value);
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
  const columnKeys = columns.map((c) => c.key);
  const isEventMobileLayout = ["title", "startDate", "endDate", "organizer", "status"].every((k) => columnKeys.includes(k));
  const isRequestMobileLayout = ["studentName", "event", "project", "specialization", "status"].every((k) => columnKeys.includes(k));

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
          data.map((row, idx) => {
            const rowRecord = row as Record<string, unknown>;
            const statusRaw = rowRecord.status;
            const statusText = toDisplay(statusRaw);
            const isActiveStatus = String(statusRaw ?? "").toLowerCase() === "активно";
            const statusCustom = renderCell?.(row, "status");

            const actionButton =
              isOrganizer && onEdit ? (
                <button
                  className="edit-btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(row);
                  }}
                >
                  <img src={editIcon} alt="edit" />
                </button>
              ) : !isOrganizer && onInfoClick ? (
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
              ) : null;

            return (
              <div
                key={getRowId(row) ?? idx}
                className={`row-box table-grid${getRowId(row) === selectedId ? " selected" : ""}${
                  isEventMobileLayout ? " row-box--event-mobile" : ""
                }${isRequestMobileLayout ? " row-box--request-mobile" : ""}`}
                style={gridStyle}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => {
                  if (renderCell) {
                    const custom = renderCell(row, col.key);
                    if (custom !== undefined) {
                      return (
                        <div key={col.key} className="cell" data-label={col.title}>
                          {custom}
                        </div>
                      );
                    }
                  }

                  if (col.key === "status") {
                    return (
                      <div key={col.key} className="cell status-cell" data-label={col.title}>
                        <span className={`cell-badge status-${isActiveStatus ? "active" : "inactive"}`}>{statusText}</span>
                      </div>
                    );
                  }

                  const raw = rowRecord[col.key];
                  const isBadge = badgeKeys.includes(col.key);
                  const display = toDisplay(raw);

                  return (
                    <div key={col.key} className="cell" data-label={col.title}>
                      {isBadge ? <span className="cell-badge">{display}</span> : <div className="title-text">{display}</div>}
                    </div>
                  );
                })}

                <div className="cell cell-actions cell-actions-desktop" data-label="Действие">
                  {actionButton}
                </div>

                {isEventMobileLayout && (
                  <div className="event-card-mobile">
                    <div className="event-card-mobile__main">
                      <div className="event-card-mobile__title">{toDisplay(rowRecord.title)}</div>

                      <div className="event-card-mobile__row event-card-mobile__row--dates">
                        <div className="event-card-mobile__pair">
                          <span className="event-card-mobile__label">Дата начала</span>
                          <span className="cell-badge">{toDisplay(rowRecord.startDate)}</span>
                        </div>
                        <div className="event-card-mobile__pair">
                          <span className="event-card-mobile__label">Дата окончания</span>
                          <span className="cell-badge">{toDisplay(rowRecord.endDate)}</span>
                        </div>
                      </div>

                      <div className="event-card-mobile__row event-card-mobile__row--meta">
                        <div className="event-card-mobile__pair">
                          <span className="event-card-mobile__label">Организатор</span>
                          <span className="event-card-mobile__value">{toDisplay(rowRecord.organizer)}</span>
                        </div>
                        <div className="event-card-mobile__pair">
                          <span className="event-card-mobile__label">Статус</span>
                          <span className={`cell-badge status-${isActiveStatus ? "active" : "inactive"}`}>{statusText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="event-card-mobile__action">
                      <div className="event-card-mobile__divider" />
                      {actionButton}
                    </div>
                  </div>
                )}

                {isRequestMobileLayout && (
                  <div className="request-card-mobile">
                    <div className="request-card-mobile__title">{toDisplay(rowRecord.studentName)}</div>

                    <div className="request-card-mobile__row">
                      <div className="request-card-mobile__pair">
                        <span className="request-card-mobile__label">Мероприятие</span>
                        <span className="request-card-mobile__value">{toDisplay(rowRecord.event)}</span>
                      </div>
                      <div className="request-card-mobile__pair">
                        <span className="request-card-mobile__label">Проект</span>
                        <span className="request-card-mobile__value">{toDisplay(rowRecord.project)}</span>
                      </div>
                    </div>

                    <div className="request-card-mobile__row request-card-mobile__row--single">
                      <div className="request-card-mobile__pair">
                        <span className="request-card-mobile__label">Специализация</span>
                        <span className="request-card-mobile__value">{toDisplay(rowRecord.specialization)}</span>
                      </div>
                    </div>

                    <div className="request-card-mobile__row request-card-mobile__row--single">
                      <div className="request-card-mobile__pair">
                        <span className="request-card-mobile__label">Статус</span>
                        <div className="request-card-mobile__status-body">
                          {statusCustom !== undefined ? statusCustom : <span className="request-card-mobile__value">{statusText}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
