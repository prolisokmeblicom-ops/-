import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { MaterialForm } from "./components/MaterialForm";
import { FiltersBar } from "./components/FiltersBar";
import { MaterialsTable } from "./components/MaterialsTable";
import { TransactionPanel } from "./components/TransactionPanel";
import { ImportPanel } from "./components/ImportPanel";
import { OrdersTable } from "./components/OrdersTable";
import { OrderForm } from "./components/OrderForm";
import { OrderMaterialsEditor } from "./components/OrderMaterialsEditor";
import { SofaPassportImportPanel } from "./components/SofaPassportImportPanel";
import { SofaPassportsTable } from "./components/SofaPassportsTable";
import { SofaPassportForm } from "./components/SofaPassportForm";
import { printQrCodePage, printRouteSheet } from "./components/RouteSheetPrint";

const emptyMaterial = {
  name: "",
  categoryName: "Тканина",
  unitName: "м",
  currentQuantity: 0,
  minQuantity: 0,
  unitCost: 0,
  currency: "UAH",
  location: "",
  notes: ""
};

const emptyOrder = {
  orderNumber: "",
  sofaName: "",
  customerName: "",
  customerPhone: "",
  status: "Нове",
  receivedDate: "",
  assignedTo: "",
  cutterName: "",
  sewingName: "",
  upholsteryName: "",
  paymentStatus: "Борг",
  amountPaid: 0,
  orderTotal: 0,
  notes: ""
};

const emptySofaPassport = {
  id: null,
  sofaName: "",
  passportNumber: "",
  article: "",
  size: "",
  frameMaterial: "",
  filling: "",
  notes: "",
  materials: []
};

const defaultStatuses = ["Нове", "Підготовка", "В роботі", "Готово", "Відвантажено"];
const defaultPaymentStatuses = ["Не оплачено", "Частково", "Оплачено", "Борг"];

function mapOrderMaterials(materials = []) {
  return materials.map((item) => ({
    materialId: String(item.materialId),
    quantity: item.quantity,
    notes: item.notes || ""
  }));
}

function hasOrderMaterials(items = []) {
  return items.some((item) => String(item.materialId || "").trim() && Number(item.quantity || 0) > 0);
}

export default function App() {
  const materialSearchTimeoutRef = useRef(null);
  const orderSearchTimeoutRef = useRef(null);

  const [view, setView] = useState("orders");
  const [materials, setMaterials] = useState([]);
  const [sofaPassports, setSofaPassports] = useState([]);
  const [selectedSofaPassport, setSelectedSofaPassport] = useState(null);
  const [sofaPassportFormData, setSofaPassportFormData] = useState(emptySofaPassport);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [paymentStatuses, setPaymentStatuses] = useState(defaultPaymentStatuses);
  const [globalUsdRate, setGlobalUsdRate] = useState(0);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ search: "", categoryId: "" });
  const [orderSearch, setOrderSearch] = useState("");
  const [debtFilter, setDebtFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState(emptyMaterial);
  const [orderFormData, setOrderFormData] = useState(emptyOrder);
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [passportSaving, setPassportSaving] = useState(false);

  function showError(text) {
    setMessage("");
    setError(text);
  }

  function showMessage(text) {
    setError("");
    setMessage(text);
  }

  function applyOrderDetails(order) {
    setSelectedOrder(order);
    setOrderFormData({
      orderNumber: order.orderNumber || "",
      sofaName: order.sofaName || "",
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      status: order.status || "Нове",
      receivedDate: order.receivedDate || "",
      assignedTo: order.assignedTo || "",
      cutterName: order.cutterName || "",
      sewingName: order.sewingName || "",
      upholsteryName: order.upholsteryName || "",
      paymentStatus: order.paymentStatus || "Борг",
      amountPaid: order.amountPaid || 0,
      orderTotal: order.orderTotal || 0,
      notes: order.notes || ""
    });
    setOrderMaterials(mapOrderMaterials(order.materials));
  }

  function applySofaPassportDetails(passport) {
    setSelectedSofaPassport(passport);
    setSofaPassportFormData({
      id: passport.id,
      sofaName: passport.sofaName || "",
      passportNumber: passport.passportNumber || "",
      article: passport.article || "",
      size: passport.size || "",
      frameMaterial: passport.frameMaterial || "",
      filling: passport.filling || "",
      notes: passport.notes || "",
      materials: passport.materials || []
    });
  }

  async function refreshSelectedOrderDetails(orderId) {
    const refreshed = await api.getOrder(orderId);
    applyOrderDetails(refreshed);
    return refreshed;
  }

  async function loadDictionaryData() {
    const [categoriesData, unitsData, statusesData, paymentStatusesData, customersData, usdRateData] = await Promise.all([
      api.getCategories(),
      api.getUnits(),
      api.getOrderStatuses(),
      api.getPaymentStatuses(),
      api.getCustomers(),
      api.getUsdRate()
    ]);

    setCategories(categoriesData);
    setUnits(unitsData);
    setStatuses(statusesData);
    setPaymentStatuses(paymentStatusesData);
    setCustomers(
      [...customersData].sort((left, right) =>
        String(left.customerName || "").localeCompare(String(right.customerName || ""), "uk")
      )
    );
    setGlobalUsdRate(usdRateData.usdRate || 0);
  }

  async function loadSofaPassports() {
    const rows = await api.getSofaPassports();
    setSofaPassports(rows);
    return rows;
  }

  async function buildNewOrderDraft() {
    const next = await api.getNextOrderNumber();
    return {
      ...emptyOrder,
      orderNumber: next.orderNumber || ""
    };
  }

  async function loadTransactions(materialId) {
    setTransactions(await api.getTransactions(materialId));
  }

  async function loadMaterials(currentFilters = filters) {
    const data = await api.getMaterials(currentFilters);
    setMaterials(data);

    if (!selectedMaterial) {
      return;
    }

    const nextSelected = data.find((item) => item.id === selectedMaterial.id);
    if (nextSelected) {
      setSelectedMaterial(nextSelected);
      return;
    }

    setSelectedMaterial(null);
    setTransactions([]);
  }

  async function loadOrders(
    currentSearch = orderSearch,
    currentDebtFilter = debtFilter,
    currentCustomerFilter = customerFilter
  ) {
    const data = await api.getOrders({
      search: currentSearch,
      debtFilter: currentDebtFilter,
      customerName: currentCustomerFilter
    });
    setOrders(data);
  }

  useEffect(() => {
    setLoading(true);

    Promise.all([
      loadDictionaryData(),
      loadMaterials(),
      loadOrders("", "", ""),
      loadSofaPassports(),
      buildNewOrderDraft().then(setOrderFormData)
    ])
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));

    return () => {
      if (materialSearchTimeoutRef.current) {
        clearTimeout(materialSearchTimeoutRef.current);
      }

      if (orderSearchTimeoutRef.current) {
        clearTimeout(orderSearchTimeoutRef.current);
      }
    };
  }, []);

  async function refreshAll() {
    await Promise.all([
      loadMaterials(),
      loadOrders(orderSearch, debtFilter, customerFilter),
      loadDictionaryData(),
      loadSofaPassports()
    ]);
  }

  async function startNewOrder() {
    await resetOrderForm();
    setView("orders");
  }

  async function handleFilterChange(nextFilters) {
    setFilters(nextFilters);

    if (materialSearchTimeoutRef.current) {
      clearTimeout(materialSearchTimeoutRef.current);
    }

    const runLoad = async () => {
      setLoading(true);
      try {
        await loadMaterials(nextFilters);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    if (nextFilters.search !== filters.search) {
      materialSearchTimeoutRef.current = setTimeout(runLoad, 250);
      return;
    }

    await runLoad();
  }

  function handleOrderSearchChange(value) {
    setOrderSearch(value);

    if (orderSearchTimeoutRef.current) {
      clearTimeout(orderSearchTimeoutRef.current);
    }

    orderSearchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        await loadOrders(value, debtFilter, customerFilter);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  async function handleDebtFilterChange(value) {
    setDebtFilter(value);
    setLoading(true);
    try {
      await loadOrders(orderSearch, value, customerFilter);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerFilterChange(value) {
    setCustomerFilter(value);
    setLoading(true);
    try {
      await loadOrders(orderSearch, debtFilter, value);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMaterial(material) {
    setView("warehouse");
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      categoryName: material.categoryName,
      unitName: material.unitName,
      currentQuantity: material.currentQuantity,
      minQuantity: material.minQuantity,
      unitCost: material.unitCost || 0,
      currency: material.currency || "UAH",
      location: material.location || "",
      notes: material.notes || ""
    });
    loadTransactions(material.id).catch((loadError) => setError(loadError.message));
  }

  async function handleSelectOrder(order) {
    setView("orders");
    try {
      const fullOrder = await api.getOrder(order.id);
      applyOrderDetails(fullOrder);

      if (!fullOrder.materials?.length && String(fullOrder.sofaName || "").trim()) {
        const templateMaterials = await api.getSofaMaterialTemplate(fullOrder.sofaName, fullOrder.id);
        if (templateMaterials.length) {
          setOrderMaterials(mapOrderMaterials(templateMaterials));
        }
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function handleSelectSofaPassport(passport) {
    setView("passports");
    try {
      applySofaPassportDetails(await api.getSofaPassport(passport.id));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  function resetMaterialForm() {
    setSelectedMaterial(null);
    setFormData(emptyMaterial);
    setTransactions([]);
  }

  async function resetOrderForm() {
    setSelectedOrder(null);
    try {
      setOrderFormData(await buildNewOrderDraft());
    } catch {
      setOrderFormData(emptyOrder);
    }
    setOrderMaterials([]);
  }

  async function handleSaveMaterial(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!String(formData.name || "").trim()) {
      showError("Вкажи назву матеріалу, щоб його можна було зберегти.");
      return;
    }

    if (Number(formData.currentQuantity || 0) < 0 || Number(formData.minQuantity || 0) < 0) {
      showError("Залишок і мінімальний залишок не можуть бути від’ємними.");
      return;
    }

    if (formData.currency === "USD" && Number(globalUsdRate || 0) <= 0) {
      showError("Для цін у доларах спочатку задай курс долара у верхньому блоці складу.");
      return;
    }

    try {
      if (selectedMaterial) {
        await api.updateMaterial(selectedMaterial.id, {
          ...formData,
          usdRate: globalUsdRate
        });
        showMessage("Матеріал оновлено");
      } else {
        await api.createMaterial({
          ...formData,
          usdRate: globalUsdRate
        });
        showMessage("Матеріал додано");
      }

      await loadMaterials();
      resetMaterialForm();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleDeleteMaterial(id) {
    if (!window.confirm("Видалити матеріал і всю історію руху?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.deleteMaterial(id);
      showMessage("Матеріал видалено");
      await loadMaterials();
      resetMaterialForm();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleCreateTransaction(payload) {
    setError("");
    setMessage("");

    if (!payload.materialId) {
      showError("Спочатку обери матеріал у таблиці складу.");
      return;
    }

    if (Number(payload.quantity || 0) <= 0) {
      showError("Вкажи кількість більше нуля, щоб зберегти рух матеріалу.");
      return;
    }

    if (
      payload.type === "OUT" &&
      selectedMaterial &&
      Number(payload.quantity) > Number(selectedMaterial.currentQuantity || 0)
    ) {
      showError("Для витрати не вистачає залишку на складі. Зменш кількість або спочатку додай прихід.");
      return;
    }

    try {
      await api.createTransaction(payload);
      showMessage("Рух матеріалу збережено");
      await loadMaterials();
      await loadTransactions(payload.materialId);
    } catch (transactionError) {
      setError(transactionError.message);
    }
  }

  async function handleImportCommitted() {
    showMessage("Імпорт виконано успішно");
    await refreshAll();
  }

  async function handleSofaPassportImported(rows) {
    setSofaPassports(rows);
    setSelectedSofaPassport(null);
    setSofaPassportFormData(emptySofaPassport);
    showMessage("Дивани та паспорти імпортовано");
  }

  async function handleSaveSofaPassport(event) {
    event.preventDefault();

    if (!sofaPassportFormData.id) {
      showError("Спочатку обери диван зі списку.");
      return;
    }

    if (!String(sofaPassportFormData.sofaName || "").trim()) {
      showError("Вкажи назву дивана в паспорті.");
      return;
    }

    setPassportSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await api.updateSofaPassport(sofaPassportFormData.id, {
        sofaName: sofaPassportFormData.sofaName,
        passportNumber: sofaPassportFormData.passportNumber,
        article: sofaPassportFormData.article,
        size: sofaPassportFormData.size,
        frameMaterial: sofaPassportFormData.frameMaterial,
        filling: sofaPassportFormData.filling,
        notes: sofaPassportFormData.notes
      });
      applySofaPassportDetails(updated);
      await loadSofaPassports();
      showMessage("Паспорт дивана збережено");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setPassportSaving(false);
    }
  }

  async function handleDeleteSofaPassport() {
    if (!selectedSofaPassport?.id) {
      showError("Спочатку обери диван зі списку.");
      return;
    }

    if (!window.confirm(`Видалити диван "${selectedSofaPassport.sofaName}" з вкладки паспортів?`)) {
      return;
    }

    setPassportSaving(true);
    setError("");
    setMessage("");

    try {
      await api.deleteSofaPassport(selectedSofaPassport.id);
      setSelectedSofaPassport(null);
      setSofaPassportFormData(emptySofaPassport);
      await loadSofaPassports();
      showMessage("Диван видалено зі списку паспортів");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setPassportSaving(false);
    }
  }

  async function handleUsdRateSave() {
    setError("");
    setMessage("");

    if (Number(globalUsdRate || 0) <= 0) {
      showError("Вкажи коректний курс долара більше нуля.");
      return;
    }

    try {
      const result = await api.updateUsdRate(globalUsdRate);
      setGlobalUsdRate(result.usdRate || 0);
      showMessage("Курс долара збережено");
      await loadMaterials();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleSaveOrder(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!String(orderFormData.sofaName || "").trim()) {
      showError("Вкажи назву дивана, щоб створити або зберегти замовлення.");
      return;
    }

    if (!String(orderFormData.customerName || "").trim()) {
      showError("Вкажи замовника або вибери його зі списку.");
      return;
    }

    if (Number(orderFormData.orderTotal || 0) < 0 || Number(orderFormData.amountPaid || 0) < 0) {
      showError("Сума замовлення і сплачена сума не можуть бути від’ємними.");
      return;
    }

    try {
      const isEditing = Boolean(selectedOrder);
      const savedOrder = isEditing
        ? await api.updateOrder(selectedOrder.id, orderFormData)
        : await api.createOrder(orderFormData);

      applyOrderDetails(savedOrder);

      if (!savedOrder.materials?.length) {
        const templateMaterials = await api.getSofaMaterialTemplate(savedOrder.sofaName, savedOrder.id);
        if (templateMaterials.length) {
          setOrderMaterials(mapOrderMaterials(templateMaterials));
          showMessage(
            isEditing
              ? "Замовлення оновлено, матеріали для цього дивана підставлено з попереднього виробу"
              : "Замовлення створено, матеріали для цього дивана підставлено з попереднього виробу"
          );
        } else {
          showMessage(isEditing ? "Замовлення оновлено" : "Замовлення створено");
        }
      } else {
        showMessage(isEditing ? "Замовлення оновлено" : "Замовлення створено");
      }

      await loadOrders(orderSearch, debtFilter, customerFilter);
      await loadDictionaryData();
      await loadSofaPassports();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleQuickUpdateOrder(order, draft) {
    setError("");
    setMessage("");

    if (!String(draft.sofaName || "").trim()) {
      showError(`У замовленні ${order.orderNumber} потрібно вказати назву дивана.`);
      return;
    }

    if (!String(draft.customerName || "").trim()) {
      showError(`У замовленні ${order.orderNumber} потрібно вказати замовника.`);
      return;
    }

    try {
      await api.updateOrder(order.id, {
        orderNumber: order.orderNumber,
        sofaName: draft.sofaName,
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        status: draft.status,
        receivedDate: draft.receivedDate,
        assignedTo: draft.assignedTo,
        cutterName: order.cutterName || "",
        sewingName: order.sewingName || "",
        upholsteryName: order.upholsteryName || "",
        paymentStatus: draft.paymentStatus,
        amountPaid: draft.amountPaid,
        orderTotal: draft.orderTotal,
        notes: order.notes || ""
      });

      showMessage("Рядок замовлення оновлено");
      await loadOrders(orderSearch, debtFilter, customerFilter);

      if (selectedOrder?.id === order.id) {
        await refreshSelectedOrderDetails(order.id);
      }
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function handleDeleteOrder(id) {
    if (!window.confirm("Видалити замовлення?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.deleteOrder(id);
      showMessage("Замовлення видалено");
      await loadOrders(orderSearch, debtFilter, customerFilter);
      await resetOrderForm();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleSaveOrderMaterials() {
    if (!selectedOrder) {
      showError("Спочатку створи або обери замовлення, а вже потім додавай матеріали.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const updated = await api.saveOrderMaterials(selectedOrder.id, orderMaterials);
      applyOrderDetails(updated);
      showMessage("Матеріали замовлення збережено");
      await loadOrders(orderSearch, debtFilter, customerFilter);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleStartOrder() {
    if (!selectedOrder) {
      showError("Спочатку обери замовлення, яке треба запустити в роботу.");
      return;
    }

    setError("");
    setMessage("");

    try {
      if (!hasOrderMaterials(orderMaterials) && String(selectedOrder.sofaName || "").trim()) {
        const templateMaterials = await api.getSofaMaterialTemplate(selectedOrder.sofaName, selectedOrder.id);

        if (templateMaterials.length) {
          setOrderMaterials(mapOrderMaterials(templateMaterials));
          showMessage("Для цього дивана підставлено матеріали з попереднього виробу. Перевір склад і запусти ще раз.");
          return;
        }
      }

      const alreadyStarted = Boolean(Number(selectedOrder.materialsWrittenOff));
      const started = await api.startOrder(selectedOrder.id);
      applyOrderDetails(started);
      showMessage(
        alreadyStarted
          ? "Замовлення вже було запущене раніше, списання матеріалів збережено"
          : "Замовлення запущено в роботу, матеріали списано"
      );
      await refreshAll();
    } catch (startError) {
      setError(startError.message);
    }
  }

  async function handlePrintRouteSheet() {
    if (!selectedOrder) {
      showError("Оберіть замовлення для друку маршрутного листа.");
      return;
    }

    try {
      const routeSheetData = await api.getRouteSheet(selectedOrder.id);
      await printRouteSheet(routeSheetData);
    } catch (printError) {
      setError(printError.message);
    }
  }

  async function handlePrintRouteSheetById(orderId) {
    try {
      printRouteSheet(await api.getRouteSheet(orderId));
    } catch (printError) {
      setError(printError.message);
    }
  }

  async function handlePrintQrById(orderId) {
    try {
      await printQrCodePage(await api.getRouteSheet(orderId));
    } catch (printError) {
      setError(printError.message);
    }
  }

  const lowStockCount = materials.filter((item) => Number(item.currentQuantity) <= Number(item.minQuantity)).length;
  const activeOrdersCount = orders.filter((item) => item.status === "В роботі").length;

  return (
    <div className="page page-crm">
      <header className="hero hero-crm">
        <div>
          <div className="brand-line">
            <span className="brand-mark" />
            <span>Prolisok</span>
          </div>
          <p className="eyebrow">CRM для складу та виробництва</p>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>{activeOrdersCount}</span>
            <p>Диванів у роботі</p>
          </div>
          <div className="stat-card">
            <span>{lowStockCount}</span>
            <p>Матеріалів нижче мінімуму</p>
          </div>
        </div>
      </header>

      <div className="tabs">
        <button className={view === "orders" ? "tab active" : "tab"} onClick={() => setView("orders")}>
          Замовлення
        </button>
        <button className={view === "warehouse" ? "tab active" : "tab"} onClick={() => setView("warehouse")}>
          Склад
        </button>
        <button className={view === "passports" ? "tab active" : "tab"} onClick={() => setView("passports")}>
          Дивани та паспорти
        </button>
      </div>

      {(message || error) && <div className={`alert ${error ? "error" : "success"}`}>{error || message}</div>}

      {view === "orders" ? (
        <main className="crm-layout orders-layout">
          <section className="panel crm-main">
            <div className="panel-header">
              <h2>Таблиця замовлень</h2>
              <div className="actions compact-actions">
                <button type="button" className="secondary" onClick={startNewOrder} title="Додати нове замовлення">
                  ＋ Нове замовлення
                </button>
              </div>
            </div>
            <div className="filters">
              <input
                value={orderSearch}
                onChange={(event) => handleOrderSearchChange(event.target.value)}
                placeholder="Швидкий пошук за прізвищем клієнта, диваном або номером"
              />
              <select value={debtFilter} onChange={(event) => handleDebtFilterChange(event.target.value)}>
                <option value="">Усі замовлення</option>
                <option value="withDebt">Тільки з боргом</option>
                <option value="paid">Без боргу</option>
              </select>
              <select value={customerFilter} onChange={(event) => handleCustomerFilterChange(event.target.value)}>
                <option value="">Усі замовники</option>
                {customers.map((customer) => (
                  <option
                    key={`filter-${customer.customerName}-${customer.customerPhone || ""}`}
                    value={customer.customerName}
                  >
                    {customer.customerName}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <div className="empty-state">Завантаження замовлень...</div>
            ) : (
              <OrdersTable
                orders={orders}
                selectedOrderId={selectedOrder?.id}
                onSelect={handleSelectOrder}
                onDelete={handleDeleteOrder}
                onPrintRoute={handlePrintRouteSheetById}
                onPrintQr={handlePrintQrById}
                onQuickUpdate={handleQuickUpdateOrder}
                statuses={statuses}
                paymentStatuses={paymentStatuses}
              />
            )}
          </section>

          <aside className="crm-sidebar">
            <section className="panel">
              <div className="panel-header">
                <h2>{selectedOrder ? "Редагування замовлення" : "Нове замовлення"}</h2>
                {selectedOrder ? (
                  <div className="actions compact-actions">
                    <button type="button" className="secondary" onClick={startNewOrder} title="Додати нове замовлення">
                      ＋
                    </button>
                  </div>
                ) : null}
              </div>
              <OrderForm
                formData={orderFormData}
                setFormData={setOrderFormData}
                statuses={statuses}
                paymentStatuses={paymentStatuses}
                customers={customers}
                onSubmit={handleSaveOrder}
                onReset={resetOrderForm}
                isEditing={Boolean(selectedOrder)}
              />
            </section>

            <section className="panel">
              <h2>Матеріали на диван</h2>
              <OrderMaterialsEditor
                materialsCatalog={materials}
                orderMaterials={orderMaterials}
                setOrderMaterials={setOrderMaterials}
                globalUsdRate={globalUsdRate}
                disabled={Boolean(selectedOrder && Number(selectedOrder.materialsWrittenOff))}
                onSave={handleSaveOrderMaterials}
                onStart={handleStartOrder}
                onPrint={handlePrintRouteSheet}
                canStart={Boolean(selectedOrder)}
              />
            </section>
          </aside>
        </main>
      ) : null}

      {view === "warehouse" ? (
        <main className="crm-layout">
          <section className="panel crm-main">
            <div className="panel-header">
              <h2>Складська таблиця</h2>
            </div>
            <div className="filters warehouse-topbar">
              <div className="rate-box">
                <label>
                  Курс долара
                  <input
                    type="number"
                    step="0.01"
                    value={globalUsdRate}
                    onChange={(event) => setGlobalUsdRate(event.target.value)}
                  />
                </label>
                <button type="button" className="primary" onClick={handleUsdRateSave}>
                  Зберегти курс
                </button>
              </div>
            </div>
            <FiltersBar categories={categories} filters={filters} onChange={handleFilterChange} />
            <MaterialsTable
              materials={materials}
              loading={loading}
              selectedMaterialId={selectedMaterial?.id}
              globalUsdRate={globalUsdRate}
              onSelect={handleSelectMaterial}
              onDelete={handleDeleteMaterial}
            />
          </section>

          <aside className="crm-sidebar">
            <section className="panel">
              <h2>{selectedMaterial ? "Редагування позиції" : "Нова позиція"}</h2>
              <MaterialForm
                categories={categories}
                units={units}
                formData={formData}
                globalUsdRate={globalUsdRate}
                setFormData={setFormData}
                onSubmit={handleSaveMaterial}
                onReset={resetMaterialForm}
                isEditing={Boolean(selectedMaterial)}
              />
            </section>

            <section className="panel">
              <h2>Прихід / витрата</h2>
              <TransactionPanel material={selectedMaterial} transactions={transactions} onSubmit={handleCreateTransaction} />
            </section>

            <section className="panel">
              <h2>Імпорт Excel</h2>
              <ImportPanel onCommitted={handleImportCommitted} />
            </section>
          </aside>
        </main>
      ) : null}

      {view === "passports" ? (
        <main className="crm-layout">
          <section className="panel crm-main">
            <div className="panel-header">
              <h2>Список диванів</h2>
            </div>
            <SofaPassportsTable
              rows={sofaPassports}
              selectedId={selectedSofaPassport?.id}
              onSelect={handleSelectSofaPassport}
            />
          </section>

          <aside className="crm-sidebar">
            <section className="panel">
              <h2>Паспорт дивана</h2>
              <SofaPassportForm
                formData={sofaPassportFormData}
                setFormData={setSofaPassportFormData}
                onSubmit={handleSaveSofaPassport}
                onDelete={handleDeleteSofaPassport}
                disabled={passportSaving}
              />
            </section>

            <section className="panel">
              <h2>Імпорт паспортів</h2>
              <SofaPassportImportPanel onCommitted={handleSofaPassportImported} />
            </section>
          </aside>
        </main>
      ) : null}
    </div>
  );
}
