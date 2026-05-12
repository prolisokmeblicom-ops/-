const API_URL = "https://srm-76xc.onrender.com/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Помилка запиту" }));
    throw new Error(error.message || "Помилка запиту");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getMaterials(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.search) {
      searchParams.set("search", params.search);
    }

    if (params.categoryId) {
      searchParams.set("categoryId", params.categoryId);
    }

    return request(`/materials?${searchParams.toString()}`);
  },
  getCategories() {
    return request("/categories");
  },
  getUnits() {
    return request("/units");
  },
  getUsdRate() {
    return request("/usd-rate");
  },
  updateUsdRate(usdRate) {
    return request("/usd-rate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usdRate })
    });
  },
  getOrderStatuses() {
    return request("/order-statuses");
  },
  getPaymentStatuses() {
    return request("/payment-statuses");
  },
  getCustomers() {
    return request("/customers");
  },
  getNextOrderNumber() {
    return request("/orders-next-number");
  },
  getSofaMaterialTemplate(sofaName, excludeOrderId) {
    const searchParams = new URLSearchParams();

    if (sofaName) {
      searchParams.set("sofaName", sofaName);
    }

    if (excludeOrderId) {
      searchParams.set("excludeOrderId", excludeOrderId);
    }

    return request(`/sofa-material-template?${searchParams.toString()}`);
  },
  createMaterial(data) {
    return request("/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  updateMaterial(id, data) {
    return request(`/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  deleteMaterial(id) {
    return request(`/materials/${id}`, {
      method: "DELETE"
    });
  },
  getTransactions(materialId) {
    return request(`/materials/${materialId}/transactions`);
  },
  createTransaction(data) {
    return request("/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  previewImport(file) {
    const formData = new FormData();
    formData.append("file", file);

    return request("/import/preview", {
      method: "POST",
      body: formData
    });
  },
  commitImport(payload) {
    return request("/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  getOrders(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.search) {
      searchParams.set("search", params.search);
    }

    if (params.debtFilter) {
      searchParams.set("debtFilter", params.debtFilter);
    }

    if (params.customerName) {
      searchParams.set("customerName", params.customerName);
    }

    return request(`/orders?${searchParams.toString()}`);
  },
  getOrder(id) {
    return request(`/orders/${id}`);
  },
  createOrder(data) {
    return request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  updateOrder(id, data) {
    return request(`/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  deleteOrder(id) {
    return request(`/orders/${id}`, {
      method: "DELETE"
    });
  },
  saveOrderMaterials(id, materials) {
    return request(`/orders/${id}/materials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materials })
    });
  },
  startOrder(id) {
    return request(`/orders/${id}/start`, {
      method: "POST"
    });
  },
  getRouteSheet(id) {
    return request(`/orders/${id}/route-sheet`);
  },
  getPublicRouteSheet(orderNumber) {
    return request(`/public/route-sheet/${encodeURIComponent(orderNumber)}`);
  },
  verifyRouteSheetAccess(orderNumber, accessCode) {
    return request(`/public/route-sheet/${encodeURIComponent(orderNumber)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode })
    });
  },
  getSofaPassports() {
    return request("/sofa-passports");
  },
  getSofaPassport(id) {
    return request(`/sofa-passports/${id}`);
  },
  updateSofaPassport(id, data) {
    return request(`/sofa-passports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  deleteSofaPassport(id) {
    return request(`/sofa-passports/${id}`, {
      method: "DELETE"
    });
  },
  previewSofaPassportImport(file) {
    const formData = new FormData();
    formData.append("file", file);

    return request("/sofa-passports/import/preview", {
      method: "POST",
      body: formData
    });
  },
  commitSofaPassportImport(payload) {
    return request("/sofa-passports/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
};
