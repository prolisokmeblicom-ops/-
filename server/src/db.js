import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dbFile = path.join(dataDir, "warehouse.db");

let dbInstance;

async function ensureColumn(db, tableName, columnName, definition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbFile,
      driver: sqlite3.Database
    });
  }

  return dbInstance;
}

export async function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await getDb();

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      current_quantity REAL NOT NULL DEFAULT 0,
      min_quantity REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UAH',
      usd_rate REAL NOT NULL DEFAULT 0,
      location TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      sofa_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Нове',
      received_date TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      cutter_name TEXT DEFAULT '',
      sewing_name TEXT DEFAULT '',
      upholstery_name TEXT DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'Борг',
      amount_paid REAL NOT NULL DEFAULT 0,
      order_total REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      materials_written_off INTEGER NOT NULL DEFAULT 0,
      started_at TEXT DEFAULT '',
      completed_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sofa_passports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sofa_name TEXT NOT NULL,
      model_name TEXT DEFAULT '',
      passport_number TEXT DEFAULT '',
      article TEXT DEFAULT '',
      size TEXT DEFAULT '',
      frame_material TEXT DEFAULT '',
      filling TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, "materials", "unit_cost", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "materials", "currency", "TEXT NOT NULL DEFAULT 'UAH'");
  await ensureColumn(db, "materials", "usd_rate", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "orders", "received_date", "TEXT DEFAULT ''");
  await ensureColumn(db, "orders", "cutter_name", "TEXT DEFAULT ''");
  await ensureColumn(db, "orders", "sewing_name", "TEXT DEFAULT ''");
  await ensureColumn(db, "orders", "upholstery_name", "TEXT DEFAULT ''");
  await ensureColumn(db, "orders", "payment_status", "TEXT NOT NULL DEFAULT 'Борг'");
  await ensureColumn(db, "orders", "amount_paid", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "orders", "order_total", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "orders", "access_code", "TEXT DEFAULT ''");
  await ensureColumn(db, "sofa_passports", "size", "TEXT DEFAULT ''");
  await ensureColumn(db, "sofa_passports", "frame_material", "TEXT DEFAULT ''");
  await ensureColumn(db, "sofa_passports", "filling", "TEXT DEFAULT ''");

  const categories = ["Тканина", "Поролон", "Дерево", "Фурнітура", "Інше"];
  const units = ["м", "кг", "лист", "шт", "упак"];

  for (const name of categories) {
    await db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [name]);
  }

  for (const name of units) {
    await db.run("INSERT OR IGNORE INTO units (name) VALUES (?)", [name]);
  }

  await db.run(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('usd_rate', '0')"
  );
}
