import XLSX from "xlsx";
import { getDb } from "../db.js";
import { prettifyText } from "../utils/normalizers.js";

const columnAliases = {
  sofaName: ["диван", "назва дивана", "sofa", "name", "модель дивана", "виріб"],
  passportNumber: ["паспорт", "паспорт номер", "номер паспорта", "passport", "passport number"],
  article: ["артикул", "код", "article", "sku"],
  size: ["розмір", "габарит", "розміри", "size", "dimensions"],
  frameMaterial: ["каркас", "матеріал каркаса", "frame", "frame material"],
  filling: ["наповнення", "наповнювач", "filling", "foam"],
  notes: ["примітка", "коментар", "notes", "comment", "опис"]
};

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreHeaderRow(row) {
  const normalizedRow = row.map(normalizeHeader);
  let score = 0;

  Object.values(columnAliases).forEach((aliases) => {
    if (normalizedRow.some((cell) => aliases.some((alias) => cell.includes(alias)))) {
      score += 1;
    }
  });

  return score;
}

function detectHeaderRow(matrix) {
  const candidates = matrix.slice(0, 10);
  let bestIndex = 0;
  let bestScore = -1;

  candidates.forEach((row, index) => {
    const score = scoreHeaderRow(row);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestIndex;
}

function detectColumns(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = {};

  Object.entries(columnAliases).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    if (index >= 0) {
      mapping[field] = headers[index];
    }
  });

  return mapping;
}

function makeRawRows(headers, matrixRows) {
  return matrixRows
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) => {
      const result = {};
      headers.forEach((header, index) => {
        result[header] = row[index] ?? "";
      });
      return result;
    });
}

function normalizeRow(row, mapping = {}) {
  const sofaName = prettifyText(mapping.sofaName ? row[mapping.sofaName] : "");
  const passportNumber = prettifyText(mapping.passportNumber ? row[mapping.passportNumber] : "");
  const article = prettifyText(mapping.article ? row[mapping.article] : "");
  const size = prettifyText(mapping.size ? row[mapping.size] : "");
  const frameMaterial = prettifyText(mapping.frameMaterial ? row[mapping.frameMaterial] : "");
  const filling = prettifyText(mapping.filling ? row[mapping.filling] : "");
  const notes = prettifyText(mapping.notes ? row[mapping.notes] : "");

  return {
    sofaName,
    passportNumber,
    article,
    size,
    frameMaterial,
    filling,
    notes,
    valid: Boolean(sofaName || passportNumber)
  };
}

function buildBaseTechFields(sofaName) {
  return {
    size: "Не вказано",
    frameMaterial: "Не вказано",
    filling: "Не вказано",
    notes: `Базовий паспорт створено автоматично для дивана "${sofaName}".`
  };
}

async function buildPassportNumber() {
  const db = await getDb();
  const row = await db.get("SELECT MAX(id) AS maxId FROM sofa_passports");
  const next = Number(row?.maxId || 0) + 1;
  return `PAS-${String(next).padStart(4, "0")}`;
}

export function normalizeSofaPassportRows(rawRows, mapping = {}) {
  return rawRows.map((row) => normalizeRow(row, mapping));
}

export async function previewSofaPassportImport(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("В Excel-файлі немає аркушів");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false
  });

  if (!matrix.length) {
    throw new Error("Excel-файл порожній");
  }

  const headerRowIndex = detectHeaderRow(matrix);
  const headers = (matrix[headerRowIndex] || []).map((header, index) => prettifyText(header) || `Колонка ${index + 1}`);
  const rawRows = makeRawRows(headers, matrix.slice(headerRowIndex + 1));

  if (!rawRows.length) {
    throw new Error("У файлі немає рядків для імпорту");
  }

  const mapping = detectColumns(headers);
  const rows = normalizeSofaPassportRows(rawRows, mapping);

  return {
    sheetName: firstSheetName,
    headers,
    detectedColumns: mapping,
    rawRows,
    rows,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.valid).length,
    requiresMapping: !mapping.sofaName && !mapping.passportNumber
  };
}

export async function listSofaPassports() {
  const db = await getDb();
  return db.all(`
    SELECT
      id,
      sofa_name AS sofaName,
      passport_number AS passportNumber,
      article,
      size,
      frame_material AS frameMaterial,
      filling,
      notes,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM sofa_passports
    ORDER BY updated_at DESC, id DESC
  `);
}

async function getSofaProductionMaterials(sofaName) {
  const db = await getDb();
  return db.all(
    `
      SELECT
        m.id AS materialId,
        m.name AS materialName,
        u.name AS unitName,
        SUM(om.quantity) AS totalQuantity,
        COUNT(DISTINCT o.id) AS ordersCount
      FROM orders o
      JOIN order_materials om ON om.order_id = o.id
      JOIN materials m ON m.id = om.material_id
      JOIN units u ON u.id = m.unit_id
      WHERE TRIM(o.sofa_name) = TRIM(?)
      GROUP BY m.id, m.name, u.name
      ORDER BY m.name ASC
    `,
    [sofaName]
  );
}

export async function getSofaPassportById(id) {
  const db = await getDb();
  const passport = await db.get(
    `
      SELECT
        id,
        sofa_name AS sofaName,
        passport_number AS passportNumber,
        article,
        size,
        frame_material AS frameMaterial,
        filling,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sofa_passports
      WHERE id = ?
    `,
    [id]
  );

  if (!passport) {
    return null;
  }

  return {
    ...passport,
    materials: passport.sofaName ? await getSofaProductionMaterials(passport.sofaName) : []
  };
}

function normalizeSofaPassportPayload(payload = {}) {
  return {
    sofaName: prettifyText(payload.sofaName),
    passportNumber: prettifyText(payload.passportNumber),
    article: prettifyText(payload.article),
    size: prettifyText(payload.size),
    frameMaterial: prettifyText(payload.frameMaterial),
    filling: prettifyText(payload.filling),
    notes: prettifyText(payload.notes)
  };
}

export async function ensureSofaPassportExists(sofaName) {
  const db = await getDb();
  const normalizedName = prettifyText(sofaName);

  if (!normalizedName) {
    return null;
  }

  const existing = await db.get(
    `
      SELECT
        id,
        sofa_name AS sofaName,
        passport_number AS passportNumber,
        article,
        size,
        frame_material AS frameMaterial,
        filling,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sofa_passports
      WHERE TRIM(sofa_name) = TRIM(?)
      ORDER BY id DESC
      LIMIT 1
    `,
    [normalizedName]
  );

  if (existing) {
    return existing;
  }

  const techDefaults = buildBaseTechFields(normalizedName);
  const passportNumber = await buildPassportNumber();
  const result = await db.run(
    `
      INSERT INTO sofa_passports (
        sofa_name, model_name, passport_number, article, size, frame_material, filling, notes, updated_at
      ) VALUES (?, '', ?, '', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [normalizedName, passportNumber, techDefaults.size, techDefaults.frameMaterial, techDefaults.filling, techDefaults.notes]
  );

  return getSofaPassportById(result.lastID);
}

export async function updateSofaPassport(id, payload = {}) {
  const db = await getDb();
  const current = await getSofaPassportById(id);

  if (!current) {
    throw new Error("Паспорт дивана не знайдено");
  }

  const normalized = normalizeSofaPassportPayload(payload);

  if (!normalized.sofaName) {
    throw new Error("Вкажи назву дивана");
  }

  const duplicate = normalized.passportNumber
    ? await db.get("SELECT id FROM sofa_passports WHERE passport_number = ? AND id != ?", [normalized.passportNumber, id])
    : null;

  if (duplicate) {
    throw new Error("Паспорт з таким номером вже існує");
  }

  await db.run(
    `
      UPDATE sofa_passports
      SET
        sofa_name = ?,
        model_name = '',
        passport_number = ?,
        article = ?,
        size = ?,
        frame_material = ?,
        filling = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      normalized.sofaName,
      normalized.passportNumber,
      normalized.article,
      normalized.size,
      normalized.frameMaterial,
      normalized.filling,
      normalized.notes,
      id
    ]
  );

  return getSofaPassportById(id);
}

export async function deleteSofaPassport(id) {
  const db = await getDb();
  const current = await getSofaPassportById(id);

  if (!current) {
    throw new Error("Паспорт дивана не знайдено");
  }

  await db.run("DELETE FROM sofa_passports WHERE id = ?", [id]);
}

export async function importSofaPassports(rows = []) {
  const db = await getDb();
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.valid) {
      continue;
    }

    const sofaName = prettifyText(row.sofaName);
    const passportNumber = prettifyText(row.passportNumber) || (await buildPassportNumber());
    const article = prettifyText(row.article);
    const size = prettifyText(row.size) || "Не вказано";
    const frameMaterial = prettifyText(row.frameMaterial) || "Не вказано";
    const filling = prettifyText(row.filling) || "Не вказано";
    const notes = prettifyText(row.notes) || `Базовий паспорт створено автоматично для дивана "${sofaName}".`;

    const existing = passportNumber
      ? await db.get("SELECT id FROM sofa_passports WHERE passport_number = ?", [passportNumber])
      : null;

    if (existing) {
      await db.run(
        `
          UPDATE sofa_passports
          SET
            sofa_name = ?,
            model_name = '',
            article = ?,
            size = ?,
            frame_material = ?,
            filling = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [sofaName, article, size, frameMaterial, filling, notes, existing.id]
      );
      updated += 1;
    } else {
      await db.run(
        `
          INSERT INTO sofa_passports (
            sofa_name, model_name, passport_number, article, size, frame_material, filling, notes, updated_at
          ) VALUES (?, '', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [sofaName, passportNumber, article, size, frameMaterial, filling, notes]
      );
      created += 1;
    }
  }

  return { created, updated, rows: await listSofaPassports() };
}
