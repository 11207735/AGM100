import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ResultItem } from '../components/StaffProfilesView';
import { RegisteredGuide, RegisteredDriver } from '../components/IdManagerView';
import { ManagerData } from '../components/AutoPyneIntro';
import { PaymentRates } from '../components/PaymentsDetailsModal';
import {
  initSqliteDatabase,
  queryTripsWithPaginationSql,
  getAllTripsSql,
  insertTripSql,
  updateTripSql,
  deleteTripSql,
  bulkInsertTripsSql,
  getGuidesSql,
  upsertGuideSql,
  deleteGuideSql,
  getDriversSql,
  upsertDriverSql,
  deleteDriverSql,
  getManagersSql,
  upsertManagerSql,
  deleteManagerSql,
  getPaymentRatesSql,
  savePaymentRatesSql,
  getSettledPaymentsSql,
  insertSettledPaymentSql,
  deleteSettledPaymentSql,
  PaginatedQueryParams,
  PaginatedResult
} from './sqliteDb';

// Re-export all SQLite methods for seamless consumer imports
export {
  initSqliteDatabase,
  queryTripsWithPaginationSql,
  getAllTripsSql,
  insertTripSql,
  updateTripSql,
  deleteTripSql,
  bulkInsertTripsSql,
  getGuidesSql,
  upsertGuideSql,
  deleteGuideSql,
  getDriversSql,
  upsertDriverSql,
  deleteDriverSql,
  getManagersSql,
  upsertManagerSql,
  deleteManagerSql,
  getPaymentRatesSql,
  savePaymentRatesSql,
  getSettledPaymentsSql,
  insertSettledPaymentSql,
  deleteSettledPaymentSql
};
export type { PaginatedQueryParams, PaginatedResult };

export interface AgmRestoreResult {
  trips: ResultItem[];
  guides: RegisteredGuide[];
  drivers: RegisteredDriver[];
  managers: ManagerData[];
  paymentRates?: PaymentRates;
  inactiveStaff?: Record<string, any>;
  timestamp: string;
  source: string;
  totalTripsCount: number;
  totalGuidesCount: number;
  totalDriversCount: number;
}

export const MONTH_FULL_NAMES: Record<string, string> = {
  '01': '01-January',
  '02': '02-February',
  '03': '03-March',
  '04': '04-April',
  '05': '05-May',
  '06': '06-June',
  '07': '07-July',
  '08': '08-August',
  '09': '09-September',
  '10': '10-October',
  '11': '11-November',
  '12': '12-December'
};

export const MONTH_NAME_ONLY: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December'
};

// Date parsing helper
export function parseDate(dStr?: string) {
  const today = new Date();
  let day = today.getDate();
  let month = today.getMonth() + 1;
  let year = today.getFullYear();

  if (dStr) {
    const clean = dStr.trim();
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10) || year;
        month = parseInt(parts[1], 10) || month;
        day = parseInt(parts[2], 10) || day;
      } else {
        day = parseInt(parts[0], 10) || day;
        month = parseInt(parts[1], 10) || month;
        year = parseInt(parts[2], 10) || year;
      }
    }
  }

  const rawDay = String(day).padStart(2, '0');
  const rawMonth = String(month).padStart(2, '0');
  const rawYear = String(year);
  const fullDate = `${rawDay}-${rawMonth}-${rawYear}`;

  return { day, month, year, rawDay, rawMonth, rawYear, fullDate };
}

// Extra payment formatting helper
function getPersonPay(r: ResultItem): string {
  if (r.person_extra === '100 DH') return '100 DH';
  if (r.person_extra === '50 DH') return '50 DH';
  if (r.extra_payment && r.extra_payment !== '0 DH') return r.extra_payment;
  return '0 DH';
}

function getQuadPay(r: ResultItem): string {
  if (r.quad_extra === '200 DH') return '200 DH';
  if (r.quad_extra === '100 DH') return '100 DH';
  if (r.quad_extra === '50 DH') return '50 DH';
  return '0 DH';
}

function getCamelPay(r: ResultItem): string {
  if (r.camel_extra === '150 DH') return '150 DH';
  if (r.camel_extra === '100 DH') return '100 DH';
  if (r.camel_extra === '50 DH') return '50 DH';
  return '0 DH';
}

/**
 * Builds a multi-day professional Excel Workbook for a given month
 * Each day has its own dedicated styled table, stacked under one another exactly matching the Excel Table View!
 */
export function generateMonthExcelWorkbook(
  year: string,
  monthNumStr: string,
  monthTrips: ResultItem[]
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const monthName = MONTH_NAME_ONLY[monthNumStr] || `Month-${monthNumStr}`;
  const sheetName = `${monthName} ${year}`;

  // Group trips by day
  const daysMap: Record<string, ResultItem[]> = {};
  monthTrips.forEach(t => {
    const p = parseDate(t.date);
    const dKey = p.fullDate;
    if (!daysMap[dKey]) daysMap[dKey] = [];
    daysMap[dKey].push(t);
  });

  // Sort days ascending
  const sortedDays = Object.keys(daysMap).sort((a, b) => {
    const pA = parseDate(a);
    const pB = parseDate(b);
    return pA.day - pB.day;
  });

  const rows: (string | number)[][] = [];

  // Title Banner
  rows.push([`AGM TRAVEL - AGAFAY OPERATIONS WORKBOOK`]);
  rows.push([`MONTH: ${monthName.toUpperCase()} ${year} | TOTAL TRIPS: ${monthTrips.length}`]);
  rows.push([`Generated from AGM-WorkSpace Server Sync: ${new Date().toLocaleString()}`]);
  rows.push([]); // blank separator

  if (sortedDays.length === 0) {
    rows.push([`No trip records logged for ${monthName} ${year}`]);
  } else {
    sortedDays.forEach((dKey, dayIndex) => {
      const dayTrips = daysMap[dKey];
      const p = parseDate(dKey);
      
      const totalPax = dayTrips.reduce((sum, t) => sum + (parseInt(t.pax, 10) || 0), 0);
      const totalQuads = dayTrips.reduce((sum, t) => sum + (parseInt(t.quads, 10) || 0), 0);
      const totalCamels = dayTrips.reduce((sum, t) => sum + (parseInt(t.camels, 10) || 0), 0);
      
      const totalPersonExtra = dayTrips.reduce((sum, t) => sum + (parseInt(getPersonPay(t).replace(/\D/g, ''), 10) || 0), 0);
      const totalQuadExtra = dayTrips.reduce((sum, t) => sum + (parseInt(getQuadPay(t).replace(/\D/g, ''), 10) || 0), 0);
      const totalCamelExtra = dayTrips.reduce((sum, t) => sum + (parseInt(getCamelPay(t).replace(/\D/g, ''), 10) || 0), 0);
      const dayTotalExtra = totalPersonExtra + totalQuadExtra + totalCamelExtra;

      // Day Header Banner
      rows.push([`═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`]);
      rows.push([
        `WORKDAY TABLE #${dayIndex + 1}: ${dKey} (Day ${p.rawDay})`,
        `TRIPS: ${dayTrips.length}`,
        `TOTAL PAX: ${totalPax}`,
        `QUADS: ${totalQuads}`,
        `CAMELS: ${totalCamels}`,
        `EXTRA REV: ${dayTotalExtra} DH`
      ]);
      rows.push([`═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`]);

      // Table Column Headers (exact match with Excel Table View)
      rows.push([
        'Row',
        'Guide Name',
        'Driver Name',
        'Company',
        'Pax',
        'Quads',
        'Camels',
        'Person Extra',
        'Person Paid (DH)',
        'Quad Extra',
        'Quad Paid (DH)',
        'Camels Extra',
        'Camels Paid (DH)',
        'Date',
        'Time',
        'Status',
        'Notes'
      ]);

      // Data Rows
      dayTrips.forEach((r, idx) => {
        rows.push([
          idx + 1,
          r.guide || 'Without Guide',
          r.driver || 'Without Driver',
          r.company || 'AGM',
          parseInt(r.pax, 10) || 0,
          parseInt(r.quads, 10) || 0,
          parseInt(r.camels, 10) || 0,
          r.person_extra || 'None',
          getPersonPay(r),
          r.quad_extra || 'None',
          getQuadPay(r),
          r.camel_extra || 'None',
          getCamelPay(r),
          r.date || dKey,
          r.time || '15:00',
          'Completed'
        ]);
      });

      // Day Summary Totals Row
      rows.push([
        `TOTALS (${dKey})`,
        `${dayTrips.length} Trips`,
        '',
        '',
        totalPax,
        totalQuads,
        totalCamels,
        '',
        `${totalPersonExtra} DH`,
        '',
        `${totalQuadExtra} DH`,
        '',
        `${totalCamelExtra} DH`,
        dKey,
        '',
        'DAY TOTAL',
        `Extra: ${dayTotalExtra} DH`
      ]);

      // Blank spacing rows before next day table
      rows.push([]);
      rows.push([]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for neat Excel rendering
  ws['!cols'] = [
    { wch: 8 },  // Row
    { wch: 22 }, // Guide Name
    { wch: 22 }, // Driver Name
    { wch: 12 }, // Company
    { wch: 8 },  // Pax
    { wch: 8 },  // Quads
    { wch: 8 },  // Camels
    { wch: 14 }, // Person Extra
    { wch: 16 }, // Person Paid
    { wch: 14 }, // Quad Extra
    { wch: 16 }, // Quad Paid
    { wch: 14 }, // Camels Extra
    { wch: 16 }, // Camels Paid
    { wch: 14 }, // Date
    { wch: 10 }, // Time
    { wch: 12 }, // Status
    { wch: 30 }  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Also create a Staff Summary sheet for this month
  const staffSummaryRows: (string | number)[][] = [
    [`STAFF PERFORMANCE SUMMARY - ${monthName.toUpperCase()} ${year}`],
    [],
    ['Guide Name', 'Trips Done', 'Total Pax Guided', 'Quads', 'Camels'],
  ];

  const guideAgg: Record<string, { trips: number; pax: number; quads: number; camels: number }> = {};
  monthTrips.forEach(t => {
    const g = (t.guide || 'Without Guide').trim();
    if (!guideAgg[g]) guideAgg[g] = { trips: 0, pax: 0, quads: 0, camels: 0 };
    guideAgg[g].trips += 1;
    guideAgg[g].pax += parseInt(t.pax, 10) || 0;
    guideAgg[g].quads += parseInt(t.quads, 10) || 0;
    guideAgg[g].camels += parseInt(t.camels, 10) || 0;
  });

  Object.entries(guideAgg)
    .sort((a, b) => b[1].trips - a[1].trips)
    .forEach(([gName, data]) => {
      staffSummaryRows.push([gName, data.trips, data.pax, data.quads, data.camels]);
    });

  const wsSummary = XLSX.utils.aoa_to_sheet(staffSummaryRows);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Staff Summary');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

/**
 * Generate full AutoPyne-AGM ZIP file containing:
 * - AutoPyne-AGM/
 *     ├── Years/year-YYYY/MM-Month/Month-YYYY.xlsx
 *     ├── database/*.json & agm_travel_schema.sql
 *     ├── agm_workspace_manifest.json
 *     ├── AutoPyne_AGM_Sync.py
 *     └── README_AUTOPYNE_AGM.txt
 */
export async function buildAgmWorkspaceZip(
  trips: ResultItem[],
  guides: RegisteredGuide[],
  drivers: RegisteredDriver[],
  managers: ManagerData[],
  paymentRates: PaymentRates,
  inactiveStaff: Record<string, any> = {}
): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('AutoPyne-AGM') || zip;

  // Group trips by year and month
  const tree: Record<string, Record<string, ResultItem[]>> = {};
  trips.forEach(t => {
    const p = parseDate(t.date);
    const yr = p.rawYear;
    const mo = p.rawMonth;
    if (!tree[yr]) tree[yr] = {};
    if (!tree[yr][mo]) tree[yr][mo] = [];
    tree[yr][mo].push(t);
  });

  // Ensure current year (2026) is always included
  if (!tree['2026']) tree['2026'] = {};
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  if (!tree['2026'][currentMonthNum]) tree['2026'][currentMonthNum] = [];

  // Build Years/ folder
  const yearsFolder = root.folder('Years');
  for (const [yr, monthsMap] of Object.entries(tree)) {
    const yrFolder = yearsFolder?.folder(`year-${yr}`);
    for (const [moNum, mTrips] of Object.entries(monthsMap)) {
      const moFolderName = MONTH_FULL_NAMES[moNum] || `${moNum}-Month`;
      const moFolder = yrFolder?.folder(moFolderName);
      const monthName = MONTH_NAME_ONLY[moNum] || `Month-${moNum}`;
      const fileName = `${monthName}-${yr}.xlsx`;

      const excelBytes = generateMonthExcelWorkbook(yr, moNum, mTrips);
      moFolder?.file(fileName, excelBytes);

      // Also create a JSON backup inside the month folder
      moFolder?.file(`${monthName}-${yr}-trips.json`, JSON.stringify(mTrips, null, 2));
    }
  }

  // Build database/ folder (full master snapshot)
  const dbFolder = root.folder('database');
  const fullBackup = {
    appName: 'AutoPyne-AGM Travel Operations WorkSpace',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    totalTrips: trips.length,
    totalGuides: guides.length,
    totalDrivers: drivers.length,
    totalManagers: managers.length,
    trips,
    registeredGuides: guides,
    registeredDrivers: drivers,
    managersList: managers,
    paymentRates,
    inactiveStaff
  };

  dbFolder?.file('agm_daily_trips.json', JSON.stringify(trips, null, 2));
  dbFolder?.file('registered_guides.json', JSON.stringify(guides, null, 2));
  dbFolder?.file('registered_drivers.json', JSON.stringify(drivers, null, 2));
  dbFolder?.file('managers_list.json', JSON.stringify(managers, null, 2));
  dbFolder?.file('payment_rates.json', JSON.stringify(paymentRates, null, 2));
  dbFolder?.file('agm_complete_server_backup.json', JSON.stringify(fullBackup, null, 2));
  
  const sqlDump = `-- AGM Travel Embedded SQLite Database Schema (agm_travel.db)
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
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);
CREATE INDEX IF NOT EXISTS idx_trips_guide ON trips(guide);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver);
CREATE INDEX IF NOT EXISTS idx_trips_company ON trips(company);
CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips(date, time);

CREATE TABLE IF NOT EXISTS registered_guides (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  dates_worked TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guides_name ON registered_guides(name);

CREATE TABLE IF NOT EXISTS registered_drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  van_type TEXT DEFAULT 'Big van',
  company_name TEXT DEFAULT 'AGM',
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON registered_drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON registered_drivers(company_name);

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

CREATE TABLE IF NOT EXISTS payment_rates (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

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
CREATE INDEX IF NOT EXISTS idx_settled_entity ON settled_payments(entity_type, entity_name);
CREATE INDEX IF NOT EXISTS idx_settled_period ON settled_payments(period_key);
`;
  dbFolder?.file('agm_travel_schema.sql', sqlDump);

  // Manifest metadata
  const manifest = {
    workspaceName: 'AutoPyne-AGM',
    createdFor: 'AGM Travel Excursions & Agafay Operations',
    createdAt: new Date().toISOString(),
    schemaVersion: '2.0.0',
    databaseType: 'SQLite',
    stats: {
      tripsCount: trips.length,
      guidesCount: guides.length,
      driversCount: drivers.length,
      managersCount: managers.length
    },
    folderStructure: [
      'AutoPyne-AGM/Years/year-YYYY/MM-MonthName/MonthName-YYYY.xlsx',
      'AutoPyne-AGM/database/agm_travel_schema.sql',
      'AutoPyne-AGM/database/agm_daily_trips.json',
      'AutoPyne-AGM/database/registered_guides.json',
      'AutoPyne-AGM/database/registered_drivers.json',
      'AutoPyne-AGM/database/managers_list.json',
      'AutoPyne-AGM/database/payment_rates.json',
      'AutoPyne-AGM/database/agm_complete_server_backup.json'
    ],
    restoreInstructions: 'To restore your entire app state, drag and drop the AutoPyne-AGM folder into the AutoPyne Workstation or Manager Profile.'
  };

  root.file('agm_workspace_manifest.json', JSON.stringify(manifest, null, 2));

  // Python Sync Script inside the folder
  root.file('AutoPyne_AGM_Sync.py', getPythonSyncScriptContent());
  root.file('agm_workspace_sync.py', getPythonSyncScriptContent());

  // Readme
  const readme = `========================================================================
AUTOPYNE-AGM - LOCAL WORKSPACE & SERVER REPOSITORY (AutoPyne-AGM)
========================================================================

This AutoPyne-AGM folder stores all operational data in your Documents and Desktop folders.
If you delete browser cache, switch computers, or run offline:

HOW TO RESTORE DATA:
1. Open the AutoPyne AGM Travel Application.
2. Open Manager Profile -> "Drag Folder" or "Drag AutoPyne-AGM".
3. Drag & Drop this entire "AutoPyne-AGM" folder directly into the app.
4. All Daily Logged Trips, Excel Tables, Guides, Drivers, and Rates will be 100% restored immediately!

FOLDER STRUCTURE:
- Years/ : Organized by year (e.g. year-2026) -> Months -> Monthly Excel files (.xlsx)
  Inside each monthly Excel file are professional daily tables for every workday!
- database/ : Full JSON & SQLite master database copies
- AutoPyne_AGM_Sync.py : Standalone Python script to auto-create and sync Documents/AutoPyne-AGM & Desktop/AutoPyne-AGM on Windows and macOS.

Generated at: ${new Date().toLocaleString()}
`;
  root.file('README_AUTOPYNE_AGM.txt', readme);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/zip'
  });
}

/**
 * Downloads the full AutoPyne-AGM workspace directory as a .zip file (Compatible with Windows & macOS)
 */
export async function downloadAgmWorkspaceZip(
  trips: ResultItem[],
  guides: RegisteredGuide[],
  drivers: RegisteredDriver[],
  managers: ManagerData[],
  paymentRates: PaymentRates,
  inactiveStaff: Record<string, any> = {}
): Promise<void> {
  const blob = await buildAgmWorkspaceZip(trips, guides, drivers, managers, paymentRates, inactiveStaff);
  const fileName = `AutoPyne-AGM-${new Date().toISOString().slice(0, 10)}.zip`;

  // Fallback for legacy IE/Edge msSaveOrOpenBlob
  if (typeof window !== 'undefined' && (window as any).navigator && (window as any).navigator.msSaveOrOpenBlob) {
    (window as any).navigator.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  a.setAttribute('download', fileName);
  document.body.appendChild(a);
  a.click();

  // Clean up timer for macOS Safari & Windows Explorer blob handlers
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Returns clean Python Sync script that creates AutoPyne-AGM in Documents and Desktop on Windows and macOS
 */
export function getPythonSyncScriptContent(): string {
  return `#!/usr/bin/env python3
"""
AUTOPYNE-AGM TRAVEL - LOCAL WORKSPACE AUTOMATIC SYNC SERVICE
=============================================================
Automatically creates and synchronizes the AutoPyne-AGM directory hierarchy
in Desktop and Documents with yearly and monthly Excel workbooks on Windows & macOS.

Structure:
  AutoPyne-AGM/
    ├── Years/
    │    └── year-2026/
    │         ├── 01-January/
    │         │    └── January-2026.xlsx
    │         ├── 08-August/
    │         │    └── August-2026.xlsx
    │         └── ...
    ├── database/
    │    ├── agm_daily_trips.json
    │    ├── registered_guides.json
    │    ├── registered_drivers.json
    │    ├── managers_list.json
    │    └── agm_complete_server_backup.json
    └── agm_workspace_manifest.json
"""

import os
import sys
import json
import datetime
import shutil
from pathlib import Path

MONTH_NAMES = {
    1: ("01-January", "January"),
    2: ("02-February", "February"),
    3: ("03-March", "March"),
    4: ("04-April", "April"),
    5: ("05-May", "May"),
    6: ("06-June", "June"),
    7: ("07-July", "July"),
    8: ("08-August", "August"),
    9: ("09-September", "September"),
    10: ("10-October", "October"),
    11: ("11-November", "November"),
    12: ("12-December", "December"),
}

def get_target_directories():
    home = Path.home()
    dirs = []
    
    # 1. Documents / AutoPyne-AGM (Windows & macOS)
    documents = home / "Documents" / "AutoPyne-AGM"
    dirs.append(documents)

    # 2. Desktop / AutoPyne-AGM (Windows & macOS)
    desktop = home / "Desktop" / "AutoPyne-AGM"
    dirs.append(desktop)

    # 3. Legacy Fallback: AGM-WorkSpace
    dirs.append(home / "Documents" / "AGM-WorkSpace")
    dirs.append(home / "Desktop" / "AGM-WorkSpace")
    
    # 4. Current working directory
    cwd_workspace = Path.cwd() / "AutoPyne-AGM"
    if cwd_workspace not in dirs:
        dirs.append(cwd_workspace)
        
    return dirs

def create_workspace_structure(base_dir: Path, current_year: int = 2026):
    print(f"Initializing AutoPyne-AGM at: {base_dir}")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    # Create Years hierarchy
    years_dir = base_dir / "Years"
    years_dir.mkdir(exist_ok=True)
    
    # Create Year folder
    year_folder = years_dir / f"year-{current_year}"
    year_folder.mkdir(exist_ok=True)
    
    # Create 12 Month folders
    for m_num, (folder_name, month_title) in MONTH_NAMES.items():
        month_dir = year_folder / folder_name
        month_dir.mkdir(exist_ok=True)
        
        # Create default placeholder CSV
        csv_file = month_dir / f"{month_title}-{current_year}.csv"
        if not csv_file.exists():
            with open(csv_file, "w", encoding="utf-8") as f:
                f.write("Row,Guide Name,Driver Name,Company,Pax,Quads,Camels,Person Extra,Person Paid (DH),Quad Extra,Quad Paid (DH),Camels Extra,Camels Paid (DH),Date,Time,Status,Notes\\n")
    
    # Create database directory
    db_dir = base_dir / "database"
    db_dir.mkdir(exist_ok=True)
    
    # Create default empty database files if not existing
    default_files = {
        "agm_daily_trips.json": [],
        "registered_guides.json": [],
        "registered_drivers.json": [],
        "managers_list.json": [
            {
                "id": "mgr_001",
                "name": "Abdelilah",
                "lastname": "Amzil",
                "schoolLevel": "Master Software Engineering & Higher Education",
                "skill": "Software Developer & Lead Operations Manager",
                "startedFrom": "15-03-2022",
                "email": "abdelilahojana5@gmail.com",
                "employeeId": "AGM-MGR-001",
                "status": "Active Lead Manager"
            }
        ],
        "payment_rates.json": {
            "guideDailyRate": 100,
            "bigVanDriverDailyRate": 100,
            "miniVanDriverDailyRate": 75,
            "defaultCompanyBigVanRate": 700,
            "defaultCompanyMiniVanRate": 500,
            "quadUnitRate": 150,
            "camelUnitRate": 100
        }
    }
    
    for filename, content in default_files.items():
        target_file = db_dir / filename
        if not target_file.exists():
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)
                
    # Create Manifest
    manifest_file = base_dir / "agm_workspace_manifest.json"
    manifest_data = {
        "workspaceName": "AutoPyne-AGM",
        "initializedAt": datetime.datetime.now().isoformat(),
        "year": current_year,
        "description": "AutoPyne-AGM Standalone Data Repository - Drag & Drop this folder into the web app to restore all records."
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
        
    print(f"AutoPyne-AGM initialized successfully at: {base_dir}")

def sync_data_from_json(base_dir: Path, data_json_path: Path):
    if not data_json_path.exists():
        print(f"Source data file not found: {data_json_path}")
        return
        
    with open(data_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    db_dir = base_dir / "database"
    db_dir.mkdir(exist_ok=True)
    
    # Save master backup
    backup_file = db_dir / "agm_complete_server_backup.json"
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print(f"Synced master data into: {backup_file}")

def main():
    print("=========================================================")
    print("   AUTOPYNE-AGM TRAVEL - LOCAL WORKSPACE PYTHON SYNC")
    print("=========================================================")
    
    target_dirs = get_target_directories()
    for directory in target_dirs:
        try:
            create_workspace_structure(directory, current_year=2026)
        except Exception as e:
            print(f"Notice for {directory}: {e}")
            
    print("\\nAutoPyne-AGM is ready in Desktop and Documents.")
    print("Drag and drop the AutoPyne-AGM folder into the app to restore data anytime.")

if __name__ == "__main__":
    main()
`;
}

/**
 * File System Access API: Ask user for permission and link local folder
 */
export async function requestAgmDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) {
    return null;
  }
  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'agm-workspace',
      mode: 'readwrite',
      startIn: 'desktop'
    });
    return handle;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('Directory handle request failed:', err);
    }
    return null;
  }
}

/**
 * Write full AGM-WorkSpace folder directly to a linked Directory Handle
 */
export async function writeWorkspaceToDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  trips: ResultItem[],
  guides: RegisteredGuide[],
  drivers: RegisteredDriver[],
  managers: ManagerData[],
  paymentRates: PaymentRates,
  inactiveStaff: Record<string, any> = {}
): Promise<boolean> {
  try {
    // 1. Get or create Years folder
    const yearsHandle = await dirHandle.getDirectoryHandle('Years', { create: true });
    
    // Group trips by year and month
    const tree: Record<string, Record<string, ResultItem[]>> = {};
    trips.forEach(t => {
      const p = parseDate(t.date);
      const yr = p.rawYear;
      const mo = p.rawMonth;
      if (!tree[yr]) tree[yr] = {};
      if (!tree[yr][mo]) tree[yr][mo] = [];
      tree[yr][mo].push(t);
    });
    if (!tree['2026']) tree['2026'] = {};

    for (const [yr, monthsMap] of Object.entries(tree)) {
      const yrHandle = await yearsHandle.getDirectoryHandle(`year-${yr}`, { create: true });
      for (const [moNum, mTrips] of Object.entries(monthsMap)) {
        const moFolderName = MONTH_FULL_NAMES[moNum] || `${moNum}-Month`;
        const moHandle = await yrHandle.getDirectoryHandle(moFolderName, { create: true });
        const monthName = MONTH_NAME_ONLY[moNum] || `Month-${moNum}`;

        // Excel file
        const excelBytes = generateMonthExcelWorkbook(yr, moNum, mTrips);
        const excelFileHandle = await moHandle.getFileHandle(`${monthName}-${yr}.xlsx`, { create: true });
        const excelWritable = await (excelFileHandle as any).createWritable();
        await excelWritable.write(excelBytes);
        await excelWritable.close();

        // Month JSON
        const jsonFileHandle = await moHandle.getFileHandle(`${monthName}-${yr}-trips.json`, { create: true });
        const jsonWritable = await (jsonFileHandle as any).createWritable();
        await jsonWritable.write(JSON.stringify(mTrips, null, 2));
        await jsonWritable.close();
      }
    }

    // 2. Database folder
    const dbHandle = await dirHandle.getDirectoryHandle('database', { create: true });
    
    const filesToWrite: Record<string, any> = {
      'agm_daily_trips.json': trips,
      'registered_guides.json': guides,
      'registered_drivers.json': drivers,
      'managers_list.json': managers,
      'payment_rates.json': paymentRates,
      'agm_complete_server_backup.json': {
        appName: 'AGM Travel Operations WorkSpace',
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        totalTrips: trips.length,
        totalGuides: guides.length,
        totalDrivers: drivers.length,
        totalManagers: managers.length,
        trips,
        registeredGuides: guides,
        registeredDrivers: drivers,
        managersList: managers,
        paymentRates,
        inactiveStaff
      }
    };

    for (const [fName, content] of Object.entries(filesToWrite)) {
      const fileHandle = await dbHandle.getFileHandle(fName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(JSON.stringify(content, null, 2));
      await writable.close();
    }

    // 3. Manifest
    const manifestFileHandle = await dirHandle.getFileHandle('agm_workspace_manifest.json', { create: true });
    const manifestWritable = await (manifestFileHandle as any).createWritable();
    await manifestWritable.write(JSON.stringify({
      workspaceName: 'AutoPyne-AGM',
      lastSyncedAt: new Date().toISOString(),
      stats: {
        tripsCount: trips.length,
        guidesCount: guides.length,
        driversCount: drivers.length,
        managersCount: managers.length
      }
    }, null, 2));
    await manifestWritable.close();

    // 4. Python sync script
    const pyFileHandle = await dirHandle.getFileHandle('AutoPyne_AGM_Sync.py', { create: true });
    const pyWritable = await (pyFileHandle as any).createWritable();
    await pyWritable.write(getPythonSyncScriptContent());
    await pyWritable.close();

    return true;
  } catch (err) {
    console.error('Failed writing to directory handle:', err);
    return false;
  }
}

/**
 * Parses dropped AGM-WorkSpace folder / files and extracts full database
 */
export async function parseDroppedAgmFolder(
  items: DataTransferItemList | FileList
): Promise<AgmRestoreResult | null> {
  const result: AgmRestoreResult = {
    trips: [],
    guides: [],
    drivers: [],
    managers: [],
    timestamp: new Date().toISOString(),
    source: 'AGM-WorkSpace Folder',
    totalTripsCount: 0,
    totalGuidesCount: 0,
    totalDriversCount: 0
  };

  const filePromises: Promise<{ path: string; file: File }>[] = [];

  // Helper to traverse FileSystemEntry hierarchy
  function traverseEntry(entry: any, path = ''): Promise<void> {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          filePromises.push(Promise.resolve({ path: `${path}/${file.name}`, file }));
          resolve();
        }, () => resolve());
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = () => {
          dirReader.readEntries((entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              const promises = entries.map(e => traverseEntry(e, `${path}/${entry.name}`));
              Promise.all(promises).then(() => readEntries());
            }
          }, () => resolve());
        };
        readEntries();
      } else {
        resolve();
      }
    });
  }

  // Check if items is DataTransferItemList with webkitGetAsEntry
  if ('length' in items && items[0] && 'webkitGetAsEntry' in (items[0] as any)) {
    const entryPromises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry();
      if (entry) {
        entryPromises.push(traverseEntry(entry));
      }
    }
    await Promise.all(entryPromises);
  } else {
    // Standard FileList
    for (let i = 0; i < items.length; i++) {
      const f = (items as FileList)[i];
      filePromises.push(Promise.resolve({ path: f.webkitRelativePath || f.name, file: f }));
    }
  }

  const collectedFiles = await Promise.all(filePromises);

  if (collectedFiles.length === 0) {
    return null;
  }

  // 1. First priority: Check for agm_complete_server_backup.json
  const completeBackupFile = collectedFiles.find(cf => 
    cf.file.name === 'agm_complete_server_backup.json' || cf.path.includes('agm_complete_server_backup')
  );

  if (completeBackupFile) {
    try {
      const text = await completeBackupFile.file.text();
      const parsed = JSON.parse(text);
      if (parsed) {
        if (Array.isArray(parsed.trips)) result.trips = parsed.trips;
        if (Array.isArray(parsed.registeredGuides)) result.guides = parsed.registeredGuides;
        if (Array.isArray(parsed.registeredDrivers)) result.drivers = parsed.registeredDrivers;
        if (Array.isArray(parsed.managersList)) result.managers = parsed.managersList;
        if (parsed.paymentRates) result.paymentRates = parsed.paymentRates;
        if (parsed.inactiveStaff) result.inactiveStaff = parsed.inactiveStaff;

        result.totalTripsCount = result.trips.length;
        result.totalGuidesCount = result.guides.length;
        result.totalDriversCount = result.drivers.length;
        return result;
      }
    } catch (e) {
      console.warn('Error reading complete backup file:', e);
    }
  }

  // 2. Read individual JSON files
  for (const cf of collectedFiles) {
    const name = cf.file.name.toLowerCase();
    try {
      if (name === 'agm_daily_trips.json' || (name.endsWith('-trips.json') && !name.includes('guide'))) {
        const text = await cf.file.text();
        const tripsArr = JSON.parse(text);
        if (Array.isArray(tripsArr)) {
          // Merge unique trips by ID or date+time+guide
          tripsArr.forEach(t => {
            if (!result.trips.some(existing => existing.id === t.id && existing.date === t.date)) {
              result.trips.push(t);
            }
          });
        }
      } else if (name === 'registered_guides.json' || name.includes('guides')) {
        const text = await cf.file.text();
        const guidesArr = JSON.parse(text);
        if (Array.isArray(guidesArr)) {
          guidesArr.forEach(g => {
            if (!result.guides.some(eg => (eg.id && eg.id === g.id) || eg.name.toUpperCase() === g.name.toUpperCase())) {
              result.guides.push(g);
            }
          });
        }
      } else if (name === 'registered_drivers.json' || name.includes('drivers')) {
        const text = await cf.file.text();
        const driversArr = JSON.parse(text);
        if (Array.isArray(driversArr)) {
          driversArr.forEach(d => {
            if (!result.drivers.some(ed => (ed.id && ed.id === d.id) || (ed.name.toUpperCase() === d.name.toUpperCase() && ed.vanType === d.vanType))) {
              result.drivers.push(d);
            }
          });
        }
      } else if (name === 'managers_list.json' || name.includes('manager')) {
        const text = await cf.file.text();
        const mgrArr = JSON.parse(text);
        if (Array.isArray(mgrArr)) {
          result.managers = mgrArr;
        }
      } else if (name === 'payment_rates.json' || name.includes('rates')) {
        const text = await cf.file.text();
        const ratesObj = JSON.parse(text);
        if (ratesObj && typeof ratesObj === 'object') {
          result.paymentRates = ratesObj;
        }
      }
    } catch (err) {
      console.warn(`Could not parse JSON file ${cf.path}:`, err);
    }
  }

  // 3. If no JSON trips found, try parsing Excel workbooks (.xlsx) inside the folder
  if (result.trips.length === 0) {
    const excelFiles = collectedFiles.filter(cf => cf.file.name.endsWith('.xlsx') || cf.file.name.endsWith('.xls'));
    for (const ef of excelFiles) {
      try {
        const buffer = await ef.file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        workbook.SheetNames.forEach(sName => {
          if (sName.toLowerCase().includes('summary')) return;
          const ws = workbook.Sheets[sName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          let currentDate = '';
          rawRows.forEach((row) => {
            if (!Array.isArray(row) || row.length === 0) return;
            const firstCell = String(row[0] || '').trim();
            
            // Check for workday banner: "WORKDAY TABLE #1: 01-08-2026"
            if (firstCell.includes('WORKDAY TABLE')) {
              const match = firstCell.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
              if (match) currentDate = match[1];
            }

            // Check if this is a data row (firstCell is a number)
            const rowNum = parseInt(firstCell, 10);
            if (!isNaN(rowNum) && rowNum > 0 && row.length >= 7) {
              const guide = String(row[1] || 'Without Guide').trim();
              const driver = String(row[2] || 'Without Driver').trim();
              const company = String(row[3] || 'AGM').trim();
              const pax = String(row[4] || '0').trim();
              const quads = String(row[5] || '0').trim();
              const camels = String(row[6] || '0').trim();
              const person_extra = String(row[7] || 'None').trim();
              const quad_extra = String(row[9] || 'None').trim();
              const camel_extra = String(row[11] || 'None').trim();
              const rowDate = String(row[13] || currentDate || '01-08-2026').trim();
              const rowTime = String(row[14] || '15:00').trim();
              const notes = String(row[16] || '').trim();

              const tripItem: ResultItem = {
                id: Date.now() + Math.floor(Math.random() * 100000),
                guide,
                driver,
                company,
                pax,
                quads,
                camels,
                person_extra: person_extra === 'None' ? undefined : person_extra,
                quad_extra: quad_extra === 'None' ? undefined : quad_extra,
                camel_extra: camel_extra === 'None' ? undefined : camel_extra,
                date: rowDate,
                time: rowTime
              };

              result.trips.push(tripItem);
            }
          });
        });
      } catch (err) {
        console.warn('Error parsing excel workbook for trips:', err);
      }
    }
  }

  result.totalTripsCount = result.trips.length;
  result.totalGuidesCount = result.guides.length;
  result.totalDriversCount = result.drivers.length;

  return result;
}
