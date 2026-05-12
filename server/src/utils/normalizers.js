export function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function prettifyText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value || "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function inferCategoryFromName(name) {
  const text = normalizeText(name);
  const rules = [
    { category: "Тканина", keywords: ["ткан", "велюр", "рогож", "шенн", "замш", "экокож", "кож", "шкіра", "микрофиб", "жаккард"] },
    { category: "Поролон", keywords: ["поролон", "foam", "st ", "el ", "hl ", "memory", "латекс"] },
    { category: "Дерево", keywords: ["брус", "фанер", "дсп", "лдсп", "мдф", "доска", "рейк", "сосн", "wood"] },
    { category: "Фурнітура", keywords: ["скоба", "болт", "винт", "саморез", "петл", "механизм", "опора", "ножк", "клей", "лента"] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return "Інше";
}

export function inferUnitFromName(name) {
  const text = normalizeText(name);

  if (text.includes("ткан") || text.includes("кож")) {
    return "м";
  }

  if (text.includes("поролон")) {
    return "лист";
  }

  return "шт";
}
