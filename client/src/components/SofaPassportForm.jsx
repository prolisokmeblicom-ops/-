export function SofaPassportForm({ formData, setFormData, onSubmit, onDelete, disabled }) {
  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  if (!formData?.id) {
    return <div className="empty-state">Оберіть диван у списку, щоб відкрити та відредагувати його паспорт.</div>;
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-tip full-width">
        Для нового дивана базовий паспорт створюється автоматично. Тут можна лише уточнити технічні деталі.
      </div>

      <label>
        Диван
        <input
          value={formData.sofaName || ""}
          onChange={(event) => updateField("sofaName", event.target.value)}
          required
        />
      </label>

      <label>
        Номер паспорта
        <input
          value={formData.passportNumber || ""}
          onChange={(event) => updateField("passportNumber", event.target.value)}
        />
      </label>

      <label>
        Артикул
        <input
          value={formData.article || ""}
          onChange={(event) => updateField("article", event.target.value)}
        />
      </label>

      <label>
        Розмір
        <input
          value={formData.size || ""}
          onChange={(event) => updateField("size", event.target.value)}
          placeholder="Наприклад: 240x105x90"
        />
      </label>

      <label>
        Каркас
        <input
          value={formData.frameMaterial || ""}
          onChange={(event) => updateField("frameMaterial", event.target.value)}
          placeholder="Наприклад: дерево, фанера"
        />
      </label>

      <label>
        Наповнення
        <input
          value={formData.filling || ""}
          onChange={(event) => updateField("filling", event.target.value)}
          placeholder="Наприклад: поролон ST2536"
        />
      </label>

      <label className="full-width">
        Примітка
        <textarea
          rows="4"
          value={formData.notes || ""}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Особливості виробу, механізм, фурнітура, технічні примітки"
        />
      </label>

      <div className="selected-box full-width">
        <strong>Матеріали для виготовлення</strong>
        {!formData.materials?.length ? (
          <span className="table-note">Для цього дивана ще немає збережених матеріалів у замовленнях.</span>
        ) : (
          <div className="history-list">
            {formData.materials.map((item) => (
              <div key={item.materialId} className="history-item">
                <strong>{item.materialName}</strong>
                <span>
                  {Number(item.totalQuantity || 0).toLocaleString("uk-UA", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })}{" "}
                  {item.unitName}
                </span>
                <p>Використано у {item.ordersCount} замовленнях цього дивана</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="actions full-width">
        <button type="submit" className="primary" disabled={disabled}>
          Зберегти паспорт
        </button>
        <button type="button" className="secondary" onClick={onDelete} disabled={disabled}>
          Видалити диван
        </button>
      </div>
    </form>
  );
}
