import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function extractOrderNumber() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[1] || "");
}

export default function PublicRouteSheetPage() {
  const orderNumber = useMemo(() => extractOrderNumber(), []);
  const [routeSheet, setRouteSheet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicRouteSheet(orderNumber)
      .then(setRouteSheet)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="public-page">
        <div className="public-card">Завантаження маршрутного листа...</div>
      </div>
    );
  }

  if (error || !routeSheet) {
    return (
      <div className="public-page">
        <div className="public-card">
          <h1>Маршрутний лист</h1>
          <div className="alert error">{error || "Замовлення не знайдено"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="public-sheet">
        <div className="panel-header">
          <h1>Маршрутний лист</h1>
          <button type="button" className="secondary" onClick={() => window.print()}>
            Друк
          </button>
        </div>

        <div className="public-grid">
          <div className="public-box"><strong>Замовлення:</strong><br />{routeSheet.orderNumber}</div>
          <div className="public-box"><strong>Диван:</strong><br />{routeSheet.sofaName}</div>
          <div className="public-box"><strong>Замовник:</strong><br />{routeSheet.customerName}</div>
          <div className="public-box"><strong>Телефон:</strong><br />{routeSheet.customerPhone || "—"}</div>
          <div className="public-box"><strong>Дата отримання:</strong><br />{routeSheet.receivedDate || "—"}</div>
          <div className="public-box"><strong>Статус:</strong><br />{routeSheet.status}</div>
          <div className="public-box"><strong>Покрій ПІБ:</strong><br />{routeSheet.cutterName || "—"}</div>
          <div className="public-box"><strong>Пошив ПІБ:</strong><br />{routeSheet.sewingName || "—"}</div>
          <div className="public-box"><strong>Обтяжка ПІБ:</strong><br />{routeSheet.upholsteryName || "—"}</div>
        </div>

        <div className="table-wrap crm-table">
          <table>
            <thead>
              <tr>
                <th>Матеріал</th>
                <th>Кількість</th>
                <th>Од.</th>
                <th>Ціна грн</th>
                <th>Сума грн</th>
                <th>Коментар</th>
              </tr>
            </thead>
            <tbody>
              {routeSheet.materials.map((item) => {
                const price = item.currency === "USD"
                  ? Number(item.unitCost || 0) * Number(item.usdRate || 0)
                  : Number(item.unitCost || 0);
                const total = price * Number(item.quantity || 0);

                return (
                  <tr key={item.id}>
                    <td>{item.materialName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitName}</td>
                    <td>{formatMoney(price)}</td>
                    <td>{formatMoney(total)}</td>
                    <td>{item.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="public-notes">
          <strong>Примітки:</strong>
          <p>{routeSheet.notes || "Без приміток"}</p>
        </div>
      </div>
    </div>
  );
}
