import { formatNumberInput } from "../utils/numberInput";

export function OrderForm({
  formData,
  setFormData,
  statuses,
  paymentStatuses,
  customers,
  onSubmit,
  onReset,
  isEditing
}) {
  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  const debt = Math.max(Number(formData.orderTotal || 0) - Number(formData.amountPaid || 0), 0);

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-tip full-width">
        Замовлення створюється максимально просто: диван, клієнт, дата отримання та виконавець.
      </div>

      <label>
        Номер замовлення
        <input
          value={formData.orderNumber}
          onChange={(event) => updateField("orderNumber", event.target.value)}
          placeholder="Автоматично"
          readOnly={!isEditing}
        />
        <span className="field-hint">Для нового замовлення номер підставляється автоматично.</span>
      </label>

      <label>
        Назва дивана
        <input
          value={formData.sofaName}
          onChange={(event) => updateField("sofaName", event.target.value)}
          placeholder="Наприклад, Диван Комфорт 3"
          required
        />
      </label>

      <label>
        Замовник
        <input
          list="customers-list"
          value={formData.customerName}
          onChange={(event) => updateField("customerName", event.target.value)}
          placeholder="ПІБ або назва клієнта"
          required
        />
        <datalist id="customers-list">
          {customers.map((customer) => (
            <option key={`${customer.customerName}-${customer.customerPhone || ""}`} value={customer.customerName} />
          ))}
        </datalist>
        <span className="field-hint">Можна вибрати клієнта зі списку або ввести нового вручну.</span>
      </label>

      <label>
        Телефон
        <input
          value={formData.customerPhone}
          onChange={(event) => updateField("customerPhone", event.target.value)}
          placeholder="+380..."
        />
      </label>

      <label>
        Статус
        <select value={formData.status} onChange={(event) => updateField("status", event.target.value)}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label>
        Дата отримання замовлення
        <input
          type="date"
          value={formData.receivedDate}
          onChange={(event) => updateField("receivedDate", event.target.value)}
        />
      </label>

      <label>
        Хто робить
        <input
          value={formData.assignedTo}
          onChange={(event) => updateField("assignedTo", event.target.value)}
          placeholder="Майстер / бригада"
        />
      </label>

      <label>
        Покрій ПІБ
        <input
          value={formData.cutterName}
          onChange={(event) => updateField("cutterName", event.target.value)}
          placeholder="Хто робить покрій"
        />
      </label>

      <label>
        Пошив ПІБ
        <input
          value={formData.sewingName}
          onChange={(event) => updateField("sewingName", event.target.value)}
          placeholder="Хто шиє"
        />
      </label>

      <label>
        Обтяжка ПІБ
        <input
          value={formData.upholsteryName}
          onChange={(event) => updateField("upholsteryName", event.target.value)}
          placeholder="Хто робить обтяжку"
        />
      </label>

      <label>
        Статус оплати
        <select value={formData.paymentStatus} onChange={(event) => updateField("paymentStatus", event.target.value)}>
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label>
        Сума замовлення
        <input
          type="number"
          step="0.01"
          value={formatNumberInput(formData.orderTotal)}
          onChange={(event) => updateField("orderTotal", event.target.value)}
        />
      </label>

      <label>
        Сплачено
        <input
          type="number"
          step="0.01"
          value={formatNumberInput(formData.amountPaid)}
          onChange={(event) => updateField("amountPaid", event.target.value)}
        />
      </label>

      <label className="full-width">
        Коментар
        <textarea
          rows="3"
          value={formData.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Тканина, побажання клієнта, особливості комплектації"
        />
      </label>

      <div className="summary-card full-width">
        <span>Поточний борг</span>
        <strong>
          {debt.toLocaleString("uk-UA", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}{" "}
          грн
        </strong>
        <small>Якщо сплачено більше або дорівнює сумі, борг стане нульовим.</small>
      </div>

      <div className="actions full-width">
        <button type="submit" className="primary">
          {isEditing ? "Зберегти замовлення" : "Створити замовлення"}
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Очистити
        </button>
      </div>
    </form>
  );
}
