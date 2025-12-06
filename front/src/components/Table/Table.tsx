import "./table.scss";

export default function Table({ columns, data, onRowClick }: any) {
  return (
    <table className="custom-table">
      <thead>
        <tr>
          {columns.map((c: any) => (
            <th key={c.key} className="text-small">
              {c.title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i} onClick={() => onRowClick(row)}>
            {columns.map((c: any) => (
              <td key={c.key} className="text-regular">
                {row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
