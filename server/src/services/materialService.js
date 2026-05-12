import { getDb } from "../db.js";
import {
  inferCategoryFromName,
  inferUnitFromName,
  normalizeText,
  prettifyText,
  toNumber
} from "../utils/normalizers.js";

export async function getUsdRate() {
  const db = await getDb();
  const row = await db.get("SELECT value FROM app_settings WHERE key = 'usd_rate'");
  return toNumber(row?.value);
}

export async function updateUsdRate(value) {
  const db = await getDb();
  const rate = toNumber(value);
  await db.run(
    "INSERT INTO app_settings (key, value) VALUES ('usd_rate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(rate)]
  );
  return rate;
}

async function getOrCreateCategoryId(name) {
  const db = await getDb();
  const cleanName = prettifyText(name) || "Інше";
  await db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [cleanName]);
  const category = await db.get("SELECT id FROM categories WHERE name = ?", [cleanName]);
  return category.id;
}

async function getOrCreateUnitId(name) {
  const db = await getDb();
  const cleanName = prettifyText(name) || "шт";
  await db.run("INSERT OR IGNORE INTO units (name) VALUES (?)", [cleanName]);
  const unit = await db.get("SELECT id FROM units WHERE name = ?", [cleanName]);
  return unit.id;
}

function validateMaterialPayload(payload) {
  const name = prettifyText(payload.name);

  if (!name) {
    throw new Error("Назва обов'язкова");
  }

  return {
    name,
    normalizedName: normalizeText(name),
    categoryName: prettifyText(payload.categoryName) || inferCategoryFromName(name),
    unitName: prettifyText(payload.unitName) || inferUnitFromName(name),
    currentQuantity: toNumber(payload.currentQuantity),
    minQuantity: toNumber(payload.minQuantity),
    unitCost: toNumber(payload.unitCost),
    currency: payload.currency === "USD" ? "USD" : "UAH",
    usdRate: toNumber(payload.usdRate),
    location: prettifyText(payload.location),
    notes: prettifyText(payload.notes)
  };
}

export async function listCategories() {
  const db = await getDb();
  return db.all("SELECT id, name FROM categories ORDER BY name");
}

export async function listUnits() {
  const db = await getDb();
  return db.all("SELECT id, name FROM units ORDER BY name");
}

export async function listMaterials(filters = {}) {
  const db = await getDb();
  const conditions = [];
  const params = [];

  if (filters.search) {
    conditions.push("(m.name LIKE ? OR m.notes LIKE ? OR m.location LIKE ?)");
    const value = `%${filters.search}%`;
    params.push(value, value, value);
  }

  if (filters.categoryId) {
    conditions.push("m.category_id = ?");
    params.push(Number(filters.categoryId));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return db.all(
    `
      SELECT
        m.id,
        m.name,
        m.current_quantity AS currentQuantity,
        m.min_quantity AS minQuantity,
        m.unit_cost AS unitCost,
        m.currency,
        m.usd_rate AS usdRate,
        m.location,
        m.notes,
        m.created_at AS createdAt,
        m.updated_at AS updatedAt,
        c.id AS categoryId,
        c.name AS categoryName,
        u.id AS unitId,
        u.name AS unitName
      FROM materials m
      JOIN categories c ON c.id = m.category_id
      JOIN units u ON u.id = m.unit_id
      ${whereClause}
      ORDER BY m.updated_at DESC, m.id DESC
    `,
    params
  );
}

export async function getMaterialById(id) {
  const db = await getDb();
  return db.get(
    `
      SELECT
        m.id,
        m.name,
        m.current_quantity AS currentQuantity,
        m.min_quantity AS minQuantity,
        m.unit_cost AS unitCost,
        m.currency,
        m.usd_rate AS usdRate,
        m.location,
        m.notes,
        c.id AS categoryId,
        c.name AS categoryName,
        u.id AS unitId,
        u.name AS unitName
      FROM materials m
      JOIN categories c ON c.id = m.category_id
      JOIN units u ON u.id = m.unit_id
      WHERE m.id = ?
    `,
    [id]
  );
}

export async function createMaterial(payload) {
  const db = await getDb();
  const material = validateMaterialPayload(payload);
  const categoryId = await getOrCreateCategoryId(material.categoryName);
  const unitId = await getOrCreateUnitId(material.unitName);

  const existing = await db.get("SELECT id FROM materials WHERE normalized_name = ?", [material.normalizedName]);
  if (existing) {
    throw new Error("Матеріал з такою назвою вже існує");
  }

  const result = await db.run(
    `
      INSERT INTO materials (
        name, normalized_name, category_id, unit_id, current_quantity,
        min_quantity, unit_cost, currency, usd_rate, location, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      material.name,
      material.normalizedName,
      categoryId,
      unitId,
      material.currentQuantity,
      material.minQuantity,
      material.unitCost,
      material.currency,
      material.currency === "USD" ? material.usdRate || (await getUsdRate()) : 0,
      material.location,
      material.notes
    ]
  );

  if (material.currentQuantity > 0) {
    await db.run(
      "INSERT INTO stock_transactions (material_id, type, quantity, notes) VALUES (?, 'IN', ?, ?)",
      [result.lastID, material.currentQuantity, "Початковий залишок"]
    );
  }

  return getMaterialById(result.lastID);
}

export async function updateMaterial(id, payload) {
  const db = await getDb();
  const current = await db.get("SELECT * FROM materials WHERE id = ?", [id]);

  if (!current) {
    throw new Error("Матеріал не знайдено");
  }

  const material = validateMaterialPayload(payload);
  const duplicate = await db.get("SELECT id FROM materials WHERE normalized_name = ? AND id != ?", [
    material.normalizedName,
    id
  ]);

  if (duplicate) {
    throw new Error("Матеріал з такою назвою вже існує");
  }

  const categoryId = await getOrCreateCategoryId(material.categoryName);
  const unitId = await getOrCreateUnitId(material.unitName);

  await db.run(
    `
      UPDATE materials
      SET
        name = ?,
        normalized_name = ?,
        category_id = ?,
        unit_id = ?,
        current_quantity = ?,
        min_quantity = ?,
        unit_cost = ?,
        currency = ?,
        usd_rate = ?,
        location = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      material.name,
      material.normalizedName,
      categoryId,
      unitId,
      material.currentQuantity,
      material.minQuantity,
      material.unitCost,
      material.currency,
      material.currency === "USD" ? material.usdRate || (await getUsdRate()) : 0,
      material.location,
      material.notes,
      id
    ]
  );

  return getMaterialById(id);
}

export async function deleteMaterial(id) {
  const db = await getDb();
  const result = await db.run("DELETE FROM materials WHERE id = ?", [id]);
  if (!result.changes) {
    throw new Error("Матеріал не знайдено");
  }
}

export async function createTransaction(payload) {
  const db = await getDb();
  const materialId = Number(payload.materialId);
  const quantity = toNumber(payload.quantity);
  const type = payload.type === "OUT" ? "OUT" : "IN";
  const notes = prettifyText(payload.notes);
  const unitPrice = toNumber(payload.unitPrice);

  if (!materialId || quantity <= 0) {
    throw new Error("Некоректні дані руху");
  }

  const material = await db.get("SELECT * FROM materials WHERE id = ?", [materialId]);
  if (!material) {
    throw new Error("Матеріал не знайдено");
  }

  const nextQuantity = type === "IN" ? material.current_quantity + quantity : material.current_quantity - quantity;

  if (nextQuantity < 0) {
    throw new Error("Недостатньо залишку на складі");
  }

  const result = await db.run(
    "INSERT INTO stock_transactions (material_id, type, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)",
    [materialId, type, quantity, unitPrice, notes]
  );

  await db.run(
    "UPDATE materials SET current_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [nextQuantity, materialId]
  );

  return db.get("SELECT * FROM stock_transactions WHERE id = ?", [result.lastID]);
}

export async function listTransactionsByMaterial(materialId) {
  const db = await getDb();
  return db.all(
    `
      SELECT
        id,
        material_id AS materialId,
        type,
        quantity,
        unit_price AS unitPrice,
        notes,
        created_at AS createdAt
      FROM stock_transactions
      WHERE material_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [materialId]
  );
}

export async function importMaterials(rows) {
  const db = await getDb();
  let created = 0;
  let updated = 0;
  const defaultUsdRate = await getUsdRate();

  for (const row of rows) {
    const material = validateMaterialPayload(row);
    const categoryId = await getOrCreateCategoryId(material.categoryName);
    const unitId = await getOrCreateUnitId(material.unitName);
    const existing = await db.get("SELECT * FROM materials WHERE normalized_name = ?", [material.normalizedName]);

    if (existing) {
      await db.run(
        `
          UPDATE materials
          SET
            name = ?,
            category_id = ?,
            unit_id = ?,
            current_quantity = ?,
            min_quantity = ?,
            unit_cost = ?,
            currency = ?,
            usd_rate = ?,
            location = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          material.name,
          categoryId,
          unitId,
          material.currentQuantity,
          material.minQuantity,
          material.unitCost,
          material.currency,
          material.currency === "USD" ? material.usdRate || defaultUsdRate : 0,
          material.location,
          material.notes,
          existing.id
        ]
      );

      updated += 1;
      continue;
    }

    const result = await db.run(
      `
        INSERT INTO materials (
          name, normalized_name, category_id, unit_id, current_quantity,
          min_quantity, unit_cost, currency, usd_rate, location, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        material.name,
        material.normalizedName,
        categoryId,
        unitId,
        material.currentQuantity,
        material.minQuantity,
        material.unitCost,
        material.currency,
        material.currency === "USD" ? material.usdRate || defaultUsdRate : 0,
        material.location,
        material.notes
      ]
    );

    if (material.currentQuantity > 0) {
      await db.run(
        "INSERT INTO stock_transactions (material_id, type, quantity, notes) VALUES (?, 'IN', ?, ?)",
        [result.lastID, material.currentQuantity, "Імпорт з Excel"]
      );
    }

    created += 1;
  }

  return { created, updated, total: rows.length };
}
