import { useMemo, useState } from "react";
import { api } from "../api";

const fieldLabels = {
  name: "Назва",
  categoryName: "Категорія",
  unitName: "Од. виміру",
  currentQuantity: "Кількість",
  minQuantity: "Мін. залишок",
  location: "Склад / зона",
  notes: "Коментар"
};

function buildInitialMapping(preview) {
  return {
    name: preview.detectedColumns.name || "",
    categoryName: preview.detectedColumns.categoryName || "",
    unitName: preview.detectedColumns.unitName || "",
    currentQuantity: preview.detectedColumns.currentQuantity || "",
    minQuantity: preview.detectedColumns.minQuantity || "",
    location: preview.detectedColumns.location || "",
    notes: preview.detectedColumns.notes || ""
  };
}

function normalizeRows(rawRows, mapping) {
  return rawRows.map((row) => {
    const name = String(mapping.name ? row[mapping.name] ?? "" : "").trim();

    return {
      name,
      categoryName: String(mapping.categoryName ? row[mapping.categoryName] ?? "" : "").trim(),
      unitName: String(mapping.unitName ? row[mapping.unitName] ?? "" : "").trim(),
      currentQuantity: String(mapping.currentQuantity ? row[mapping.currentQuantity] ?? "" : "").trim(),
      minQuantity: String(mapping.minQuantity ? row[mapping.minQuantity] ?? "" : "").trim(),
      location: String(mapping.location ? row[mapping.location] ?? "" : "").trim(),
      notes: String(mapping.notes ? row[mapping.notes] ?? "" : "").trim(),
      valid: Boolean(name)
    };
  });
}

export function ImportPanel({ onCommitted }) {
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await api.previewImport(file);
      setPreview(result);
      setMapping(buildInitialMapping(result));
      setMessage(
        result.requiresMapping
          ? "Не всі колонки розпізнані автоматично. Просто зістав їх вручну нижче."
          : "Файл прочитано успішно. Перевір попередній перегляд і запускай імпорт."
      );
    } catch (previewError) {
      setError(previewError.message);
      setPreview(null);
      setMapping({});
    } finally {
      setLoading(false);
    }
  }

  const normalizedPreviewRows = useMemo(() => {
    if (!preview?.rawRows) {
      return [];
    }

    return normalizeRows(preview.rawRows, mapping).slice(0, 25);
  }, [preview, mapping]);

  async function handleImport() {
    if (!preview?.rawRows?.length) {
      setError("Спочатку завантаж Excel-файл для імпорту.");
      return;
    }

    if (!mapping.name) {
      setError("Оберіть колонку, у якій знаходиться назва матеріалу.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await api.commitImport({
        rawRows: preview.rawRows,
        mapping
      });

      setMessage(`Імпорт завершено: додано ${result.created}, оновлено ${result.updated}`);
      setPreview(null);
      setMapping({});
      await onCommitted();
    } catch (commitError) {
      setError(commitError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateMapping(field, value) {
    setMapping((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="import-panel">
      <div className="toolbar-card">
        <div className="form-tip">
          Завантаж файл Excel, а система спробує сама знайти потрібні колонки.
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <p>
          Якщо якісь поля не визначаться автоматично, просто вибери потрібні назви колонок вручну.
        </p>
      </div>

      {(message || error) && <div className={`alert ${error ? "error" : "success"}`}>{error || message}</div>}
      {loading && <div className="empty-state">Обробка файлу...</div>}

      {preview && (
        <div className="crm-stack">
          <div className="preview-box">
            <div className="preview-head">
              <div><strong>Аркуш:</strong> {preview.sheetName}</div>
              <div><strong>Рядків:</strong> {preview.totalRows}</div>
            </div>

            <div className="mapping-grid">
              {Object.entries(fieldLabels).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <select value={mapping[field] || ""} onChange={(event) => updateMapping(field, event.target.value)}>
                    <option value="">Не використовувати</option>
                    {preview.headers.map((header) => (
                      <option key={`${field}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="table-wrap crm-table">
            <table>
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>Категорія</th>
                  <th>Од.</th>
                  <th>Кількість</th>
                  <th>Мін.</th>
                  <th>Склад</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {normalizedPreviewRows.map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <td>{row.name || "—"}</td>
                    <td>{row.categoryName || "Авто"}</td>
                    <td>{row.unitName || "Авто"}</td>
                    <td>{row.currentQuantity || "0"}</td>
                    <td>{row.minQuantity || "0"}</td>
                    <td>{row.location || "—"}</td>
                    <td>
                      <span className={`badge ${row.valid ? "success" : "danger"}`}>
                        {row.valid ? "Готово" : "Пропуск"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="primary" onClick={handleImport} disabled={loading}>
            Імпортувати в базу
          </button>
        </div>
      )}
    </div>
  );
}
