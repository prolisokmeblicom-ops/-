import { getDb } from "../db.js";
import { prettifyText, toNumber } from "../utils/normalizers.js";
import { ensureSofaPassportExists } from "./sofaPassportService.js";

const allowedStatuses = ["Нове", "Підготовка", "В роботі", "Готово", "Відвантажено"];
const allowedPaymentStatuses = ["Не оплачено", "Частково", "Оплачено", "Борг"];

function generateAccessCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeOrderPayload(payload = {}) {
  const sofaName = prettifyText(payload.sofaName);
  const customerName = prettifyText(payload.customerName);

  if (!sofaName) {
    throw new Error("Назва дивана обов'язкова");
  }

  if (!customerName) {
    throw new Error("Замовник обов'язковий");
  }

  const status = allowedStatuses.includes(payload.status) ? payload.status : "Нове";
  const paymentStatus = allowedPaymentStatuses.includes(payload.paymentStatus)
    ? payload.paymentStatus
    : "Борг";

  return {
    orderNumber: prettifyText(payload.orderNumber),
    sofaName,
    customerName,
    customerPhone: prettifyText(payload.customerPhone),
    status,
    receivedDate: prettifyText(payload.receivedDate),
    assignedTo: prettifyText(payload.assignedTo),
    cutterName: prettifyText(payload.cutterName),
    sewingName: prettifyText(payload.sewingName),
    upholsteryName: prettifyText(payload.upholsteryName),
    paymentStatus,
    amountPaid: toNumber(payload.amountPaid),
    orderTotal: toNumber(payload.orderTotal),
    accessCode: prettifyText(payload.accessCode),
    notes: prettifyText(payload.notes)
  };
}

function normalizeOrderMaterials(materials = []) {
  return materials
    .map((item) => ({
      materialId: Number(item.materialId),
      quantity: toNumber(item.quantity),
      notes: prettifyText(item.notes)
    }))
    .filter((item) => item.materialId && item.quantity > 0);
}

async function buildOrderNumber() {
  const db = await getDb();
  const row = await db.get("SELECT MAX(id) AS maxId FROM orders");
  const next = Number(row?.maxId || 0) + 1;
  return `DIV-${String(next).padStart(4, "0")}`;
}

export async function getNextOrderNumber() {
  return buildOrderNumber();
}

export async function listCustomers() {
  const db = await getDb();
  return db.all(`
    SELECT DISTINCT
      customer_name AS customerName,
      customer_phone AS customerPhone
    FROM orders
    WHERE TRIM(customer_name) != ''
    ORDER BY customer_name ASC
  `);
}

async function getOrderMaterials(orderId) {
  const db = await getDb();
  return db.all(
    `
      SELECT
        om.id,
        om.order_id AS orderId,
        om.material_id AS materialId,
        om.quantity,
        om.notes,
        m.name AS materialName,
        m.current_quantity AS currentQuantity,
        m.unit_cost AS unitCost,
        m.currency,
        m.usd_rate AS usdRate,
        u.name AS unitName
      FROM order_materials om
      JOIN materials m ON m.id = om.material_id
      JOIN units u ON u.id = m.unit_id
      WHERE om.order_id = ?
      ORDER BY om.id DESC
    `,
    [orderId]
  );
}

export async function getSofaMaterialTemplate(sofaName, excludeOrderId = null) {
  const db = await getDb();
  const normalizedName = prettifyText(sofaName);

  if (!normalizedName) {
    return [];
  }

  const params = [normalizedName];
  let excludeClause = "";

  if (excludeOrderId) {
    excludeClause = "AND o.id != ?";
    params.push(Number(excludeOrderId));
  }

  const sourceOrder = await db.get(
    `
      SELECT o.id
      FROM orders o
      WHERE TRIM(o.sofa_name) = TRIM(?)
        AND EXISTS (
          SELECT 1
          FROM order_materials om
          WHERE om.order_id = o.id
        )
        ${excludeClause}
      ORDER BY
        CASE WHEN COALESCE(o.started_at, '') != '' THEN 0 ELSE 1 END,
        o.started_at DESC,
        o.updated_at DESC,
        o.id DESC
      LIMIT 1
    `,
    params
  );

  if (!sourceOrder) {
    return [];
  }

  const materials = await getOrderMaterials(sourceOrder.id);
  return materials.map((item) => ({
    materialId: item.materialId,
    quantity: item.quantity,
    notes: item.notes || "",
    materialName: item.materialName,
    unitName: item.unitName
  }));
}

export async function listOrders(filters = {}) {
  const db = await getDb();
  const conditions = [];
  const params = [];

  if (filters.search) {
    const value = `%${filters.search}%`;
    conditions.push("(o.customer_name LIKE ? OR o.sofa_name LIKE ? OR o.order_number LIKE ?)");
    params.push(value, value, value);
  }

  if (filters.debtFilter === "withDebt") {
    conditions.push("(o.order_total - o.amount_paid) > 0");
  }

  if (filters.debtFilter === "paid") {
    conditions.push("(o.order_total - o.amount_paid) <= 0");
  }

  if (filters.customerName) {
    conditions.push("o.customer_name = ?");
    params.push(filters.customerName);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return db.all(
    `
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.sofa_name AS sofaName,
        o.customer_name AS customerName,
        o.customer_phone AS customerPhone,
        o.status,
        o.received_date AS receivedDate,
        o.assigned_to AS assignedTo,
        o.cutter_name AS cutterName,
        o.sewing_name AS sewingName,
        o.upholstery_name AS upholsteryName,
        o.payment_status AS paymentStatus,
        o.amount_paid AS amountPaid,
        o.order_total AS orderTotal,
        o.access_code AS accessCode,
        (o.order_total - o.amount_paid) AS debtAmount,
        o.notes,
        o.materials_written_off AS materialsWrittenOff,
        o.started_at AS startedAt,
        o.completed_at AS completedAt,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        COUNT(om.id) AS materialLines
      FROM orders o
      LEFT JOIN order_materials om ON om.order_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY
        CASE o.status
          WHEN 'В роботі' THEN 1
          WHEN 'Підготовка' THEN 2
          WHEN 'Нове' THEN 3
          WHEN 'Готово' THEN 4
          WHEN 'Відвантажено' THEN 5
          ELSE 6
        END,
        o.received_date ASC,
        o.updated_at DESC
    `,
    params
  );
}

export async function getOrderById(orderId) {
  const db = await getDb();
  const order = await db.get(
    `
      SELECT
        id,
        order_number AS orderNumber,
        sofa_name AS sofaName,
        customer_name AS customerName,
        customer_phone AS customerPhone,
        status,
        received_date AS receivedDate,
        assigned_to AS assignedTo,
        cutter_name AS cutterName,
        sewing_name AS sewingName,
        upholstery_name AS upholsteryName,
        payment_status AS paymentStatus,
        amount_paid AS amountPaid,
        order_total AS orderTotal,
        access_code AS accessCode,
        (order_total - amount_paid) AS debtAmount,
        notes,
        materials_written_off AS materialsWrittenOff,
        started_at AS startedAt,
        completed_at AS completedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM orders
      WHERE id = ?
    `,
    [orderId]
  );

  if (!order) {
    return null;
  }

  const materials = await getOrderMaterials(orderId);
  return { ...order, materials };
}

export async function createOrder(payload) {
  const db = await getDb();
  const order = normalizeOrderPayload(payload);
  const orderNumber = order.orderNumber || (await buildOrderNumber());
  const accessCode = order.accessCode || generateAccessCode();

  const duplicate = await db.get("SELECT id FROM orders WHERE order_number = ?", [orderNumber]);
  if (duplicate) {
    throw new Error("Замовлення з таким номером вже існує");
  }

  const result = await db.run(
    `
      INSERT INTO orders (
        order_number, sofa_name, customer_name, customer_phone,
        status, received_date, assigned_to, cutter_name, sewing_name, upholstery_name,
        payment_status, amount_paid, order_total, access_code, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      orderNumber,
      order.sofaName,
      order.customerName,
      order.customerPhone,
      order.status,
      order.receivedDate,
      order.assignedTo,
      order.cutterName,
      order.sewingName,
      order.upholsteryName,
      order.paymentStatus,
      order.amountPaid,
      order.orderTotal,
      accessCode,
      order.notes
    ]
  );

  await ensureSofaPassportExists(order.sofaName);
  return getOrderById(result.lastID);
}

export async function updateOrder(orderId, payload) {
  const db = await getDb();
  const current = await getOrderById(orderId);

  if (!current) {
    throw new Error("Замовлення не знайдено");
  }

  const order = normalizeOrderPayload(payload);
  const orderNumber = order.orderNumber || current.orderNumber;
  const accessCode = order.accessCode || current.accessCode || generateAccessCode();
  const duplicate = await db.get("SELECT id FROM orders WHERE order_number = ? AND id != ?", [orderNumber, orderId]);

  if (duplicate) {
    throw new Error("Замовлення з таким номером вже існує");
  }

  let completedAt = current.completedAt || "";
  if (order.status === "Готово" && !completedAt) {
    completedAt = new Date().toISOString();
  }

  await db.run(
    `
      UPDATE orders
      SET
        order_number = ?,
        sofa_name = ?,
        customer_name = ?,
        customer_phone = ?,
        status = ?,
        received_date = ?,
        assigned_to = ?,
        cutter_name = ?,
        sewing_name = ?,
        upholstery_name = ?,
        payment_status = ?,
        amount_paid = ?,
        order_total = ?,
        access_code = ?,
        notes = ?,
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      orderNumber,
      order.sofaName,
      order.customerName,
      order.customerPhone,
      order.status,
      order.receivedDate,
      order.assignedTo,
      order.cutterName,
      order.sewingName,
      order.upholsteryName,
      order.paymentStatus,
      order.amountPaid,
      order.orderTotal,
      accessCode,
      order.notes,
      completedAt,
      orderId
    ]
  );

  await ensureSofaPassportExists(order.sofaName);
  return getOrderById(orderId);
}

export async function deleteOrder(orderId) {
  const db = await getDb();
  const result = await db.run("DELETE FROM orders WHERE id = ?", [orderId]);

  if (!result.changes) {
    throw new Error("Замовлення не знайдено");
  }
}

export async function replaceOrderMaterials(orderId, materials) {
  const db = await getDb();
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Замовлення не знайдено");
  }

  if (Number(order.materialsWrittenOff)) {
    throw new Error("Матеріали вже списані. Редагування складу замовлення заборонено");
  }

  const normalizedMaterials = normalizeOrderMaterials(materials);
  await db.run("DELETE FROM order_materials WHERE order_id = ?", [orderId]);

  for (const item of normalizedMaterials) {
    const material = await db.get("SELECT id FROM materials WHERE id = ?", [item.materialId]);
    if (!material) {
      throw new Error("Один із матеріалів не знайдено");
    }

    await db.run(
      `
        INSERT INTO order_materials (order_id, material_id, quantity, notes)
        VALUES (?, ?, ?, ?)
      `,
      [orderId, item.materialId, item.quantity, item.notes]
    );
  }

  await db.run("UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [orderId]);
  return getOrderById(orderId);
}

export async function startOrder(orderId) {
  const db = await getDb();
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Замовлення не знайдено");
  }

  if (!order.materials.length) {
    throw new Error("Додайте матеріали до замовлення перед запуском у роботу");
  }

  if (Number(order.materialsWrittenOff)) {
    await ensureSofaPassportExists(order.sofaName);
    return getOrderById(orderId);
  }

  for (const item of order.materials) {
    if (Number(item.currentQuantity) < Number(item.quantity)) {
      throw new Error(`Недостатньо залишку: ${item.materialName}`);
    }
  }

  for (const item of order.materials) {
    await db.run(
      `
        INSERT INTO stock_transactions (material_id, type, quantity, notes)
        VALUES (?, 'OUT', ?, ?)
      `,
      [item.materialId, item.quantity, `Списання на замовлення ${order.orderNumber}`]
    );

    await db.run(
      `
        UPDATE materials
        SET current_quantity = current_quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [item.quantity, item.materialId]
    );
  }

  await db.run(
    `
      UPDATE orders
      SET
        status = 'В роботі',
        materials_written_off = 1,
        started_at = COALESCE(NULLIF(started_at, ''), CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [orderId]
  );

  await ensureSofaPassportExists(order.sofaName);
  return getOrderById(orderId);
}

export async function getRouteSheet(orderId) {
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Замовлення не знайдено");
  }

  return {
    ...order,
    paymentStatuses: allowedPaymentStatuses,
    printedAt: new Date().toISOString()
  };
}

export async function getRouteSheetByOrderNumber(orderNumber) {
  const db = await getDb();
  const order = await db.get("SELECT id FROM orders WHERE order_number = ?", [orderNumber]);

  if (!order) {
    throw new Error("Замовлення не знайдено");
  }

  return getRouteSheet(order.id);
}

export async function verifyRouteSheetAccess(orderNumber, accessCode) {
  const db = await getDb();
  const order = await db.get("SELECT id, access_code AS accessCode FROM orders WHERE order_number = ?", [
    orderNumber
  ]);

  if (!order) {
    throw new Error("Замовлення не знайдено");
  }

  if (prettifyText(accessCode).toUpperCase() !== prettifyText(order.accessCode).toUpperCase()) {
    throw new Error("Невірний код доступу");
  }

  return getRouteSheet(order.id);
}

export function getOrderStatuses() {
  return allowedStatuses;
}

export function getPaymentStatuses() {
  return allowedPaymentStatuses;
}
