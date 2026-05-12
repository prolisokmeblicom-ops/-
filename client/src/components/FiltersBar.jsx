export function FiltersBar({ categories, filters, onChange }) {
  function updateField(field, value) {
    onChange({ ...filters, [field]: value });
  }

  return (
    <div className="filters">
      <input
        value={filters.search}
        onChange={(event) => updateField("search", event.target.value)}
        placeholder="Пошук за назвою, складом або коментарем"
      />

      <select
        value={filters.categoryId}
        onChange={(event) => updateField("categoryId", event.target.value)}
      >
        <option value="">Усі категорії</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
