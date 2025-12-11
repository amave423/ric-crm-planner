import React from "react";
import "./table.scss";
import infoIcon from "../../assets/icons/info.svg";

type Column = { key: string; title: string; width?: string };

interface Props {
  columns: Column[];
  data: any[];
  badgeKeys?: string[];
  onInfoClick?: (row: any) => void;
  onRowClick?: (row: any) => void;
  gridColumns?: string;
}

export default function Table({
  columns,
  data,
  badgeKeys = [],
  onInfoClick,
  onRowClick,
  gridColumns = ""
}: Props) {
  return (
    <div className="custom-table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width || undefined }}
                className="text-small"
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr className="table-row empty-row">
              <td colSpan={columns.length} className="text-regular">
                Пока пусто
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id ?? idx} className="table-row">
                <td colSpan={columns.length} className="td-full">
                  <div
                    className="row-box"
                    onClick={() => onRowClick?.(row)}
                    style={
                      { "--table-grid": gridColumns } as React.CSSProperties
                    }
                  >
                    {columns.map((c) => {
                      const value = row[c.key];

                      if (c === columns[0]) {
                        return (
                          <div key={c.key} className="cell">
                            <div className="title-with-icon">
                              <span className="title-text">{value}</span>

                              {onInfoClick && (
                                <button
                                  className="info-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInfoClick(row);
                                  }}
                                >
                                  <img src={infoIcon} alt="info" />
                                </button>
                              )}
                            </div>
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
                        <div key={c.key} className="cell">
                          {value}
                        </div>
                      );
                    })}
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
