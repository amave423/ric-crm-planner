import React from "react";
import "./table.scss";
import infoIcon from "../../assets/icons/info.svg";

type Column = { key: string; title: string; width?: string };

interface Props {
  columns: Column[];
  data: any[];
  onInfoClick?: (row: any) => void; // открывать модалку по иконке
  badgeKeys?: string[]; // какие ключи рендерить как бейджи
}

export default function Table({ columns, data, onInfoClick, badgeKeys = [] }: Props) {
  return (
    <div className="custom-table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width || "auto" }} className="text-small">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr><td colSpan={columns.length} className="empty-row text-regular">Пока пусто</td></tr>
          )}

          {data.map((row, i) => (
            <tr key={row.id ?? i} className="table-row">
              {columns.map((c) => {
                const value = row[c.key];

                // TITLE cell: если это первая колонка (обычно название) — добавляем info icon справа
                if (c.key === columns[0].key) {
                  return (
                    <td key={c.key} className="title-cell text-regular">
                      <div className="title-with-icon">
                        <span>{value}</span>

                        {onInfoClick && (
                          <button
                            className="info-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInfoClick(row);
                            }}
                            aria-label="Подробнее"
                            title="Подробнее"
                          >
                            <img src={infoIcon} alt="i" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                }

                // Badge cells
                if (badgeKeys.includes(c.key)) {
                  return (
                    <td key={c.key}>
                      <span className="cell-badge">{value}</span>
                    </td>
                  );
                }

                // default
                return (
                  <td key={c.key} className="text-regular">
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
