import { useEffect, useState } from "react";
import { formatNumberInput } from "../utils/numberInput";

function mapDrafts(orders) {
  return orders.reduce((accumulator, order) => {
    accumulator[order.id] = {
      sofaName: order.sofaName || "",
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      status: order.status || "Нове",
      receivedDate: order.receivedDate || "",
      assignedTo: order.assignedTo || "",
      paymentStatus: order.paymentStatus || "Борг",
      amountPaid: order.amountPaid || 0,
      orderTotal: order.orderTotal || 0
    };
    return accumulator;
  }, {});
}

export function OrdersTable({
  orders,
  selectedOrderId,
  onSelect,
  onDelete,
  onPrintRoute,
  onPrintQr,
  onQuickUpdate,
  statuses,
  paymentStatuses
}) {
  const [drafts, setDrafts] = useState({});
  const [openDebtId, setOpenDebtId] = useState(null);

  useEffect(() => {
    setDrafts(mapDrafts(orders));
    setOpenDebtId(null);
  }, [orders]);

  function updateDraft(orderId, field, value) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        [field]: value
      }
    }));
  }

  const activeDebtDraft = openDebtId ? drafts[openDebtId] || {} : null;
  const activeDebtOrder = openDebtId ? orders.find((order) => order.id === openDebtId) : null;

  if (!orders.length) {
    return <div className="empty-state">Замовлень поки немає</div>;
  }

  return (
    <>
      <div className="table-wrap crm-table">
        <table className="orders-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Диван</th>
              <th>Замовник</th>
              <th>Статус</th>
              <th>Отримано</th>
              <th>Виконавець</th>
              <th>Борг</th>
              <th>Списання</th>
              <th>Маршрутний лист</th>
              <th>QR код</th>
              <th>Дія</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const draft = drafts[order.id] || {};
              const debtAmount = Math.max(
                Number(draft.orderTotal || 0) - Number(draft.amountPaid || 0),
                0
              );

              return (
                <tr
                  key={order.id}
                  className={order.id === selectedOrderId ? "selected-row" : ""}
                >
                  <td onClick={() => onSelect(order)}>{order.orderNumber}</td>
                  <td>
                    <input
                      value={draft.sofaName || ""}
                      onChange={(event) => updateDraft(order.id, "sofaName", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={draft.customerName || ""}
                      onChange={(event) => updateDraft(order.id, "customerName", event.target.value)}
                    />
                    <div className="table-note">{draft.customerPhone || "—"}</div>
                  </td>
                  <td>
                    <select
                      value={draft.status || "Нове"}
                      onChange={(event) => updateDraft(order.id, "status", event.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={`${order.id}-${status}`} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={draft.receivedDate || ""}
                      onChange={(event) => updateDraft(order.id, "receivedDate", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={draft.assignedTo || ""}
                      onChange={(event) => updateDraft(order.id, "assignedTo", event.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setOpenDebtId(order.id)}
                    >
                      {debtAmount.toLocaleString("uk-UA")} грн
                    </button>
                  </td>
                  <td onClick={() => onSelect(order)}>
                    <span className={`badge ${Number(order.materialsWrittenOff) ? "success" : "danger"}`}>
                      {Number(order.materialsWrittenOff) ? "Списано" : "Не списано"}
                    </span>
                  </td>
                  <td>
                    <button className="link-button" onClick={() => onPrintRoute(order.id)}>
                      Друк
                    </button>
                  </td>
                  <td>
                    <button className="link-button" onClick={() => onPrintQr(order.id)}>
                      QR
                    </button>
                  </td>
                  <td className="row-actions">
                    <button className="link-button" onClick={() => onSelect(order)} title="Редагувати замовлення">
                      ✎
                    </button>
                    <button className="link-button" onClick={() => onQuickUpdate(order, draft)}>
                      Зберегти
                    </button>
                    <button className="link-button danger-text" onClick={() => onDelete(order.id)}>
                      Видалити
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeDebtOrder && activeDebtDraft ? (
        <div className="modal-backdrop" onClick={() => setOpenDebtId(null)}>
          <div className="debt-modal" onClick={(event) => event.stopPropagation()}>
            <div className="debt-panel-header">
              <div>
                <strong>Оплата</strong>
                <div className="table-note">{activeDebtOrder.orderNumber}</div>
              </div>
              <button
                type="button"
                className="close-button"
                aria-label="Закрити"
                onClick={() => setOpenDebtId(null)}
              >
                ×
              </button>
            </div>
            <label>
              Статус
              <select
                value={activeDebtDraft.paymentStatus || "Борг"}
                onChange={(event) => updateDraft(activeDebtOrder.id, "paymentStatus", event.target.value)}
              >
                {paymentStatuses.map((status) => (
                  <option key={`${activeDebtOrder.id}-payment-${status}`} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Сплачено
              <input
                type="number"
                step="0.01"
                value={formatNumberInput(activeDebtDraft.amountPaid ?? 0)}
                onChange={(event) => updateDraft(activeDebtOrder.id, "amountPaid", event.target.value)}
              />
            </label>
            <label>
              Сума
              <input
                type="number"
                step="0.01"
                value={formatNumberInput(activeDebtDraft.orderTotal ?? 0)}
                onChange={(event) => updateDraft(activeDebtOrder.id, "orderTotal", event.target.value)}
              />
            </label>
            <div className="actions">
              <button type="button" className="primary" onClick={() => setOpenDebtId(null)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
