import Database from '@tauri-apps/plugin-sql';
import { ResultItem } from '../components/StaffProfilesView';
import { RegisteredGuide, RegisteredDriver } from '../components/IdManagerView';
import { ManagerData } from '../components/AutoPyneIntro';
import { PaymentRates } from '../components/PaymentsDetailsModal';

export const SQLITE_DB_NAME = 'sqlite:agm_travel.db';

export interface PaginatedQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
  guide?: string;
  driver?: string;
  company?: string;
  year?: string;
  month?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SettledPaymentSqlRow {
  id: string;
  entity_type: string;
  entity_name: string;
  period_key: string;
  amount_dh: number;
  trips_count: number;
  settled_at: string;
  settled_by: string;
  receipt_number: string;
  notes?: string;
  created_at?: string;
}

// Check if running inside native Tauri runtime
export function isTauriEnvironment(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(
      (window as any).__TAURI_INTERNALS__ || 
      (window as any).__TAURI__ || 
      (window as any).__TAURI_IPC__
    );
  } catch {
    return false;
  }
}

let tauriDbInstance: any = null;
let isInitialized = false;

// Fallback in-memory / persistent Web SQL store for browser preview
class WebSqliteEngine {
  private trips: Map<number, ResultItem> = new Map();
  private guides: Map<string, RegisteredGuide> = new Map();
  private drivers: Map<string, RegisteredDriver> = new Map();
  private managers: Map<string, ManagerData> = new Map();
  private paymentRates: PaymentRates = {
    guideDailyRate: 100,
    bigVanDriverDailyRate: 100,
    miniVanDriverDailyRate: 75,
    defaultCompanyBigVanRate: 700,
    defaultCompanyMiniVanRate: 500,
    quadUnitRate: 150,
    camelUnitRate: 100,
    customCompanyRates: []
  };
  private settledPayments: Map<string, SettledPaymentSqlRow> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const savedTrips = localStorage.getItem('agm_sqlite_trips');
      if (savedTrips) {
        const arr: ResultItem[] = JSON.parse(savedTrips);
        arr.forEach(t => this.trips.set(t.id, t));
      }
      const savedGuides = localStorage.getItem('agm_sqlite_guides');
      if (savedGuides) {
        const arr: RegisteredGuide[] = JSON.parse(savedGuides);
        arr.forEach(g => this.guides.set(g.id, g));
      }
      const savedDrivers = localStorage.getItem('agm_sqlite_drivers');
      if (savedDrivers) {
        const arr: RegisteredDriver[] = JSON.parse(savedDrivers);
        arr.forEach(d => this.drivers.set(d.id, d));
      }
      const savedManagers = localStorage.getItem('agm_sqlite_managers');
      if (savedManagers) {
        const arr: ManagerData[] = JSON.parse(savedManagers);
        arr.forEach(m => this.managers.set(m.id, m));
      }
      const savedRates = localStorage.getItem('agm_sqlite_rates');
      if (savedRates) {
        this.paymentRates = JSON.parse(savedRates);
      }
      const savedSettlements = localStorage.getItem('agm_sqlite_settlements');
      if (savedSettlements) {
        const arr: SettledPaymentSqlRow[] = JSON.parse(savedSettlements);
        arr.forEach(s => this.settledPayments.set(s.id, s));
      }
    } catch (e) {
      console.warn('WebSqliteEngine load notice:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem('agm_sqlite_trips', JSON.stringify(Array.from(this.trips.values())));
      localStorage.setItem('agm_sqlite_guides', JSON.stringify(Array.from(this.guides.values())));
      localStorage.setItem('agm_sqlite_drivers', JSON.stringify(Array.from(this.drivers.values())));
      localStorage.setItem('agm_sqlite_managers', JSON.stringify(Array.from(this.managers.values())));
      localStorage.setItem('agm_sqlite_rates', JSON.stringify(this.paymentRates));
      localStorage.setItem('agm_sqlite_settlements', JSON.stringify(Array.from(this.settledPayments.values())));
    } catch (e) {
      console.warn('WebSqliteEngine persist notice:', e);
    }
  }

  public getTrips(params?: PaginatedQueryParams): PaginatedResult<ResultItem> {
    let list = Array.from(this.trips.values());

    if (params?.date) {
      list = list.filter(t => t.date === params.date);
    }
    if (params?.guide) {
      const g = params.guide.toLowerCase();
      list = list.filter(t => (t.guide || '').toLowerCase().includes(g));
    }
    if (params?.driver) {
      const d = params.driver.toLowerCase();
      list = list.filter(t => (t.driver || '').toLowerCase().includes(d));
    }
    if (params?.company) {
      const c = params.company.toLowerCase();
      list = list.filter(t => (t.company || '').toLowerCase().includes(c));
    }
    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(t =>
        (t.guide || '').toLowerCase().includes(q) ||
        (t.driver || '').toLowerCase().includes(q) ||
        (t.company || '').toLowerCase().includes(q) ||
        (t.pax || '').includes(q) ||
        (t.date || '').includes(q) ||
        (t.time || '').includes(q)
      );
    }

    // Sort by id DESC (newest first)
    list.sort((a, b) => b.id - a.id);

    const total = list.length;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || total || 50);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const data = list.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages };
  }

  public getAllTrips(): ResultItem[] {
    return Array.from(this.trips.values());
  }

  public insertTrip(trip: ResultItem) {
    const id = trip.id || Date.now() + Math.floor(Math.random() * 1000);
    this.trips.set(id, { ...trip, id });
    this.persist();
  }

  public updateTrip(trip: ResultItem) {
    this.trips.set(trip.id, trip);
    this.persist();
  }

  public deleteTrip(id: number) {
    this.trips.delete(id);
    this.persist();
  }

  public bulkInsertTrips(trips: ResultItem[]) {
    trips.forEach(t => {
      const id = t.id || Date.now() + Math.floor(Math.random() * 100000);
      this.trips.set(id, { ...t, id });
    });
    this.persist();
  }

  public getGuides(): RegisteredGuide[] {
    return Array.from(this.guides.values());
  }

  public upsertGuide(guide: RegisteredGuide) {
    this.guides.set(guide.id, guide);
    this.persist();
  }

  public deleteGuide(id: string) {
    this.guides.delete(id);
    this.persist();
  }

  public getDrivers(): RegisteredDriver[] {
    return Array.from(this.drivers.values());
  }

  public upsertDriver(driver: RegisteredDriver) {
    this.drivers.set(driver.id, driver);
    this.persist();
  }

  public deleteDriver(id: string) {
    this.drivers.delete(id);
    this.persist();
  }

  public getManagers(): ManagerData[] {
    return Array.from(this.managers.values());
  }

  public upsertManager(manager: ManagerData) {
    this.managers.set(manager.id, manager);
    this.persist();
  }

  public deleteManager(id: string) {
    this.managers.delete(id);
    this.persist();
  }

  public getPaymentRates(): PaymentRates {
    return this.paymentRates;
  }

  public savePaymentRates(rates: PaymentRates) {
    this.paymentRates = { ...rates };
    this.persist();
  }

  public getSettledPayments(): SettledPaymentSqlRow[] {
    return Array.from(this.settledPayments.values());
  }

  public insertSettledPayment(record: SettledPaymentSqlRow) {
    this.settledPayments.set(record.id, record);
    this.persist();
  }

  public deleteSettledPayment(id: string) {
    this.settledPayments.delete(id);
    this.persist();
  }
}

const webSqliteInstance = new WebSqliteEngine();

/**
 * Connects to SQLite and creates all necessary schema tables and indexes.
 */
export async function getSqliteDb(): Promise<any> {
  if (isTauriEnvironment()) {
    if (!tauriDbInstance) {
      try {
        tauriDbInstance = await Database.load(SQLITE_DB_NAME);
      } catch (err) {
        console.warn('Tauri SQLite plugin load failed, using fallback:', err);
      }
    }
    return tauriDbInstance;
  }
  return null;
}

/**
 * Initializes the embedded SQLite database on app startup:
 * - Creates tables: trips, registered_guides, registered_drivers, managers, payment_rates, settled_payments, schema_migrations
 * - Creates performance indexes on date, guide, driver, company
 * - Auto-migrates legacy localStorage / database.json data if SQLite is fresh
 */
export async function initSqliteDatabase(): Promise<void> {
  if (isInitialized) return;

  const db = await getSqliteDb();

  if (db) {
    try {
      // 1. Trips Table & Indexes
      await db.execute(`
        CREATE TABLE IF NOT EXISTS trips (
          id INTEGER PRIMARY KEY,
          van_type TEXT NOT NULL DEFAULT 'Big van',
          guide TEXT NOT NULL DEFAULT '',
          driver TEXT NOT NULL DEFAULT '',
          company TEXT NOT NULL DEFAULT 'AGM',
          pax TEXT NOT NULL DEFAULT '0',
          quads TEXT NOT NULL DEFAULT '0',
          camels TEXT NOT NULL DEFAULT '0',
          person_extra TEXT DEFAULT 'None',
          quad_extra TEXT DEFAULT 'None',
          camel_extra TEXT DEFAULT 'None',
          extra_payment TEXT DEFAULT '0 DH',
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          drivers_list TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_trips_guide ON trips(guide);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_trips_company ON trips(company);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips(date, time);`);

      // 2. Registered Guides Table & Index
      await db.execute(`
        CREATE TABLE IF NOT EXISTS registered_guides (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          nickname TEXT,
          phone TEXT,
          dates_worked TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_guides_name ON registered_guides(name);`);

      // 3. Registered Drivers Table & Indexes
      await db.execute(`
        CREATE TABLE IF NOT EXISTS registered_drivers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          van_type TEXT DEFAULT 'Big van',
          company_name TEXT DEFAULT 'AGM',
          phone TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_drivers_name ON registered_drivers(name);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_drivers_company ON registered_drivers(company_name);`);

      // 4. Managers Table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS managers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          lastname TEXT,
          school_level TEXT,
          skill TEXT,
          started_from TEXT,
          email TEXT,
          employee_id TEXT,
          pin TEXT,
          status TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // 5. Payment Rates Table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS payment_rates (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // 6. Settled Payments Table & Indexes
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settled_payments (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          period_key TEXT NOT NULL,
          amount_dh REAL NOT NULL,
          trips_count INTEGER DEFAULT 0,
          settled_at TEXT NOT NULL,
          settled_by TEXT NOT NULL,
          receipt_number TEXT NOT NULL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_settled_entity ON settled_payments(entity_type, entity_name);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_settled_period ON settled_payments(period_key);`);

      // 7. Migrations Tracking
      await db.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // Check if existing data needs initial migration into SQLite
      await migrateInitialDataIfFresh(db);

    } catch (e) {
      console.error('Failed to initialize Tauri SQLite schema:', e);
    }
  } else {
    // Web SQLite engine initialization
    await migrateInitialDataIfFresh(null);
  }

  isInitialized = true;
}

/**
 * Helper to migrate legacy localStorage / database.json data into SQLite if tables are fresh.
 */
async function migrateInitialDataIfFresh(db: any): Promise<void> {
  try {
    let tripCount = 0;
    if (db) {
      const res: any[] = await db.select('SELECT COUNT(*) as count FROM trips');
      tripCount = res?.[0]?.count || 0;
    } else {
      tripCount = webSqliteInstance.getAllTrips().length;
    }

    if (tripCount === 0) {
      // Check localStorage for old records
      const legacyTrips = localStorage.getItem('agm_results');
      if (legacyTrips) {
        const trips: ResultItem[] = JSON.parse(legacyTrips);
        if (Array.isArray(trips) && trips.length > 0) {
          await bulkInsertTripsSql(trips);
        }
      }

      const legacyGuides = localStorage.getItem('agm_registered_guides');
      if (legacyGuides) {
        const guides: RegisteredGuide[] = JSON.parse(legacyGuides);
        if (Array.isArray(guides)) {
          for (const g of guides) {
            await upsertGuideSql(g);
          }
        }
      }

      const legacyDrivers = localStorage.getItem('agm_registered_drivers');
      if (legacyDrivers) {
        const drivers: RegisteredDriver[] = JSON.parse(legacyDrivers);
        if (Array.isArray(drivers)) {
          for (const d of drivers) {
            await upsertDriverSql(d);
          }
        }
      }

      const legacyManagers = localStorage.getItem('agm_managers');
      if (legacyManagers) {
        const managers: ManagerData[] = JSON.parse(legacyManagers);
        if (Array.isArray(managers)) {
          for (const m of managers) {
            await upsertManagerSql(m);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Initial data migration check notice:', err);
  }
}

/**
 * Executes a paginated SQL query on the trips table with LIMIT and OFFSET
 */
export async function queryTripsWithPaginationSql(params: PaginatedQueryParams): Promise<PaginatedResult<ResultItem>> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];

      if (params.date) {
        whereClause += ' AND date = ?';
        queryParams.push(params.date);
      }
      if (params.guide) {
        whereClause += ' AND LOWER(guide) LIKE ?';
        queryParams.push(`%${params.guide.toLowerCase()}%`);
      }
      if (params.driver) {
        whereClause += ' AND LOWER(driver) LIKE ?';
        queryParams.push(`%${params.driver.toLowerCase()}%`);
      }
      if (params.company) {
        whereClause += ' AND LOWER(company) LIKE ?';
        queryParams.push(`%${params.company.toLowerCase()}%`);
      }
      if (params.search) {
        const searchPattern = `%${params.search.trim().toLowerCase()}%`;
        whereClause += ' AND (LOWER(guide) LIKE ? OR LOWER(driver) LIKE ? OR LOWER(company) LIKE ? OR pax LIKE ? OR date LIKE ? OR time LIKE ?)';
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // 1. Total Count Query
      const countSql = `SELECT COUNT(*) as count FROM trips ${whereClause};`;
      const countRes: any[] = await db.select(countSql, queryParams);
      const total = countRes?.[0]?.count || 0;

      const page = Math.max(1, params.page || 1);
      const limit = Math.max(1, params.limit || 50);
      const offset = (page - 1) * limit;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      // 2. Paginated Data Query with LIMIT and OFFSET
      const selectSql = `SELECT * FROM trips ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?;`;
      const rows: any[] = await db.select(selectSql, [...queryParams, limit, offset]);

      const data: ResultItem[] = rows.map((row: any) => ({
        id: Number(row.id),
        van_type: row.van_type,
        guide: row.guide,
        driver: row.driver,
        company: row.company,
        pax: String(row.pax),
        quads: String(row.quads),
        camels: String(row.camels),
        person_extra: row.person_extra,
        quad_extra: row.quad_extra,
        camel_extra: row.camel_extra,
        extra_payment: row.extra_payment,
        date: row.date,
        time: row.time,
        driversList: row.drivers_list ? JSON.parse(row.drivers_list) : undefined
      }));

      return { data, total, page, limit, totalPages };
    } catch (err) {
      console.warn('Native SQLite pagination failed, using web engine fallback:', err);
    }
  }

  return webSqliteInstance.getTrips(params);
}

/**
 * Returns all trips from the SQLite database
 */
export async function getAllTripsSql(): Promise<ResultItem[]> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      const rows: any[] = await db.select('SELECT * FROM trips ORDER BY date ASC, time ASC, id ASC;');
      return rows.map((row: any) => ({
        id: Number(row.id),
        van_type: row.van_type,
        guide: row.guide,
        driver: row.driver,
        company: row.company,
        pax: String(row.pax),
        quads: String(row.quads),
        camels: String(row.camels),
        person_extra: row.person_extra,
        quad_extra: row.quad_extra,
        camel_extra: row.camel_extra,
        extra_payment: row.extra_payment,
        date: row.date,
        time: row.time,
        driversList: row.drivers_list ? JSON.parse(row.drivers_list) : undefined
      }));
    } catch (err) {
      console.warn('Native SQLite getAllTrips failed, using web engine fallback:', err);
    }
  }

  return webSqliteInstance.getAllTrips();
}

/**
 * Inserts a new trip record into SQLite
 */
export async function insertTripSql(trip: ResultItem): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  const id = trip.id || Date.now();
  const driversListJson = trip.driversList ? JSON.stringify(trip.driversList) : null;

  if (db) {
    try {
      await db.execute(`
        INSERT INTO trips (
          id, van_type, guide, driver, company, pax, quads, camels,
          person_extra, quad_extra, camel_extra, extra_payment,
          date, time, drivers_list, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, datetime('now'));
      `, [
        id,
        trip.van_type || 'Big van',
        trip.guide || '',
        trip.driver || '',
        trip.company || 'AGM',
        String(trip.pax || '0'),
        String(trip.quads || '0'),
        String(trip.camels || '0'),
        trip.person_extra || 'None',
        trip.quad_extra || 'None',
        trip.camel_extra || 'None',
        trip.extra_payment || '0 DH',
        trip.date || '',
        trip.time || '',
        driversListJson
      ]);
      return;
    } catch (err) {
      console.warn('Native SQLite insertTrip failed, using web engine fallback:', err);
    }
  }

  webSqliteInstance.insertTrip({ ...trip, id });
}

/**
 * Updates an existing trip record in SQLite
 */
export async function updateTripSql(trip: ResultItem): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  const driversListJson = trip.driversList ? JSON.stringify(trip.driversList) : null;

  if (db) {
    try {
      await db.execute(`
        UPDATE trips SET
          van_type = $1,
          guide = $2,
          driver = $3,
          company = $4,
          pax = $5,
          quads = $6,
          camels = $7,
          person_extra = $8,
          quad_extra = $9,
          camel_extra = $10,
          extra_payment = $11,
          date = $12,
          time = $13,
          drivers_list = $14,
          updated_at = datetime('now')
        WHERE id = $15;
      `, [
        trip.van_type || 'Big van',
        trip.guide || '',
        trip.driver || '',
        trip.company || 'AGM',
        String(trip.pax || '0'),
        String(trip.quads || '0'),
        String(trip.camels || '0'),
        trip.person_extra || 'None',
        trip.quad_extra || 'None',
        trip.camel_extra || 'None',
        trip.extra_payment || '0 DH',
        trip.date || '',
        trip.time || '',
        driversListJson,
        trip.id
      ]);
      return;
    } catch (err) {
      console.warn('Native SQLite updateTrip failed, using web engine fallback:', err);
    }
  }

  webSqliteInstance.updateTrip(trip);
}

/**
 * Deletes a trip from SQLite by its ID
 */
export async function deleteTripSql(id: number): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      await db.execute('DELETE FROM trips WHERE id = $1;', [id]);
      return;
    } catch (err) {
      console.warn('Native SQLite deleteTrip failed, using web engine fallback:', err);
    }
  }

  webSqliteInstance.deleteTrip(id);
}

/**
 * Bulk inserts multiple trips into SQLite inside a transaction
 */
export async function bulkInsertTripsSql(trips: ResultItem[]): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      for (const trip of trips) {
        const id = trip.id || Date.now() + Math.floor(Math.random() * 100000);
        const driversListJson = trip.driversList ? JSON.stringify(trip.driversList) : null;
        await db.execute(`
          INSERT OR REPLACE INTO trips (
            id, van_type, guide, driver, company, pax, quads, camels,
            person_extra, quad_extra, camel_extra, extra_payment,
            date, time, drivers_list, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, datetime('now'));
        `, [
          id,
          trip.van_type || 'Big van',
          trip.guide || '',
          trip.driver || '',
          trip.company || 'AGM',
          String(trip.pax || '0'),
          String(trip.quads || '0'),
          String(trip.camels || '0'),
          trip.person_extra || 'None',
          trip.quad_extra || 'None',
          trip.camel_extra || 'None',
          trip.extra_payment || '0 DH',
          trip.date || '',
          trip.time || '',
          driversListJson
        ]);
      }
      return;
    } catch (err) {
      console.warn('Native SQLite bulkInsertTrips failed, using web engine fallback:', err);
    }
  }

  webSqliteInstance.bulkInsertTrips(trips);
}

/**
 * Guides SQL Operations
 */
export async function getGuidesSql(): Promise<RegisteredGuide[]> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      const rows: any[] = await db.select('SELECT * FROM registered_guides ORDER BY name ASC;');
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        nickname: r.nickname || undefined,
        phone: r.phone || undefined,
        status: r.is_active ? 'Active' : 'Inactive'
      }));
    } catch (err) {
      console.warn('Native SQLite getGuides failed, using web engine fallback:', err);
    }
  }
  return webSqliteInstance.getGuides();
}

export async function upsertGuideSql(guide: RegisteredGuide): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO registered_guides (id, name, nickname, phone, is_active)
        VALUES ($1, $2, $3, $4, $5);
      `, [guide.id, guide.name, guide.nickname || null, guide.phone || null, guide.status !== 'Inactive' ? 1 : 0]);
      return;
    } catch (err) {
      console.warn('Native SQLite upsertGuide failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.upsertGuide(guide);
}

export async function deleteGuideSql(id: string): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      await db.execute('DELETE FROM registered_guides WHERE id = $1;', [id]);
      return;
    } catch (err) {
      console.warn('Native SQLite deleteGuide failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.deleteGuide(id);
}

/**
 * Drivers SQL Operations
 */
export async function getDriversSql(): Promise<RegisteredDriver[]> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      const rows: any[] = await db.select('SELECT * FROM registered_drivers ORDER BY name ASC;');
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        vanType: r.van_type || 'Big van',
        companyName: r.company_name || 'AGM',
        phone: r.phone || undefined,
        status: r.is_active ? 'Active' : 'Inactive'
      }));
    } catch (err) {
      console.warn('Native SQLite getDrivers failed, using web engine fallback:', err);
    }
  }
  return webSqliteInstance.getDrivers();
}

export async function upsertDriverSql(driver: RegisteredDriver): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO registered_drivers (id, name, van_type, company_name, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [driver.id || driver.name, driver.name, driver.vanType || 'Big van', driver.companyName || 'AGM', driver.phone || null, driver.status !== 'Inactive' ? 1 : 0]);
      return;
    } catch (err) {
      console.warn('Native SQLite upsertDriver failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.upsertDriver(driver);
}

export async function deleteDriverSql(id: string): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      await db.execute('DELETE FROM registered_drivers WHERE id = $1;', [id]);
      return;
    } catch (err) {
      console.warn('Native SQLite deleteDriver failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.deleteDriver(id);
}

/**
 * Managers SQL Operations
 */
export async function getManagersSql(): Promise<ManagerData[]> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      const rows: any[] = await db.select('SELECT * FROM managers ORDER BY name ASC;');
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        lastname: r.lastname || '',
        schoolLevel: r.school_level || '',
        skill: r.skill || '',
        startedFrom: r.started_from || '',
        email: r.email || '',
        employeeId: r.employee_id || '',
        paymentPin: r.pin || undefined,
        status: r.status || 'Active'
      }));
    } catch (err) {
      console.warn('Native SQLite getManagers failed, using web engine fallback:', err);
    }
  }
  return webSqliteInstance.getManagers();
}

export async function upsertManagerSql(manager: ManagerData): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO managers (id, name, lastname, school_level, skill, started_from, email, employee_id, pin, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `, [
        manager.id,
        manager.name,
        manager.lastname || '',
        manager.schoolLevel || '',
        manager.skill || '',
        manager.startedFrom || '',
        manager.email || '',
        manager.employeeId || '',
        manager.paymentPin || null,
        manager.status || 'Active'
      ]);
      return;
    } catch (err) {
      console.warn('Native SQLite upsertManager failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.upsertManager(manager);
}

export async function deleteManagerSql(id: string): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      await db.execute('DELETE FROM managers WHERE id = $1;', [id]);
      return;
    } catch (err) {
      console.warn('Native SQLite deleteManager failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.deleteManager(id);
}

/**
 * Payment Rates SQL Operations
 */
export async function getPaymentRatesSql(): Promise<PaymentRates> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      const rows: any[] = await db.select('SELECT key, value FROM payment_rates;');
      if (rows && rows.length > 0) {
        const obj: any = {};
        rows.forEach((r: any) => {
          try {
            obj[r.key] = JSON.parse(r.value);
          } catch {
            obj[r.key] = r.value;
          }
        });
        return obj as PaymentRates;
      }
    } catch (err) {
      console.warn('Native SQLite getPaymentRates failed, using web engine fallback:', err);
    }
  }
  return webSqliteInstance.getPaymentRates();
}

export async function savePaymentRatesSql(rates: PaymentRates): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      for (const [k, v] of Object.entries(rates)) {
        await db.execute(`
          INSERT OR REPLACE INTO payment_rates (key, value) VALUES ($1, $2);
        `, [k, JSON.stringify(v)]);
      }
      return;
    } catch (err) {
      console.warn('Native SQLite savePaymentRates failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.savePaymentRates(rates);
}

/**
 * Settled Payments SQL Operations
 */
export async function getSettledPaymentsSql(): Promise<SettledPaymentSqlRow[]> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      const rows: any[] = await db.select('SELECT * FROM settled_payments ORDER BY settled_at DESC;');
      return rows.map((r: any) => ({
        id: r.id,
        entity_type: r.entity_type,
        entity_name: r.entity_name,
        period_key: r.period_key,
        amount_dh: Number(r.amount_dh),
        trips_count: Number(r.trips_count || 0),
        settled_at: r.settled_at,
        settled_by: r.settled_by,
        receipt_number: r.receipt_number,
        notes: r.notes || undefined,
        created_at: r.created_at
      }));
    } catch (err) {
      console.warn('Native SQLite getSettledPayments failed, using web engine fallback:', err);
    }
  }
  return webSqliteInstance.getSettledPayments();
}

export async function insertSettledPaymentSql(record: SettledPaymentSqlRow): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();

  if (db) {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO settled_payments (
          id, entity_type, entity_name, period_key, amount_dh,
          trips_count, settled_at, settled_by, receipt_number, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `, [
        record.id,
        record.entity_type,
        record.entity_name,
        record.period_key,
        record.amount_dh,
        record.trips_count || 0,
        record.settled_at,
        record.settled_by,
        record.receipt_number,
        record.notes || null
      ]);
      return;
    } catch (err) {
      console.warn('Native SQLite insertSettledPayment failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.insertSettledPayment(record);
}

export async function deleteSettledPaymentSql(id: string): Promise<void> {
  await initSqliteDatabase();
  const db = await getSqliteDb();
  if (db) {
    try {
      await db.execute('DELETE FROM settled_payments WHERE id = $1;', [id]);
      return;
    } catch (err) {
      console.warn('Native SQLite deleteSettledPayment failed, using web engine fallback:', err);
    }
  }
  webSqliteInstance.deleteSettledPayment(id);
}
