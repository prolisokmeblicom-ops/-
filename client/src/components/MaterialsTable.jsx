function formatNumber(value) {
  return Number(value || 0).toLocaleString("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function MaterialsTable({
  materials,
  loading,
  selectedMaterialId,
  globalUsdRate,
  onSelect,
  onDelete
}) {
  if (loading) {
    return <div className="empty-state">Завантаження матеріалів...</div>;
  }

  if (!materials.length) {
    return <div className="empty-state">Позиції ще не додані</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Назва</th>
            <th>Категорія</th>
            <th>Залишок</th>
            <th>Мін.</th>
            <th>Склад</th>
            <th>Ціна</th>
            <th>Сума грн</th>
            <th>Коментар</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => {
            const lowStock = Number(material.currentQuantity) <= Number(material.minQuantity);
            const appliedUsdRate =
              material.currency === "USD"
                ? Number(globalUsdRate || material.usdRate || 0)
                : 0;
            const totalCost =
              material.currency === "USD"
                ? Number(material.unitCost) * appliedUsdRate
                : Number(material.unitCost);

            return (
              <tr
                key={material.id}
                className={material.id === selectedMaterialId ? "selected-row" : ""}
              >
                <td onClick={() => onSelect(material)}>
                  <strong>{material.name}</strong>
                  <div className="table-note">{material.unitName}</div>
                </td>
                <td onClick={() => onSelect(material)}>{material.categoryName}</td>
                <td onClick={() => onSelect(material)}>
                  <span className={lowStock ? "badge danger" : "badge success"}>
                    {formatNumber(material.currentQuantity)} {material.unitName}
                  </span>
                </td>
                <td onClick={() => onSelect(material)}>{formatNumber(material.minQuantity)}</td>
                <td onClick={() => onSelect(material)}>{material.location || "—"}</td>
                <td onClick={() => onSelect(material)}>
                  {formatMoney(material.unitCost)} {material.currency}
                  {material.currency === "USD" && appliedUsdRate ? (
                    <div className="table-note">Курс: {formatMoney(appliedUsdRate)}</div>
                  ) : null}
                </td>
                <td onClick={() => onSelect(material)}>{formatMoney(totalCost)}</td>
                <td onClick={() => onSelect(material)}>{material.notes || "—"}</td>
                <td>
                  <button className="link-button danger-text" onClick={() => onDelete(material.id)}>
                    Видалити
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
