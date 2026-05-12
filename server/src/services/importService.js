import XLSX from "xlsx";
import { inferCategoryFromName, inferUnitFromName, prettifyText, toNumber } from "../utils/normalizers.js";

const columnAliases = {
  name: [
    "название",
    "наименование",
    "товар",
    "матеріал",
    "назва",
    "найменування",
    "номенклатура",
    "позиція",
    "material",
    "name"
  ],
  categoryName: ["категория", "группа", "тип", "категорія", "група", "category", "group"],
  unitName: ["ед. изм.", "единица", "ед", "од. вим.", "одиниця", "uom", "unit"],
  currentQuantity: ["количество", "остаток", "qty", "quantity", "count", "кількість", "залишок", "к-сть"],
  minQuantity: ["мин. остаток", "мин остаток", "minimum", "min stock", "min", "мін. залишок", "мінімальний залишок"],
  location: ["склад", "ячейка", "location", "warehouse", "комірка", "зона", "місце"],
  notes: ["комментарий", "примечание", "описание", "notes", "comment", "description", "коментар", "примітка", "опис"]
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

function getSheetRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false
  });
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
  const name = prettifyText(mapping.name ? row[mapping.name] : "");
  const categoryName = prettifyText(row[mapping.categoryName]) || inferCategoryFromName(name);
  const unitName = prettifyText(row[mapping.unitName]) || inferUnitFromName(name);

  return {
    name,
    categoryName,
    unitName,
    currentQuantity: toNumber(row[mapping.currentQuantity]),
    minQuantity: toNumber(row[mapping.minQuantity]),
    location: prettifyText(row[mapping.location]),
    notes: prettifyText(row[mapping.notes]),
    valid: Boolean(name)
  };
}

export function normalizeImportRows(rawRows, mapping = {}) {
  return rawRows.map((row) => normalizeRow(row, mapping));
}

export async function previewImportFile(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("В Excel-файле нет листов");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = getSheetRows(sheet);

  if (!matrix.length) {
    throw new Error("Excel-файл порожній");
  }

  const headerRowIndex = detectHeaderRow(matrix);
  const headerCells = matrix[headerRowIndex] || [];
  const headers = headerCells.map((header, index) => {
    const cleanHeader = prettifyText(header);
    return cleanHeader || `Колонка ${index + 1}`;
  });
  const dataRows = matrix.slice(headerRowIndex + 1);
  const rawRows = makeRawRows(headers, dataRows);

  if (!rawRows.length) {
    throw new Error("У файлі немає рядків для імпорту");
  }

  const mapping = detectColumns(headers);
  const normalizedRows = normalizeImportRows(rawRows, mapping);

  return {
    sheetName: firstSheetName,
    headers,
    detectedColumns: mapping,
    rawRows,
    totalRows: normalizedRows.length,
    validRows: normalizedRows.filter((row) => row.valid).length,
    rows: normalizedRows,
    requiresMapping: !mapping.name
  };
}
