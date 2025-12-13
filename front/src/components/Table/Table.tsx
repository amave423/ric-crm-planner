import React from "react";
import "./table.scss";
import penIcon from "../../assets/icons/pen.svg";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

type Column = { key: string; title: string; width?: string };

interface Props {
  columns: Column[];
  data: any[];
  badgeKeys?: string[];
  onInfoClick?: (row: any) => void;
  onRowClick?: (row: any) => void;
  onEdit?: (row: any) => void;
  gridColumns?: string;
}

export default function Table({
  columns,
  data,
  badgeKeys = [],
  onRowClick,
  onEdit,
  gridColumns = ""
}: Props) {
  const { user } = useContext(AuthContext);
  const isOrganizer = user?.role === "organizer";

  return (
    <div className="custom-table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className="text-small">
                {c.title}
              </th>
            ))}
            {isOrganizer && <th style={{ width: "48px" }} />}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={columns.length + 1}>Пока пусто</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id ?? idx}>
                <td colSpan={columns.length + 1} className="td-full">
                  <div
                    className="row-box"
                    style={{ "--table-grid": gridColumns } as React.CSSProperties}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((c) => {
                      const value = row[c.key];

                      if (c === columns[0]) {
                        return (
                          <div key={c.key} className="cell title-with-icon">
                            <span className="title-text">{value}</span>
                          </div>
                        );
                      }

                      if (badgeKeys.includes(c.key)) {
                        return (
                          <div key={c.key} className="cell">
                            <span className="cell-badge">{value}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={c.key} className="cell">{value}</div>
                      );
                    })}

                    {isOrganizer && (
                      <button
                        className="edit-btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(row);
                        }}
                      >
                        <img src={penIcon} alt="edit" />
                      </button>
                    )}
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
