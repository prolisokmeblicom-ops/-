import { useState } from "react";
import { formatNumberInput } from "../utils/numberInput";

export function TransactionPanel({ material, transactions, onSubmit }) {
  const [transaction, setTransaction] = useState({
    type: "IN",
    quantity: "",
    unitPrice: "",
    notes: ""
  });

  function updateField(field, value) {
    setTransaction((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!material) {
      return;
    }

    await onSubmit({
      materialId: material.id,
      ...transaction
    });

    setTransaction({
      type: "IN",
      quantity: "",
      unitPrice: "",
      notes: ""
    });
  }

  if (!material) {
    return <div className="empty-state">Обери позицію в таблиці, щоб оформити прихід або витрату.</div>;
  }

  return (
    <div className="transaction-layout">
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="selected-box">
          <strong>{material.name}</strong>
          <span>Залишок: {material.currentQuantity} {material.unitName}</span>
        </div>

        <div className="form-tip full-width">
          Для списання вкажи витрату, а для нового приходу обери прихід і введи кількість.
        </div>

        <label>
          Тип операції
          <select value={transaction.type} onChange={(event) => updateField("type", event.target.value)}>
            <option value="IN">Прихід</option>
            <option value="OUT">Витрата</option>
          </select>
        </label>

        <label>
          Кількість
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formatNumberInput(transaction.quantity)}
            onChange={(event) => updateField("quantity", event.target.value)}
          />
        </label>

        <label>
          Ціна за одиницю
          <input
            type="number"
            step="0.01"
            min="0"
            value={formatNumberInput(transaction.unitPrice)}
            onChange={(event) => updateField("unitPrice", event.target.value)}
          />
          <span className="field-hint">Поле необов’язкове, якщо ти просто коригуєш залишок.</span>
        </label>

        <label className="full-width">
          Коментар
          <textarea
            rows="2"
            value={transaction.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Наприклад, передано у виробництво або прийшло від постачальника"
          />
        </label>

        <button type="submit" className="primary full-width">
          Зберегти рух
        </button>
      </form>

      <div className="history">
        <h3>Останні операції</h3>
        {!transactions.length ? (
          <div className="empty-state">Історія поки порожня</div>
        ) : (
          <div className="history-list">
            {transactions.map((item) => (
              <div key={item.id} className="history-item">
                <span className={`badge ${item.type === "IN" ? "success" : "danger"}`}>
                  {item.type === "IN" ? "Прихід" : "Витрата"}
                </span>
                <strong>{item.quantity}</strong>
                <span>{item.createdAt.replace("T", " ").slice(0, 16)}</span>
                <p>{item.notes || "Без коментаря"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
