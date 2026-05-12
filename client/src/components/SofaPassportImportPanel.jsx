import { useMemo, useState } from "react";
import { api } from "../api";

const fieldLabels = {
  sofaName: "Диван",
  passportNumber: "Паспорт",
  article: "Артикул",
  notes: "Примітка"
};

function buildInitialMapping(preview) {
  return {
    sofaName: preview.detectedColumns.sofaName || "",
    passportNumber: preview.detectedColumns.passportNumber || "",
    article: preview.detectedColumns.article || "",
    notes: preview.detectedColumns.notes || ""
  };
}

function normalizeRows(rawRows, mapping) {
  return rawRows.map((row) => {
    const sofaName = String(mapping.sofaName ? row[mapping.sofaName] ?? "" : "").trim();
    const passportNumber = String(mapping.passportNumber ? row[mapping.passportNumber] ?? "" : "").trim();

    return {
      sofaName,
      passportNumber,
      article: String(mapping.article ? row[mapping.article] ?? "" : "").trim(),
      notes: String(mapping.notes ? row[mapping.notes] ?? "" : "").trim(),
      valid: Boolean(sofaName || passportNumber)
    };
  });
}

export function SofaPassportImportPanel({ onCommitted }) {
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
      const result = await api.previewSofaPassportImport(file);
      setPreview(result);
      setMapping(buildInitialMapping(result));
      setMessage(
        result.requiresMapping
          ? "Не всі колонки розпізнані. Зістав їх вручну й імпортуй."
          : "Файл прочитано. Перевір попередній перегляд і запускай імпорт."
      );
    } catch (previewError) {
      setError(previewError.message);
      setPreview(null);
      setMapping({});
    } finally {
      setLoading(false);
    }
  }

  const previewRows = useMemo(() => {
    if (!preview?.rawRows) {
      return [];
    }

    return normalizeRows(preview.rawRows, mapping).slice(0, 25);
  }, [preview, mapping]);

  async function handleImport() {
    if (!preview?.rawRows?.length) {
      setError("Спочатку завантаж Excel-файл.");
      return;
    }

    if (!mapping.sofaName && !mapping.passportNumber) {
      setError("Оберіть хоча б колонку з диваном або номером паспорта.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await api.commitSofaPassportImport({
        rawRows: preview.rawRows,
        mapping
      });

      setMessage(`Імпорт завершено: додано ${result.created}, оновлено ${result.updated}`);
      setPreview(null);
      setMapping({});
      await onCommitted(result.rows || []);
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
          Excel-імпорт для диванів і їх паспортів. Завантажуй назву дивана, номер паспорта, артикул і примітки.
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
      </div>

      {(message || error) && <div className={`alert ${error ? "error" : "success"}`}>{error || message}</div>}
      {loading && <div className="empty-state">Обробка файлу...</div>}

      {preview ? (
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
                  <th>Диван</th>
                  <th>Паспорт</th>
                  <th>Артикул</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.passportNumber || row.sofaName}-${index}`}>
                    <td>{row.sofaName || "—"}</td>
                    <td>{row.passportNumber || "—"}</td>
                    <td>{row.article || "—"}</td>
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
            Імпортувати дивани та паспорти
          </button>
        </div>
      ) : null}
    </div>
  );
}
