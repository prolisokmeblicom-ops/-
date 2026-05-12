export function OrderMaterialsEditor({
  materialsCatalog,
  orderMaterials,
  setOrderMaterials,
  globalUsdRate,
  disabled,
  onSave,
  onStart,
  onPrint,
  canStart
}) {
  function getMaterial(materialId) {
    return materialsCatalog.find((item) => String(item.id) === String(materialId));
  }

  function getUnitCostUah(material) {
    if (!material) {
      return 0;
    }

    return material.currency === "USD"
      ? Number(material.unitCost || 0) * Number(globalUsdRate || material.usdRate || 0)
      : Number(material.unitCost || 0);
  }

  function updateRow(index, field, value) {
    setOrderMaterials((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addRow() {
    setOrderMaterials((current) => [
      ...current,
      { materialId: "", quantity: "", notes: "" }
    ]);
  }

  function removeRow(index) {
    setOrderMaterials((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="crm-stack">
      <div className="form-tip">
        Додай матеріали на диван, збережи склад замовлення і тільки потім запускай його в роботу.
      </div>
      <div className="actions">
        <button type="button" className="secondary" onClick={addRow} disabled={disabled}>
          Додати матеріал
        </button>
        <button type="button" className="primary" onClick={onSave} disabled={disabled}>
          Зберегти склад замовлення
        </button>
        <button type="button" className="primary" onClick={onStart} disabled={!canStart || disabled}>
          Запустити в роботу
        </button>
        <button type="button" className="secondary" onClick={onPrint} disabled={!canStart}>
          Друк маршрутного листа
        </button>
      </div>

      {!orderMaterials.length ? (
        <div className="empty-state">Додай матеріали, які підуть на цей диван.</div>
      ) : (
        <div className="table-wrap crm-table">
          <table>
            <thead>
              <tr>
                <th>Матеріал</th>
                <th>К-сть</th>
                <th>Ціна грн</th>
                <th>Сума грн</th>
                <th>Коментар</th>
                <th>Дія</th>
              </tr>
            </thead>
            <tbody>
              {orderMaterials.map((item, index) => {
                const material = getMaterial(item.materialId);
                const unitCostUah = getUnitCostUah(material);
                const totalCost = unitCostUah * Number(item.quantity || 0);

                return (
                <tr key={`${item.materialId}-${index}`}>
                  <td>
                    <select
                      value={item.materialId}
                      onChange={(event) => updateRow(index, "materialId", event.target.value)}
                      disabled={disabled}
                    >
                      <option value="">Оберіть матеріал</option>
                      {materialsCatalog.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.currentQuantity} {material.unitName})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(event) => updateRow(index, "quantity", event.target.value)}
                      disabled={disabled}
                    />
                  </td>
                  <td>{unitCostUah.toLocaleString("uk-UA", { maximumFractionDigits: 2 })}</td>
                  <td>{totalCost.toLocaleString("uk-UA", { maximumFractionDigits: 2 })}</td>
                  <td>
                    <input
                      value={item.notes || ""}
                      onChange={(event) => updateRow(index, "notes", event.target.value)}
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button danger-text"
                      onClick={() => removeRow(index)}
                      disabled={disabled}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
