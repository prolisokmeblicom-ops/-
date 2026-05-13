import QRCode from "qrcode";

function buildQrLink(order) {
  return `${window.location.origin}/route-sheet/${encodeURIComponent(order.orderNumber)}`;
}

function routeSheetHtml(order) {
  return `
    <!doctype html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8" />
        <title>Маршрутний лист ${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2, p { margin: 0 0 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 24px; }
          .card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
          .footer { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
          .otk { margin-top: 32px; padding-top: 18px; border-top: 1px solid #cbd5e1; }
          .otk-line { margin-top: 28px; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>Маршрутний лист</h1>
        <p>Замовлення: <strong>${order.orderNumber}</strong></p>

        <div class="grid">
          <div class="card"><strong>Назва:</strong><br/>${order.sofaName || "-"}</div>
          <div class="card"><strong>Статус:</strong><br/>${order.status || "-"}</div>
          <div class="card"><strong>Замовник:</strong><br/>${order.customerName || "-"}</div>
          <div class="card"><strong>Телефон:</strong><br/>${order.customerPhone || "-"}</div>
          <div class="card"><strong>Дата отримання:</strong><br/>${order.receivedDate || "-"}</div>
          <div class="card"><strong>Хто веде:</strong><br/>${order.assignedTo || "-"}</div>
          <div class="card"><strong>Покрій ПІБ:</strong><br/>${order.cutterName || "-"}</div>
          <div class="card"><strong>Пошив ПІБ:</strong><br/>${order.sewingName || "-"}</div>
          <div class="card"><strong>Обтяжка ПІБ:</strong><br/>${order.upholsteryName || "-"}</div>
        </div>

        <h2 style="margin-top: 20px;">Примітки</h2>
        <p>${order.notes || "Без приміток"}</p>

        <div class="footer">
          <div>Покрій: ____________________</div>
          <div>Пошив: ____________________</div>
          <div>Обтяжка: ____________________</div>
        </div>

        <div class="otk">
          <strong>ОТК Максим Т. 0968533111</strong>
          <div class="otk-line">Підпис: ________________________________</div>
        </div>
      </body>
    </html>
  `;
}

function qrOnlyHtml(order, qrDataUrl) {
  return `
    <!doctype html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8" />
        <title>QR код</title>
        <style>
          html, body { margin: 0; width: 100%; height: 100%; background: #ffffff; }
          body { display: grid; place-items: center; font-family: Arial, sans-serif; color: #111827; }
          .qr-page { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 24px; }
          .route-number { font-size: 40px; font-weight: 800; line-height: 1.1; text-align: center; }
          img { width: 320px; height: 320px; }
        </style>
      </head>
      <body>
        <div class="qr-page">
          <div class="route-number">${order.orderNumber}</div>
          <img src="${qrDataUrl}" alt="QR код" />
        </div>
      </body>
    </html>
  `;
}

function openAndPrint(html, features = "width=960,height=900") {
  const printWindow = window.open("", "_blank", features);
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function printRouteSheet(order) {
  openAndPrint(routeSheetHtml(order));
}

export async function printQrCodePage(order) {
  const qrDataUrl = await QRCode.toDataURL(buildQrLink(order), {
    width: 320,
    margin: 1
  });

  openAndPrint(qrOnlyHtml(order, qrDataUrl), "width=500,height=620");
}
