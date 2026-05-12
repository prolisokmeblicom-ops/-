import { formatNumberInput } from "../utils/numberInput";

export function MaterialForm({
  categories,
  units,
  formData,
  globalUsdRate,
  setFormData,
  onSubmit,
  onReset,
  isEditing
}) {
  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  const calculatedCost =
    Number(
      formData.currency === "USD"
        ? Number(formData.unitCost || 0) * Number(globalUsdRate || 0)
        : Number(formData.unitCost || 0)
    ) || 0;

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-tip full-width">
        Заповни базові поля, і система одразу покаже собівартість у гривні.
      </div>

      <label>
        Назва
        <input
          value={formData.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Наприклад, Тканина велюр сіра"
          required
        />
        <span className="field-hint">Краще писати коротко й конкретно, щоб матеріал легко знаходився в пошуку.</span>
      </label>

      <label>
        Категорія
        <input
          list="categories-list"
          value={formData.categoryName}
          onChange={(event) => updateField("categoryName", event.target.value)}
          placeholder="Тканина"
        />
        <datalist id="categories-list">
          {categories.map((category) => (
            <option key={category.id} value={category.name} />
          ))}
        </datalist>
      </label>

      <label>
        Од. виміру
        <input
          list="units-list"
          value={formData.unitName}
          onChange={(event) => updateField("unitName", event.target.value)}
          placeholder="м"
        />
        <datalist id="units-list">
          {units.map((unit) => (
            <option key={unit.id} value={unit.name} />
          ))}
        </datalist>
      </label>

      <label>
        Залишок
        <input
          type="number"
          step="0.01"
          value={formatNumberInput(formData.currentQuantity)}
          onChange={(event) => updateField("currentQuantity", event.target.value)}
        />
      </label>

      <label>
        Мін. залишок
        <input
          type="number"
          step="0.01"
          value={formatNumberInput(formData.minQuantity)}
          onChange={(event) => updateField("minQuantity", event.target.value)}
        />
        <span className="field-hint">Коли залишок нижче цього рівня, матеріал підсвітиться в таблиці.</span>
      </label>

      <label>
        Ціна за од.
        <input
          type="number"
          step="0.01"
          value={formatNumberInput(formData.unitCost)}
          onChange={(event) => updateField("unitCost", event.target.value)}
        />
      </label>

      <label>
        Валюта
        <select
          value={formData.currency}
          onChange={(event) => updateField("currency", event.target.value)}
        >
          <option value="UAH">UAH</option>
          <option value="USD">USD</option>
        </select>
        {formData.currency === "USD" ? (
          <span className="field-hint">Перерахунок відбудеться за поточним курсом долара зверху у вкладці складу.</span>
        ) : null}
      </label>

      <label>
        Склад / зона
        <input
          value={formData.location}
          onChange={(event) => updateField("location", event.target.value)}
          placeholder="Основний склад"
        />
      </label>

      <label className="full-width">
        Коментар
        <textarea
          rows="3"
          value={formData.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Колір, щільність, постачальник або інша корисна примітка"
        />
      </label>

      <div className="summary-card full-width">
        <span>Собівартість у гривні</span>
        <strong>
          {calculatedCost.toLocaleString("uk-UA", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}{" "}
          грн
        </strong>
        {formData.currency === "USD" ? (
          <small>За курсом {Number(globalUsdRate || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })}</small>
        ) : null}
      </div>

      <div className="actions full-width">
        <button type="submit" className="primary">
          {isEditing ? "Зберегти зміни" : "Додати матеріал"}
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Очистити
        </button>
      </div>
    </form>
  );
}
