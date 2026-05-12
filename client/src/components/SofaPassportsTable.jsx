export function SofaPassportsTable({ rows, selectedId, onSelect }) {
  if (!rows.length) {
    return <div className="empty-state">Поки що немає імпортованих диванів і паспортів.</div>;
  }

  return (
    <div className="table-wrap crm-table">
      <table>
        <thead>
          <tr>
            <th>Диван</th>
            <th>Паспорт</th>
            <th>Артикул</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={row.id === selectedId ? "selected-row" : ""}
              onClick={() => onSelect(row)}
            >
              <td>{row.sofaName || "—"}</td>
              <td>{row.passportNumber || "—"}</td>
              <td>{row.article || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
