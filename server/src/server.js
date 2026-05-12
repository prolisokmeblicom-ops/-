import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initDatabase } from "./db.js";
import {
  listCategories,
  listUnits,
  listMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createTransaction,
  getUsdRate,
  listTransactionsByMaterial,
  importMaterials,
  updateUsdRate
} from "./services/materialService.js";
import { normalizeImportRows, previewImportFile } from "./services/importService.js";
import {
  createOrder,
  deleteOrder,
  getOrderById,
  getNextOrderNumber,
  getPaymentStatuses,
  getOrderStatuses,
  getRouteSheet,
  getRouteSheetByOrderNumber,
  getSofaMaterialTemplate,
  listCustomers,
  verifyRouteSheetAccess,
  listOrders,
  replaceOrderMaterials,
  startOrder,
  updateOrder
} from "./services/orderService.js";
import {
  deleteSofaPassport,
  getSofaPassportById,
  importSofaPassports,
  listSofaPassports,
  normalizeSofaPassportRows,
  previewSofaPassportImport,
  updateSofaPassport
} from "./services/sofaPassportService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, message: "Warehouse API працює" });
});

app.get("/api/categories", async (_req, res) => {
  res.json(await listCategories());
});

app.get("/api/units", async (_req, res) => {
  res.json(await listUnits());
});

app.get("/api/order-statuses", async (_req, res) => {
  res.json(getOrderStatuses());
});

app.get("/api/payment-statuses", async (_req, res) => {
  res.json(getPaymentStatuses());
});

app.get("/api/customers", async (_req, res) => {
  res.json(await listCustomers());
});

app.get("/api/orders-next-number", async (_req, res) => {
  res.json({ orderNumber: await getNextOrderNumber() });
});

app.get("/api/sofa-material-template", async (req, res) => {
  try {
    res.json(await getSofaMaterialTemplate(req.query.sofaName || "", req.query.excludeOrderId || null));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/materials", async (req, res) => {
  res.json(await listMaterials(req.query));
});

app.get("/api/usd-rate", async (_req, res) => {
  res.json({ usdRate: await getUsdRate() });
});

app.put("/api/usd-rate", async (req, res) => {
  try {
    res.json({ usdRate: await updateUsdRate(req.body.usdRate) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/materials/:id", async (req, res) => {
  const material = await getMaterialById(Number(req.params.id));

  if (!material) {
    return res.status(404).json({ message: "Матеріал не знайдено" });
  }

  res.json(material);
});

app.post("/api/materials", async (req, res) => {
  try {
    res.status(201).json(await createMaterial(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/materials/:id", async (req, res) => {
  try {
    res.json(await updateMaterial(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/materials/:id", async (req, res) => {
  try {
    await deleteMaterial(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/materials/:id/transactions", async (req, res) => {
  res.json(await listTransactionsByMaterial(Number(req.params.id)));
});

app.post("/api/transactions", async (req, res) => {
  try {
    res.status(201).json(await createTransaction(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/import/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Файл не завантажено" });
    }

    res.json(await previewImportFile(req.file.buffer));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/import/commit", async (req, res) => {
  try {
    const rows = req.body.rawRows
      ? normalizeImportRows(req.body.rawRows || [], req.body.mapping || {})
      : req.body.rows || [];

    res.status(201).json(await importMaterials(rows));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/sofa-passports", async (_req, res) => {
  res.json(await listSofaPassports());
});

app.get("/api/sofa-passports/:id", async (req, res) => {
  const passport = await getSofaPassportById(Number(req.params.id));

  if (!passport) {
    return res.status(404).json({ message: "Паспорт дивана не знайдено" });
  }

  res.json(passport);
});

app.put("/api/sofa-passports/:id", async (req, res) => {
  try {
    res.json(await updateSofaPassport(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/sofa-passports/:id", async (req, res) => {
  try {
    await deleteSofaPassport(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/sofa-passports/import/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Файл не завантажено" });
    }

    res.json(await previewSofaPassportImport(req.file.buffer));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/sofa-passports/import/commit", async (req, res) => {
  try {
    const rows = req.body.rawRows
      ? normalizeSofaPassportRows(req.body.rawRows || [], req.body.mapping || {})
      : req.body.rows || [];

    res.status(201).json(await importSofaPassports(rows));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/orders", async (req, res) => {
  res.json(await listOrders(req.query));
});

app.get("/api/orders/:id", async (req, res) => {
  const order = await getOrderById(Number(req.params.id));

  if (!order) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }

  res.json(order);
});

app.post("/api/orders", async (req, res) => {
  try {
    res.status(201).json(await createOrder(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    res.json(await updateOrder(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    await deleteOrder(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/orders/:id/materials", async (req, res) => {
  try {
    res.json(await replaceOrderMaterials(Number(req.params.id), req.body.materials || []));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/orders/:id/start", async (req, res) => {
  try {
    res.json(await startOrder(Number(req.params.id)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/orders/:id/route-sheet", async (req, res) => {
  try {
    res.json(await getRouteSheet(Number(req.params.id)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/public/route-sheet/:orderNumber", async (req, res) => {
  try {
    res.json(await getRouteSheetByOrderNumber(req.params.orderNumber));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/public/route-sheet/:orderNumber/verify", async (req, res) => {
  try {
    res.json(await verifyRouteSheetAccess(req.params.orderNumber, req.body.accessCode));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Внутрішня помилка сервера" });
});

initDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server started on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
