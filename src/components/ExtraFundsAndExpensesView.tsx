import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  CalendarDays,
  Plus,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Flame,
  Wrench,
  ShoppingBag,
  Fuel,
  Users,
  AlertCircle,
  Trash2,
  Edit3,
  FileSpreadsheet,
  X,
  Sparkles,
  Receipt,
  RefreshCw,
  Layers,
  Printer,
  ExternalLink,
  Info,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { ResultItem, StaffProfile, parseDate } from './StaffProfilesView';
import { ManagerData } from './AutoPyneIntro';

export const MONTH_NAME_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(mNum: number): string {
  if (mNum >= 1 && mNum <= 12) {
    return MONTH_NAME_LIST[mNum - 1];
  }
  return `Month ${mNum}`;
}

// ================= TYPES & INTERFACES =================
export type ExtraFundSource = 'quads' | 'camels' | 'personnel' | 'general';
export type ExpenseCategory = 
  | 'repair' 
  | 'parts_product' 
  | 'fuel_oil' 
  | 'feed_animal' 
  | 'advance_staff' 
  | 'maintenance' 
  | 'supplies' 
  | 'other';

export interface ExtraExpenseItem {
  id: string;
  date: string; // "DD-MM-YYYY" or "YYYY-MM-DD"
  time?: string;
  sourceFund: ExtraFundSource;
  category: ExpenseCategory;
  amount: number; // in DH
  paidTo: string; // e.g. "Mechanic Hassan", "Quad Spare Parts", "Camel Keeper", "Guide Hassan"
  note: string; // Reason: e.g. "Bought brake pads and motor oil for Quad #4", "Emergency saddle repair"
  managerName: string;
  receiptNo?: string;
  createdAt: number;
}

export interface ExtraFundsAndExpensesViewProps {
  results: ResultItem[];
  staffProfiles: StaffProfile[];
  currentManager?: ManagerData | null;
  onClose?: () => void;
  onOpenFleetModal?: () => void;
  onSelectTripDate?: (date: string) => void;
  showNotification: (msg: string) => void;
}

// Storage Key for persistent extra expenses
const EXTRA_EXPENSES_STORAGE_KEY = 'agm_extra_funds_expenses_v1';

// Normalize date strings into clean DD-MM-YYYY format
export function normalizeDate(dStr?: string) {
  const p = parseDate(dStr);
  const formatted = `${p.rawDay}-${p.rawMonth}-${p.rawYear}`;
  const iso = p.isoDate;
  return {
    key: formatted,
    day: p.day,
    month: p.month,
    year: p.year,
    formatted,
    iso,
    display: `${p.rawDay}/${p.rawMonth}/${p.rawYear}`
  };
}

// Helpers to parse extra numbers
function parseExtraCount(val?: string): number {
  if (!val || val === 'None' || val === 'none' || val === '0' || val === '-') return 0;
  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? (val.trim() && val !== 'None' ? 1 : 0) : num;
}

function parseExtraPay(payStr?: string, fallbackPayment?: string, hasCount?: boolean): number {
  if (payStr && payStr !== 'None' && payStr !== '0 DH' && payStr !== '0' && payStr !== '-') {
    const num = parseInt(payStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  if (hasCount && fallbackPayment && fallbackPayment !== 'None' && fallbackPayment !== '0 DH' && fallbackPayment !== '0') {
    const num = parseInt(fallbackPayment.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

// Default expense seed (starts completely empty with no mock items)
const INITIAL_EXPENSES_SEED: ExtraExpenseItem[] = [];

export const ExtraFundsAndExpensesView: React.FC<ExtraFundsAndExpensesViewProps> = ({
  results,
  staffProfiles,
  currentManager,
  onClose,
  onOpenFleetModal,
  onSelectTripDate,
  showNotification
}) => {
  // Navigation tabs: 'daily_ledger' | 'consumptions_log' | 'monthly_summary'
  const [activeTab, setActiveTab] = useState<'daily_ledger' | 'consumptions_log' | 'monthly_summary'>('daily_ledger');

  // Filter: Fund Source Filter ('all' | 'quads' | 'camels' | 'personnel')
  const [fundFilter, setFundFilter] = useState<'all' | 'quads' | 'camels' | 'personnel'>('all');

  // Category filter for Consumptions tab
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Year & Month Selection
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [activeMonthFilter, setActiveMonthFilter] = useState<number | 'all'>('all');

  // Search query (for date, notes, paidTo, manager, guide, driver)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily expanded cards state
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Expenses State (Loaded from localStorage, purging any legacy mock seed items)
  const [expenses, setExpenses] = useState<ExtraExpenseItem[]>(() => {
    try {
      const stored = localStorage.getItem(EXTRA_EXPENSES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out any mock/seed items if previously saved
          const clean = parsed.filter((item: ExtraExpenseItem) => item && !String(item.id).startsWith('exp-seed-'));
          return clean;
        }
      }
    } catch (e) {
      console.error('Failed to load extra expenses', e);
    }
    return INITIAL_EXPENSES_SEED;
  });

  // Save expenses to localStorage when updated
  const saveExpenses = (updated: ExtraExpenseItem[]) => {
    setExpenses(updated);
    try {
      localStorage.setItem(EXTRA_EXPENSES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save expenses', e);
    }
  };

  // Add / Edit Modal State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExtraExpenseItem | null>(null);

  // Selected Voucher Modal State
  const [selectedVoucher, setSelectedVoucher] = useState<ExtraExpenseItem | null>(null);

  // Delete Expense Confirmation Modal State
  const [expenseToDelete, setExpenseToDelete] = useState<ExtraExpenseItem | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState<string>('');
  const [formSourceFund, setFormSourceFund] = useState<ExtraFundSource>('quads');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('repair');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPaidTo, setFormPaidTo] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formReceiptNo, setFormReceiptNo] = useState<string>('');

  // Quick preset note options for manager convenience
  const PRESET_NOTES = [
    { label: 'Quad Oil & Filter', text: 'Bought engine oil and replacement filters for Quads', fund: 'quads', cat: 'parts_product' },
    { label: 'Quad Brake Repair', text: 'Mechanic brake disc and pad repairs for Quad', fund: 'quads', cat: 'repair' },
    { label: 'Quad Tire / Tube', text: 'New tire and puncture repair for Quad', fund: 'quads', cat: 'repair' },
    { label: 'Fleet Fuel / Gas', text: 'Emergency fuel & gas canister replenishment', fund: 'quads', cat: 'fuel_oil' },
    { label: 'Camel Feed / Alfalfa', text: 'Purchased fresh grain and alfalfa feed for Camels', fund: 'camels', cat: 'feed_animal' },
    { label: 'Camel Saddle Repair', text: 'Camel saddle leather stitching and harness repair', fund: 'camels', cat: 'repair' },
    { label: 'Staff / Guide Advance', text: 'Daily advance payment for staff member', fund: 'personnel', cat: 'advance_staff' },
    { label: 'Cleaning & Wash', text: 'Fleet high-pressure washing and cleaning supplies', fund: 'general', cat: 'supplies' }
  ];

  // List of known staff for rapid selection
  const staffList = useMemo(() => {
    const names = new Set<string>();
    staffProfiles.forEach(s => {
      if (s.name) names.add(s.name);
    });
    return Array.from(names).sort();
  }, [staffProfiles]);

  // Available Years in Results & Expenses
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    results.forEach(r => {
      const p = parseDate(r.date);
      if (p.year) yearsSet.add(p.year);
    });
    expenses.forEach(e => {
      const p = parseDate(e.date);
      if (p.year) yearsSet.add(p.year);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [results, expenses]);

  // Master Processed Trips with Extras
  const processedTrips = useMemo(() => {
    return results.map(r => {
      const norm = normalizeDate(r.date);
      const quadsCount = parseInt(r.quads, 10) || 0;
      const camelsCount = parseInt(r.camels, 10) || 0;
      const paxCount = parseInt(r.pax, 10) || 0;

      const qExtraCount = parseExtraCount(r.quad_extra);
      const cExtraCount = parseExtraCount(r.camel_extra);
      const pExtraCount = parseExtraCount(r.person_extra);

      const qExtraPay = parseExtraPay(r.quad_extra_pay, r.extra_payment, qExtraCount > 0);
      const cExtraPay = parseExtraPay(r.camel_extra_pay, r.extra_payment, cExtraCount > 0);
      const pExtraPay = parseExtraPay(r.person_extra_pay, r.extra_payment, pExtraCount > 0);

      const totalExtraPay = qExtraPay + cExtraPay + pExtraPay;
      const hasAnyExtra = qExtraCount > 0 || cExtraCount > 0 || pExtraCount > 0 || totalExtraPay > 0;

      return {
        ...r,
        normDate: norm,
        quadsCount,
        camelsCount,
        paxCount,
        qExtraCount,
        cExtraCount,
        pExtraCount,
        qExtraPay,
        cExtraPay,
        pExtraPay,
        totalExtraPay,
        hasAnyExtra
      };
    });
  }, [results]);

  // Map of Dates with Daily Extra Inflows and Outflow Consumptions
  const dailyLedgerData = useMemo(() => {
    const map = new Map<string, {
      dateStr: string;
      normDate: ReturnType<typeof normalizeDate>;
      quadsExtraCount: number;
      quadsExtraDH: number;
      camelsExtraCount: number;
      camelsExtraDH: number;
      personnelExtraCount: number;
      personnelExtraDH: number;
      totalInflowDH: number;
      trips: typeof processedTrips;
      expenses: ExtraExpenseItem[];
      totalConsumedDH: number;
      quadsConsumedDH: number;
      camelsConsumedDH: number;
      personnelConsumedDH: number;
      generalConsumedDH: number;
      remainingBalanceDH: number;
    }>();

    // 1. Gather all trips extras grouped by standardized date key
    processedTrips.forEach(t => {
      const dKey = t.normDate.key;
      if (!map.has(dKey)) {
        map.set(dKey, {
          dateStr: dKey,
          normDate: t.normDate,
          quadsExtraCount: 0,
          quadsExtraDH: 0,
          camelsExtraCount: 0,
          camelsExtraDH: 0,
          personnelExtraCount: 0,
          personnelExtraDH: 0,
          totalInflowDH: 0,
          trips: [],
          expenses: [],
          totalConsumedDH: 0,
          quadsConsumedDH: 0,
          camelsConsumedDH: 0,
          personnelConsumedDH: 0,
          generalConsumedDH: 0,
          remainingBalanceDH: 0
        });
      }
      const entry = map.get(dKey)!;
      entry.trips.push(t);
      entry.quadsExtraCount += t.qExtraCount;
      entry.quadsExtraDH += t.qExtraPay;
      entry.camelsExtraCount += t.cExtraCount;
      entry.camelsExtraDH += t.cExtraPay;
      entry.personnelExtraCount += t.pExtraCount;
      entry.personnelExtraDH += t.pExtraPay;
      entry.totalInflowDH += t.totalExtraPay;
    });

    // 2. Attach expenses to respective dates (even if no trip occurred on that day)
    expenses.forEach(e => {
      const norm = normalizeDate(e.date);
      const dKey = norm.key;
      if (!map.has(dKey)) {
        map.set(dKey, {
          dateStr: dKey,
          normDate: norm,
          quadsExtraCount: 0,
          quadsExtraDH: 0,
          camelsExtraCount: 0,
          camelsExtraDH: 0,
          personnelExtraCount: 0,
          personnelExtraDH: 0,
          totalInflowDH: 0,
          trips: [],
          expenses: [],
          totalConsumedDH: 0,
          quadsConsumedDH: 0,
          camelsConsumedDH: 0,
          personnelConsumedDH: 0,
          generalConsumedDH: 0,
          remainingBalanceDH: 0
        });
      }
      const entry = map.get(dKey)!;
      entry.expenses.push(e);
      entry.totalConsumedDH += e.amount;
      if (e.sourceFund === 'quads') entry.quadsConsumedDH += e.amount;
      else if (e.sourceFund === 'camels') entry.camelsConsumedDH += e.amount;
      else if (e.sourceFund === 'personnel') entry.personnelConsumedDH += e.amount;
      else entry.generalConsumedDH += e.amount;
    });

    // 3. Compute Net Remaining Balance for each day
    map.forEach(entry => {
      entry.remainingBalanceDH = entry.totalInflowDH - entry.totalConsumedDH;
    });

    // Convert map to sorted list (newest date first), showing only dates with active extras or expenses
    const list = Array.from(map.values())
      .filter(entry => entry.totalInflowDH > 0 || entry.quadsExtraCount > 0 || entry.camelsExtraCount > 0 || entry.personnelExtraCount > 0 || entry.expenses.length > 0)
      .sort((a, b) => {
        if (a.normDate.year !== b.normDate.year) return b.normDate.year - a.normDate.year;
        if (a.normDate.month !== b.normDate.month) return b.normDate.month - a.normDate.month;
        if (a.normDate.day !== b.normDate.day) return b.normDate.day - a.normDate.day;
        return b.dateStr.localeCompare(a.dateStr);
      });

    return list;
  }, [processedTrips, expenses]);

  // Filtered Daily Ledger by Year, Month, Fund, Search
  const filteredDailyLedger = useMemo(() => {
    return dailyLedgerData.filter(day => {
      // Year Filter
      if (day.normDate.year !== selectedYear) return false;

      // Month Filter
      if (activeMonthFilter !== 'all' && day.normDate.month !== activeMonthFilter) {
        return false;
      }

      // Fund Source Filter
      if (fundFilter === 'quads') {
        if (day.quadsExtraDH <= 0 && day.quadsConsumedDH <= 0) return false;
      } else if (fundFilter === 'camels') {
        if (day.camelsExtraDH <= 0 && day.camelsConsumedDH <= 0) return false;
      } else if (fundFilter === 'personnel') {
        if (day.personnelExtraDH <= 0 && day.personnelConsumedDH <= 0) return false;
      }

      // Search Filter (date, notes, paidTo, guides, drivers)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dateMatch = day.dateStr.toLowerCase().includes(q) || day.normDate.display.includes(q);
        const expenseMatch = day.expenses.some(e => 
          e.note.toLowerCase().includes(q) || 
          e.paidTo.toLowerCase().includes(q) || 
          e.managerName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
        const tripMatch = day.trips.some(t => 
          t.guide.toLowerCase().includes(q) ||
          t.driver.toLowerCase().includes(q) ||
          (t.company && t.company.toLowerCase().includes(q))
        );
        if (!dateMatch && !expenseMatch && !tripMatch) return false;
      }

      return true;
    });
  }, [dailyLedgerData, selectedYear, activeMonthFilter, fundFilter, searchQuery]);

  // Filtered Consumptions / Expenses List (for Tab 2)
  const filteredExpensesList = useMemo(() => {
    return expenses.filter(e => {
      const norm = normalizeDate(e.date);
      if (norm.year !== selectedYear) return false;
      if (activeMonthFilter !== 'all' && norm.month !== activeMonthFilter) return false;
      if (fundFilter !== 'all' && e.sourceFund !== fundFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.date.toLowerCase().includes(q) ||
          norm.display.includes(q) ||
          e.note.toLowerCase().includes(q) ||
          e.paidTo.toLowerCase().includes(q) ||
          e.managerName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.receiptNo && e.receiptNo.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      const normA = normalizeDate(a.date);
      const normB = normalizeDate(b.date);
      if (normA.year !== normB.year) return normB.year - normA.year;
      if (normA.month !== normB.month) return normB.month - normA.month;
      if (normA.day !== normB.day) return normB.day - normA.day;
      return b.createdAt - a.createdAt;
    });
  }, [expenses, selectedYear, activeMonthFilter, fundFilter, categoryFilter, searchQuery]);

  // Overall Financial Totals for Selected Filter (Month / Year / Fund)
  const totals = useMemo(() => {
    let quadsInflow = 0;
    let camelsInflow = 0;
    let personnelInflow = 0;

    let quadsOutflow = 0;
    let camelsOutflow = 0;
    let personnelOutflow = 0;
    let generalOutflow = 0;

    filteredDailyLedger.forEach(d => {
      quadsInflow += d.quadsExtraDH;
      camelsInflow += d.camelsExtraDH;
      personnelInflow += d.personnelExtraDH;

      quadsOutflow += d.quadsConsumedDH;
      camelsOutflow += d.camelsConsumedDH;
      personnelOutflow += d.personnelConsumedDH;
      generalOutflow += d.generalConsumedDH;
    });

    const totalInflow = quadsInflow + camelsInflow + personnelInflow;
    const totalOutflow = quadsOutflow + camelsOutflow + personnelOutflow + generalOutflow;
    const netRemaining = totalInflow - totalOutflow;

    const quadsNet = quadsInflow - quadsOutflow;
    const camelsNet = camelsInflow - camelsOutflow;
    const personnelNet = personnelInflow - personnelOutflow;

    // Percent utilized
    const percentSpent = totalInflow > 0 ? Math.min(100, Math.round((totalOutflow / totalInflow) * 100)) : (totalOutflow > 0 ? 100 : 0);

    // Today's specific numbers
    const todayNorm = normalizeDate(new Date().toISOString());
    const todayStr = todayNorm.formatted;

    const todayEntry = dailyLedgerData.find(d => d.dateStr === todayStr);
    const todayInflow = todayEntry ? todayEntry.totalInflowDH : 0;
    const todayOutflow = todayEntry ? todayEntry.totalConsumedDH : 0;
    const todayRemaining = todayInflow - todayOutflow;

    return {
      quadsInflow,
      camelsInflow,
      personnelInflow,
      totalInflow,
      quadsOutflow,
      camelsOutflow,
      personnelOutflow,
      generalOutflow,
      totalOutflow,
      netRemaining,
      quadsNet,
      camelsNet,
      personnelNet,
      percentSpent,
      todayInflow,
      todayOutflow,
      todayRemaining,
      todayStr
    };
  }, [filteredDailyLedger, dailyLedgerData]);

  // Monthly Breakdown Matrix (for Tab 3)
  const monthlyMatrix = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map(m => {
      const daysInMonth = dailyLedgerData.filter(d => d.normDate.year === selectedYear && d.normDate.month === m);
      const mInflow = daysInMonth.reduce((acc, d) => acc + d.totalInflowDH, 0);
      const mQuadInflow = daysInMonth.reduce((acc, d) => acc + d.quadsExtraDH, 0);
      const mCamelInflow = daysInMonth.reduce((acc, d) => acc + d.camelsExtraDH, 0);
      const mPersonInflow = daysInMonth.reduce((acc, d) => acc + d.personnelExtraDH, 0);

      const mOutflow = daysInMonth.reduce((acc, d) => acc + d.totalConsumedDH, 0);
      const mQuadOutflow = daysInMonth.reduce((acc, d) => acc + d.quadsConsumedDH, 0);
      const mCamelOutflow = daysInMonth.reduce((acc, d) => acc + d.camelsConsumedDH, 0);
      const mPersonOutflow = daysInMonth.reduce((acc, d) => acc + d.personnelConsumedDH, 0);

      const mNet = mInflow - mOutflow;
      const expenseCount = daysInMonth.reduce((acc, d) => acc + d.expenses.length, 0);

      return {
        monthNum: m,
        monthName: getMonthName(m),
        inflow: mInflow,
        quadInflow: mQuadInflow,
        camelInflow: mCamelInflow,
        personInflow: mPersonInflow,
        outflow: mOutflow,
        quadOutflow: mQuadOutflow,
        camelOutflow: mCamelOutflow,
        personOutflow: mPersonOutflow,
        netRemaining: mNet,
        daysCount: daysInMonth.length,
        expenseCount
      };
    });
  }, [dailyLedgerData, selectedYear]);

  // Open Add Modal for a specific date (or today)
  const handleOpenAddModal = (datePrefill?: string, defaultFund: ExtraFundSource = 'quads') => {
    const todayNorm = normalizeDate(new Date().toISOString());
    const initialDate = datePrefill ? normalizeDate(datePrefill).formatted : todayNorm.formatted;

    setEditingExpense(null);
    setFormDate(initialDate);
    setFormSourceFund(defaultFund);
    setFormCategory('repair');
    setFormAmount('');
    setFormPaidTo('');
    setFormNote('');
    setFormReceiptNo(`REC-${Date.now().toString().slice(-5)}`);
    setShowAddExpenseModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ExtraExpenseItem) => {
    setEditingExpense(item);
    setFormDate(normalizeDate(item.date).formatted);
    setFormSourceFund(item.sourceFund);
    setFormCategory(item.category);
    setFormAmount(String(item.amount));
    setFormPaidTo(item.paidTo);
    setFormNote(item.note);
    setFormReceiptNo(item.receiptNo || '');
    setShowAddExpenseModal(true);
  };

  // Submit Expense Form
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(formAmount);
    if (isNaN(num) || num <= 0) {
      showNotification('Please enter a valid expense amount in DH');
      return;
    }
    if (!formNote.trim()) {
      showNotification('Please specify where this payment was used (Reason/Note is required)');
      return;
    }

    const mgr = currentManager ? `${currentManager.name}` : 'Manager';
    const nowTime = (() => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    })();

    const cleanDate = normalizeDate(formDate).formatted;

    if (editingExpense) {
      // Update
      const updated = expenses.map(exp => {
        if (exp.id === editingExpense.id) {
          return {
            ...exp,
            date: cleanDate,
            sourceFund: formSourceFund,
            category: formCategory,
            amount: num,
            paidTo: formPaidTo.trim() || 'Direct Supplier',
            note: formNote.trim(),
            receiptNo: formReceiptNo.trim() || exp.receiptNo,
            managerName: exp.managerName || mgr
          };
        }
        return exp;
      });
      saveExpenses(updated);
      showNotification(`Expense payment of ${num} DH updated successfully!`);
    } else {
      // Create new
      const newItem: ExtraExpenseItem = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: cleanDate,
        time: nowTime,
        sourceFund: formSourceFund,
        category: formCategory,
        amount: num,
        paidTo: formPaidTo.trim() || 'Direct Supplier',
        note: formNote.trim(),
        managerName: mgr,
        receiptNo: formReceiptNo.trim() || `REC-${Date.now().toString().slice(-5)}`,
        createdAt: Date.now()
      };
      saveExpenses([newItem, ...expenses]);
      showNotification(`Advance/Payment of ${num} DH logged from ${formSourceFund.toUpperCase()} extra fund!`);
    }

    setShowAddExpenseModal(false);
    setEditingExpense(null);
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    const item = expenses.find(e => e.id === id);
    if (item) {
      setExpenseToDelete(item);
    } else {
      const updated = expenses.filter(e => e.id !== id);
      saveExpenses(updated);
      showNotification('Expense payment removed');
    }
  };

  // Toggle Day Accordion
  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Copy Full Financial Summary
  const [copiedSummary, setCopiedSummary] = useState(false);
  const handleCopySummary = () => {
    const periodStr = activeMonthFilter === 'all' 
      ? `Full Year ${selectedYear}` 
      : `${getMonthName(activeMonthFilter as number)} ${selectedYear}`;
    
    let text = `AGM AGAFAY - EXTRA FUNDS & CONSUMPTION REPORT\n`;
    text += `Period: ${periodStr}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    text += `========================================\n`;
    text += `TOTAL EXTRA FUNDS EARNED : ${totals.totalInflow} DH\n`;
    text += ` - Quads Extras         : ${totals.quadsInflow} DH\n`;
    text += ` - Camels Extras        : ${totals.camelsInflow} DH\n`;
    text += ` - Personnel Extras     : ${totals.personnelInflow} DH\n\n`;
    text += `TOTAL CONSUMPTIONS PAID  : ${totals.totalOutflow} DH (${totals.percentSpent}% utilized)\n`;
    text += ` - Quads Repairs/Parts  : ${totals.quadsOutflow} DH\n`;
    text += ` - Camels Feed/Care     : ${totals.camelsOutflow} DH\n`;
    text += ` - Staff Advances       : ${totals.personnelOutflow} DH\n`;
    text += ` - General Supplies     : ${totals.generalOutflow} DH\n\n`;
    text += `----------------------------------------\n`;
    text += `NET REMAINING EXTRA LEFT : ${totals.netRemaining} DH\n`;
    text += `========================================\n\n`;
    text += `RECENT CONSUMPTIONS LOG (${filteredExpensesList.length} records):\n`;
    filteredExpensesList.slice(0, 20).forEach((e, idx) => {
      text += `${idx + 1}. [${e.date}] - ${e.amount} DH (${e.sourceFund.toUpperCase()}) | Paid to: ${e.paidTo} | Reason: ${e.note}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    showNotification('Extra funds & consumption report copied to clipboard!');
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const periodStr = activeMonthFilter === 'all' 
      ? `Year_${selectedYear}` 
      : `${getMonthName(activeMonthFilter as number)}_${selectedYear}`;

    let csv = `Date,Type,Fund_Source,Category,Recipient_PaidTo,Note_Reason,Manager,Receipt_No,Inflow_DH,Outflow_DH\n`;

    // Add all filtered expenses
    filteredExpensesList.forEach(e => {
      const cleanNote = `"${e.note.replace(/"/g, '""')}"`;
      const cleanPaidTo = `"${e.paidTo.replace(/"/g, '""')}"`;
      csv += `${e.date},Expense,${e.sourceFund},${e.category},${cleanPaidTo},${cleanNote},${e.managerName},${e.receiptNo || ''},0,${e.amount}\n`;
    });

    // Add daily extra inflows
    filteredDailyLedger.forEach(d => {
      if (d.totalInflowDH > 0) {
        csv += `${d.dateStr},Extra_Inflow,All,Quads_${d.quadsExtraCount}_Camels_${d.camelsExtraCount},"Excursions Extras","Daily Excursion Extra Inflows",Auto,N/A,${d.totalInflowDH},0\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AGM_Extra_Funds_Consumptions_${periodStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported Extra Funds & Consumptions to CSV!');
  };

  // Category Icon & Color Mapping
  const getCategoryMeta = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'repair':
        return { label: 'Repair & Maintenance', icon: Wrench, color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };
      case 'parts_product':
        return { label: 'Parts & Products', icon: ShoppingBag, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40' };
      case 'fuel_oil':
        return { label: 'Fuel & Oil', icon: Fuel, color: 'text-rose-400 bg-rose-950/60 border-rose-500/40' };
      case 'feed_animal':
        return { label: 'Camel Feed & Care', icon: Flame, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
      case 'advance_staff':
        return { label: 'Staff Advance', icon: Users, color: 'text-purple-400 bg-purple-950/60 border-purple-500/40' };
      case 'supplies':
        return { label: 'Cleaning & Supplies', icon: Sparkles, color: 'text-teal-400 bg-teal-950/60 border-teal-500/40' };
      default:
        return { label: 'General Operations', icon: Coins, color: 'text-zinc-400 bg-zinc-900 border-zinc-700' };
    }
  };

  return (
    <div className="w-full bg-[#03090d] text-zinc-100 font-sans flex flex-col h-full overflow-hidden select-none">
      {/* ================= 1. EXECUTIVE PINNED HEADER ================= */}
      <header className="bg-gradient-to-r from-[#071318] via-[#0a1e27] to-[#071318] border-b border-[#142833] shrink-0 z-30 shadow-2xl backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00c896] to-teal-600 text-zinc-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(0,200,150,0.35)] shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Extra Funds & Consumptions
                </h1>
                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  AGM EXCURSION LEDGER
                </span>
              </div>
              <p className="text-xs text-teal-300/80 font-mono flex items-center gap-2">
                <span>Extra Revenues, Staff Avances & Maintenance Expenses</span>
                <span className="text-zinc-500">&bull;</span>
                <span className="text-[#00e6a8] font-bold">
                  Manager: {currentManager ? currentManager.name : 'Active Station'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. ONE-CLICK ADD AVANCE / PAYMENT BUTTON */}
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-mono font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,200,150,0.3)] transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Log Payment / Avance</span>
            </button>

            {/* 2. Fleet & Extras Link */}
            {onOpenFleetModal && (
              <button
                type="button"
                onClick={onOpenFleetModal}
                className="bg-[#0c1c24] hover:bg-[#142e3b] text-teal-200 border border-[#193745] font-mono text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                title="Open Quads & Camels Fleet View"
              >
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Fleet View</span>
              </button>
            )}

            {/* 3. Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-[#0c1c24] hover:bg-[#142e3b] text-teal-200 border border-[#193745] font-mono text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              title="Export Ledger to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00e6a8]" />
              <span className="hidden md:inline">Export CSV</span>
            </button>

            {/* 4. Copy Report Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="bg-[#0c1c24] hover:bg-[#142e3b] text-teal-200 border border-[#193745] font-mono text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              title="Copy Summary Report"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-teal-400" />}
              <span className="hidden sm:inline">{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            {/* 5. Close Modal */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-[#0c1c24] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-[#193745] hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer"
                title="Close View"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Daily Ledger / Consumptions / Monthly Analytics) */}
        <div className="w-full px-4 sm:px-6 lg:px-8 border-t border-[#12242e] flex items-center justify-between flex-wrap gap-2 py-2">
          <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('daily_ledger')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'daily_ledger'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c1d25]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Daily Extra Ledger ({filteredDailyLedger.length} Days)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('consumptions_log')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'consumptions_log'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c1d25]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Consumptions Log ({filteredExpensesList.length} Records)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('monthly_summary')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'monthly_summary'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c1d25]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Monthly Balance & Left Reserve</span>
            </button>
          </div>

          {/* Quick Today's Snapshot Pill */}
          <div className="flex items-center gap-2 font-mono text-[11px] bg-[#071318] border border-[#142833] px-3 py-1 rounded-xl shrink-0">
            <span className="text-zinc-400">Today:</span>
            <span className="text-emerald-400 font-bold">+{totals.todayInflow} DH</span>
            <span className="text-zinc-500">|</span>
            <span className="text-rose-400 font-bold">-{totals.todayOutflow} DH</span>
            <span className="text-zinc-500">=</span>
            <span className={`font-black px-1.5 py-0.2 rounded ${totals.todayRemaining >= 0 ? 'text-[#00e6a8] bg-[#00c896]/10' : 'text-rose-400 bg-rose-950/40'}`}>
              Left: {totals.todayRemaining} DH
            </span>
          </div>
        </div>
      </header>

      {/* ================= 2. FILTER & TIME RANGE CONTROL BAR ================= */}
      <section className="bg-[#07151c] border-b border-[#12242f] py-3 shadow-md shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
          
          {/* Left Controls: Year, Month, Fund Category Filters */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[300px]">
            
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-[#0a1b22] border border-[#17323e] rounded-xl px-2.5 py-1 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#00e6a8]" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-[#0a1b22] text-white">
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-[#0a1b22] border border-[#17323e] rounded-xl px-2.5 py-1 text-xs font-mono">
              <select
                value={activeMonthFilter}
                onChange={(e) => setActiveMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0a1b22] text-white">All 12 Months</option>
                {MONTH_NAME_LIST.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-[#0a1b22] text-white">
                    {mName} ({String(idx + 1).padStart(2, '0')})
                  </option>
                ))}
              </select>
            </div>

            {/* Fund Source Tabs */}
            <div className="flex items-center bg-[#0a1b22] border border-[#17323e] p-0.5 rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setFundFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fundFilter === 'all' ? 'bg-[#00c896] text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Extras
              </button>
              <button
                type="button"
                onClick={() => setFundFilter('quads')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fundFilter === 'quads' ? 'bg-amber-400 text-zinc-950 font-black' : 'text-zinc-400 hover:text-amber-300'
                }`}
              >
                Quads
              </button>
              <button
                type="button"
                onClick={() => setFundFilter('camels')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fundFilter === 'camels' ? 'bg-orange-400 text-zinc-950 font-black' : 'text-zinc-400 hover:text-orange-300'
                }`}
              >
                Camels
              </button>
              <button
                type="button"
                onClick={() => setFundFilter('personnel')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fundFilter === 'personnel' ? 'bg-purple-400 text-zinc-950 font-black' : 'text-zinc-400 hover:text-purple-300'
                }`}
              >
                Personnel
              </button>
            </div>

            {/* Category Filter for Consumptions Tab */}
            {activeTab === 'consumptions_log' && (
              <div className="flex items-center gap-1.5 bg-[#0a1b22] border border-[#17323e] rounded-xl px-2.5 py-1 text-xs font-mono">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#0a1b22] text-white">All Categories</option>
                  <option value="repair" className="bg-[#0a1b22] text-white">Repair & Maintenance</option>
                  <option value="parts_product" className="bg-[#0a1b22] text-white">Parts & Products</option>
                  <option value="fuel_oil" className="bg-[#0a1b22] text-white">Fuel & Oil</option>
                  <option value="feed_animal" className="bg-[#0a1b22] text-white">Camel Feed</option>
                  <option value="advance_staff" className="bg-[#0a1b22] text-white">Staff Advance</option>
                  <option value="supplies" className="bg-[#0a1b22] text-white">Cleaning / Supplies</option>
                  <option value="other" className="bg-[#0a1b22] text-white">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search date, reason, supplier, guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a1b22] border border-[#17323e] rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-zinc-500 font-mono focus:border-[#00e6a8] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-teal-400 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================= SCROLLABLE BODY (KPIs & MAIN CONTENT TABS) ================= */}
      <div className="flex-1 overflow-y-auto overscroll-none">
        
        {/* ================= 3. TOP FINANCIAL KPI SUMMARY CARDS ================= */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          
          {/* Card 1: Total Extra Funds Inflow (Earned) */}
          <div className="bg-gradient-to-br from-[#0a1c24] to-[#071318] border border-[#173543] hover:border-emerald-500/50 p-4 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Total Extras Earned</span>
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-md font-black">
                INFLOW
              </span>
            </div>
            <div className="text-2xl font-black text-white">
              {totals.totalInflow} <span className="text-xs text-teal-400 font-normal">DH</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-3 mt-3 border-t border-[#142c38] text-[10px] text-zinc-400">
              <div>
                <span className="block text-zinc-500">Quads</span>
                <strong className="text-amber-400 font-extrabold">{totals.quadsInflow} DH</strong>
              </div>
              <div>
                <span className="block text-zinc-500">Camels</span>
                <strong className="text-orange-400 font-extrabold">{totals.camelsInflow} DH</strong>
              </div>
              <div>
                <span className="block text-zinc-500">Personnel</span>
                <strong className="text-purple-400 font-extrabold">{totals.personnelInflow} DH</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Total Consumptions & Avances Paid */}
          <div className="bg-gradient-to-br from-[#0a1c24] to-[#071318] border border-[#173543] hover:border-rose-500/50 p-4 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Total Consumptions Paid</span>
              </span>
              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-700/60 px-2 py-0.5 rounded-md font-black">
                OUTFLOW
              </span>
            </div>
            <div className="text-2xl font-black text-rose-300">
              {totals.totalOutflow} <span className="text-xs text-rose-400 font-normal">DH</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-3 mt-3 border-t border-[#142c38] text-[10px] text-zinc-400">
              <div>
                <span className="block text-zinc-500">Quads Spent</span>
                <strong className="text-rose-400 font-extrabold">{totals.quadsOutflow} DH</strong>
              </div>
              <div>
                <span className="block text-zinc-500">Camels Spent</span>
                <strong className="text-rose-400 font-extrabold">{totals.camelsOutflow} DH</strong>
              </div>
              <div>
                <span className="block text-zinc-500">Advances/Gen</span>
                <strong className="text-purple-400 font-extrabold">{totals.personnelOutflow + totals.generalOutflow} DH</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Net Remaining Balance (HOW MUCH IS LEFT) */}
          <div className={`bg-gradient-to-br from-[#0a1c24] to-[#071318] p-4 rounded-2xl shadow-2xl transition-all relative overflow-hidden group ${
            totals.netRemaining >= 0 
              ? 'border-2 border-[#00c896] shadow-[0_0_30px_rgba(0,200,150,0.15)]' 
              : 'border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#00e6a8]" />
                <span>Net Reserve Left</span>
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                totals.netRemaining >= 0 
                  ? 'bg-[#00c896] text-zinc-950' 
                  : 'bg-rose-600 text-white'
              }`}>
                {totals.netRemaining >= 0 ? 'SURPLUS' : 'DEFICIT'}
              </span>
            </div>
            <div className={`text-3xl font-black ${totals.netRemaining >= 0 ? 'text-[#00e6a8]' : 'text-rose-400'}`}>
              {totals.netRemaining > 0 ? `+${totals.netRemaining}` : totals.netRemaining} <span className="text-sm font-normal">DH</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-3 mt-3 border-t border-[#142c38] text-[10px] text-zinc-400">
              <div>
                <span className="block text-zinc-500">Quads Left</span>
                <strong className={`font-bold ${totals.quadsNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totals.quadsNet} DH
                </strong>
              </div>
              <div>
                <span className="block text-zinc-500">Camels Left</span>
                <strong className={`font-bold ${totals.camelsNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totals.camelsNet} DH
                </strong>
              </div>
              <div>
                <span className="block text-zinc-500">Staff Left</span>
                <strong className={`font-bold ${totals.personnelNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totals.personnelNet} DH
                </strong>
              </div>
            </div>
          </div>

          {/* Card 4: Fund Utilization & Activity */}
          <div className="bg-gradient-to-br from-[#0a1c24] to-[#071318] border border-[#173543] p-4 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#00e6a8]" />
                  <span>Reserve Utilization</span>
                </span>
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700/60 px-2 py-0.5 rounded-md font-black">
                  {totals.percentSpent}% USED
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-[#071318] h-2 rounded-full overflow-hidden border border-[#173543] mb-2">
                <div 
                  className={`h-full transition-all ${totals.percentSpent > 90 ? 'bg-rose-500' : totals.percentSpent > 60 ? 'bg-amber-400' : 'bg-[#00c896]'}`}
                  style={{ width: `${Math.min(100, totals.percentSpent)}%` }}
                />
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {filteredExpensesList.length} expenses logged. Extra reserves cover fleet parts, emergency maintenance, and staff cash advances.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="mt-3 w-full bg-[#122833] hover:bg-[#1a3847] text-[#00e6a8] border border-[#00c896]/40 hover:border-[#00e6a8] py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Log Payment / Avance</span>
            </button>
          </div>

        </div>
      </section>

        {/* ================= 4. MAIN CONTENT TABS ================= */}
        <main className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        
        {/* ================= TAB 1: DAILY EXTRA LEDGER ================= */}
        {activeTab === 'daily_ledger' && (
          <div className="space-y-4">
            
            {/* Tab Header Banner */}
            <div className="bg-[#09171e] border border-[#162d3a] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Daily Extra Funds & Consumptions Ledger
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Day-by-day extra earnings, maintenance advances, and remaining balance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Avance for Today</span>
                </button>
              </div>
            </div>

            {filteredDailyLedger.length === 0 ? (
              <div className="bg-[#071318] border border-[#142833] rounded-2xl p-12 text-center text-zinc-500 font-mono space-y-3">
                <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm">No daily extra records or consumptions match the selected filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMonthFilter('all');
                    setFundFilter('all');
                    setSearchQuery('');
                  }}
                  className="bg-[#0e222c] hover:bg-[#153443] text-teal-300 border border-[#1b3f52] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 font-mono">
                {filteredDailyLedger.map((day) => {
                  const isExpanded = Boolean(expandedDays[day.dateStr]);
                  const hasExpenses = day.expenses.length > 0;
                  const hasTrips = day.trips.length > 0;

                  return (
                    <div
                      key={day.dateStr}
                      className={`bg-[#071318] border rounded-2xl transition-all shadow-lg overflow-hidden ${
                        day.remainingBalanceDH < 0
                          ? 'border-rose-500/50'
                          : hasExpenses
                          ? 'border-[#1b3d4d] hover:border-[#00c896]/60'
                          : 'border-[#122631] hover:border-[#1a3847]'
                      }`}
                    >
                      {/* Day Header Row */}
                      <div
                        onClick={() => toggleDay(day.dateStr)}
                        className="p-4 bg-gradient-to-r from-[#091921] via-[#07141a] to-[#091921] flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-[#0c222c] transition-colors"
                      >
                        {/* Date & Day Badges */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#00c896]/15 border border-[#00c896]/30 text-[#00e6a8] flex items-center justify-center font-black text-sm shrink-0">
                            {day.normDate.day ? String(day.normDate.day).padStart(2, '0') : '00'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                {day.normDate.display}
                              </h4>
                              {hasTrips && (
                                <span className="bg-[#122b37] text-teal-300 border border-[#1d4457] px-2 py-0.2 rounded text-[10px] font-bold">
                                  {day.trips.length} Tours
                                </span>
                              )}
                              {hasExpenses && (
                                <span className="bg-rose-950/80 text-rose-300 border border-rose-700/60 px-2 py-0.2 rounded text-[10px] font-black flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  {day.expenses.length} Consumptions
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {getMonthName(day.normDate.month)} {day.normDate.year}
                            </p>
                          </div>
                        </div>

                        {/* Breakdown Metrics for This Day */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
                          {/* Extra Quads Inflow */}
                          <div className="bg-[#050e12] border border-[#142c38] px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Quads Extra</span>
                            <strong className="text-amber-400 font-extrabold">+{day.quadsExtraDH} DH</strong>
                            <span className="text-[10px] text-zinc-400 ml-1">({day.quadsExtraCount} Q)</span>
                          </div>

                          {/* Extra Camels Inflow */}
                          <div className="bg-[#050e12] border border-[#142c38] px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Camels Extra</span>
                            <strong className="text-orange-400 font-extrabold">+{day.camelsExtraDH} DH</strong>
                            <span className="text-[10px] text-zinc-400 ml-1">({day.camelsExtraCount} C)</span>
                          </div>

                          {/* Extra Pax/Personnel */}
                          <div className="bg-[#050e12] border border-[#142c38] px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Pax Extra</span>
                            <strong className="text-purple-400 font-extrabold">+{day.personnelExtraDH} DH</strong>
                          </div>

                          {/* Total Day Inflow */}
                          <div className="bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-emerald-400 uppercase block font-bold">Total Inflow</span>
                            <strong className="text-emerald-300 font-black">+{day.totalInflowDH} DH</strong>
                          </div>

                          {/* Consumed / Outflow */}
                          <div className="bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-xl">
                            <span className="text-[9px] text-rose-400 uppercase block font-bold">Paid / Avances</span>
                            <strong className="text-rose-300 font-black">-{day.totalConsumedDH} DH</strong>
                          </div>

                          {/* NET REMAINING LEFT FOR THIS DAY */}
                          <div className={`px-3.5 py-1.5 rounded-xl border font-black ${
                            day.remainingBalanceDH >= 0
                              ? 'bg-[#00c896]/15 border-[#00c896]/40 text-[#00e6a8]'
                              : 'bg-rose-600/20 border-rose-500/60 text-rose-400'
                          }`}>
                            <span className="text-[9px] uppercase block font-bold opacity-80">Left This Day</span>
                            <span className="text-sm font-black">
                              {day.remainingBalanceDH >= 0 ? `+${day.remainingBalanceDH}` : day.remainingBalanceDH} DH
                            </span>
                          </div>

                          {/* Action Button & Expand Chevron */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(day.dateStr);
                              }}
                              className="bg-[#0a202a] hover:bg-[#123140] text-[#00e6a8] border border-[#00c896]/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                              title="Add Avance/Payment for this date"
                            >
                              + Avance
                            </button>

                            {onSelectTripDate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTripDate(day.dateStr);
                                }}
                                className="bg-[#0a202a] hover:bg-[#123140] text-teal-300 border border-[#193d4f] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                title="Open this date in daily excursion planner"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div className="text-zinc-400 p-1">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Content for the Day: Consumptions & Excursions Generating Extras */}
                      {isExpanded && (
                        <div className="p-4 border-t border-[#122631] bg-[#050e12] space-y-4">
                          
                          {/* 1. Consumptions & Payments Log for this Day */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span>Payments / Consumptions Paid on {day.normDate.display} ({day.expenses.length})</span>
                              </h5>
                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(day.dateStr)}
                                className="text-xs text-[#00e6a8] hover:underline cursor-pointer font-bold"
                              >
                                + Add Expense for {day.normDate.display}
                              </button>
                            </div>

                            {day.expenses.length === 0 ? (
                              <div className="bg-[#08151b] border border-[#142833] rounded-xl p-3 text-xs text-zinc-500 text-center">
                                No expenses or advances registered for this day. Remaining extra stays 100% in reserve.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {day.expenses.map(exp => {
                                  const meta = getCategoryMeta(exp.category);
                                  const IconComponent = meta.icon;

                                  return (
                                    <div
                                      key={exp.id}
                                      className="bg-[#091a22] border border-[#183645] rounded-xl p-3 space-y-2 relative group hover:border-[#00e6a8]/50 transition-all"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1.5 rounded-lg border text-xs ${meta.color}`}>
                                            <IconComponent className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                            <span className="text-xs font-bold text-white uppercase block">
                                              {exp.paidTo}
                                            </span>
                                            <span className="text-[10px] text-zinc-400">
                                              Deducted from: <strong className="text-teal-300 uppercase">{exp.sourceFund} Extras</strong>
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <span className="text-sm font-black text-rose-400">
                                            -{exp.amount} DH
                                          </span>
                                          {exp.time && (
                                            <span className="text-[10px] text-zinc-500 block">
                                              @ {exp.time}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Note / Reason (Why it was paid) */}
                                      <div className="bg-[#050f14] border border-[#132b38] rounded-lg p-2 text-xs text-zinc-200">
                                        <span className="text-[10px] text-teal-400 font-bold uppercase block mb-0.5">
                                          Reason & Usage Note:
                                        </span>
                                        <p className="italic">"{exp.note}"</p>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-[#122631]">
                                        <span>Paid By: <strong className="text-zinc-300">{exp.managerName}</strong></span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedVoucher(exp)}
                                            className="text-teal-400 hover:text-white cursor-pointer font-bold flex items-center gap-1"
                                            title="View Payment Voucher"
                                          >
                                            <Receipt className="w-3 h-3" />
                                            <span>Voucher</span>
                                          </button>
                                          <span>&bull;</span>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(exp)}
                                            className="text-amber-400 hover:text-white cursor-pointer font-bold"
                                          >
                                            Edit
                                          </button>
                                          <span>&bull;</span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteExpense(exp.id)}
                                            className="text-rose-400 hover:text-rose-300 cursor-pointer font-bold"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* 2. Excursions Generating Extras on this Day */}
                          <div className="pt-2 border-t border-[#122631]">
                            <h5 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Excursion Tours Generating Extras ({day.trips.length} tours)</span>
                            </h5>

                            {day.trips.length === 0 ? (
                              <div className="bg-[#08151b] border border-[#142833] rounded-xl p-3 text-xs text-zinc-500 text-center">
                                No tour trip records logged for this day.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse font-mono">
                                  <thead>
                                    <tr className="bg-[#08151b] text-zinc-400 border-b border-[#142833] text-[10px] uppercase">
                                      <th className="p-2">Time</th>
                                      <th className="p-2">Tour Guide</th>
                                      <th className="p-2">Driver</th>
                                      <th className="p-2">Company</th>
                                      <th className="p-2">Pax</th>
                                      <th className="p-2">Quads Extra</th>
                                      <th className="p-2">Camels Extra</th>
                                      <th className="p-2">Personnel Extra</th>
                                      <th className="p-2 text-right">Extra Payment</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#10232c]">
                                    {day.trips.map((t, idx) => (
                                      <tr key={t.id || idx} className="hover:bg-[#0a1f28] transition-colors text-zinc-300">
                                        <td className="p-2 text-white font-bold">{t.time || '10:00'}</td>
                                        <td className="p-2 text-emerald-400 font-bold uppercase">{t.guide}</td>
                                        <td className="p-2 text-white uppercase">{t.driver || 'No Driver'}</td>
                                        <td className="p-2 text-zinc-400">{t.company || 'AGM'}</td>
                                        <td className="p-2 text-white font-bold">{t.pax}</td>
                                        <td className="p-2">
                                          {t.qExtraCount > 0 ? (
                                            <span className="text-amber-400 font-bold">
                                              {t.qExtraCount} Q ({t.qExtraPay} DH)
                                            </span>
                                          ) : (
                                            <span className="text-zinc-600">-</span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {t.cExtraCount > 0 ? (
                                            <span className="text-orange-400 font-bold">
                                              {t.cExtraCount} C ({t.cExtraPay} DH)
                                            </span>
                                          ) : (
                                            <span className="text-zinc-600">-</span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {t.pExtraCount > 0 ? (
                                            <span className="text-purple-400 font-bold">
                                              {t.pExtraCount} Pax ({t.pExtraPay} DH)
                                            </span>
                                          ) : (
                                            <span className="text-zinc-600">-</span>
                                          )}
                                        </td>
                                        <td className="p-2 text-right">
                                          <strong className="text-emerald-400 font-black text-sm">
                                            {t.totalExtraPay > 0 ? `+${t.totalExtraPay} DH` : '0 DH'}
                                          </strong>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ================= TAB 2: CONSUMPTIONS & AVANCES LOG REGISTER ================= */}
        {activeTab === 'consumptions_log' && (
          <div className="space-y-4">
            
            {/* Header Banner */}
            <div className="bg-[#09171e] border border-[#162d3a] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Full Consumptions & Avances Register
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Comprehensive log of all maintenance, parts, feed, and advances paid from extra funds
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="bg-gradient-to-r from-[#00c896] to-teal-400 hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add New Avance</span>
                </button>
              </div>
            </div>

            {filteredExpensesList.length === 0 ? (
              <div className="bg-[#071318] border border-[#142833] rounded-2xl p-12 text-center text-zinc-500 font-mono space-y-3">
                <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm">No expenses or advances found for the selected filter.</p>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="bg-[#00c896] text-zinc-950 font-black text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Expense</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#071318] border border-[#142833] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-[#091c25] text-teal-300 border-b border-[#142833] text-[11px] uppercase tracking-wider">
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5">Source Fund</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Paid To / Recipient</th>
                        <th className="p-3.5 min-w-[260px]">Reason / Usage Note</th>
                        <th className="p-3.5">Manager</th>
                        <th className="p-3.5 text-right">Amount Paid</th>
                        <th className="p-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#10232c]">
                      {filteredExpensesList.map((exp) => {
                        const meta = getCategoryMeta(exp.category);
                        const IconComponent = meta.icon;
                        const norm = normalizeDate(exp.date);

                        return (
                          <tr key={exp.id} className="hover:bg-[#0a202c] transition-colors text-zinc-200">
                            
                            {/* Date & Time */}
                            <td className="p-3.5">
                              <span className="font-bold text-white block">{norm.display}</span>
                              <span className="text-[10px] text-zinc-500">{exp.time || '12:00'}</span>
                            </td>

                            {/* Source Fund */}
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                                exp.sourceFund === 'quads'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : exp.sourceFund === 'camels'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                                  : exp.sourceFund === 'personnel'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                  : 'bg-teal-950 text-teal-300 border border-teal-500/40'
                              }`}>
                                {exp.sourceFund === 'quads' && 'Quads Extra'}
                                {exp.sourceFund === 'camels' && 'Camels Extra'}
                                {exp.sourceFund === 'personnel' && 'Personnel Extra'}
                                {exp.sourceFund === 'general' && 'General Extra'}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${meta.color}`}>
                                <IconComponent className="w-3 h-3" />
                                <span>{meta.label}</span>
                              </span>
                            </td>

                            {/* Paid To */}
                            <td className="p-3.5">
                              <span className="font-bold text-white block">{exp.paidTo}</span>
                              {exp.receiptNo && (
                                <span className="text-[9px] text-zinc-500 block">{exp.receiptNo}</span>
                              )}
                            </td>

                            {/* Note / Usage (WHY THEY PAID IT) */}
                            <td className="p-3.5">
                              <div className="bg-[#050f14] border border-[#132b38] rounded-lg p-2 text-zinc-200">
                                <p className="leading-relaxed">"{exp.note}"</p>
                              </div>
                            </td>

                            {/* Manager */}
                            <td className="p-3.5 text-zinc-400">
                              <span className="text-xs text-white font-bold">{exp.managerName}</span>
                            </td>

                            {/* Amount */}
                            <td className="p-3.5 text-right">
                              <strong className="text-base font-black text-rose-400">
                                -{exp.amount} <span className="text-xs">DH</span>
                              </strong>
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedVoucher(exp)}
                                  className="p-1.5 rounded-lg bg-[#0e2430] text-teal-300 hover:text-white border border-[#1c4558] hover:border-teal-400 transition-all cursor-pointer"
                                  title="View Voucher"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(exp)}
                                  className="p-1.5 rounded-lg bg-[#0e2430] text-amber-400 hover:text-white border border-[#1c4558] hover:border-amber-400 transition-all cursor-pointer"
                                  title="Edit Payment"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1.5 rounded-lg bg-[#0e2430] text-rose-400 hover:text-rose-300 border border-[#1c4558] hover:border-rose-400 transition-all cursor-pointer"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= TAB 3: MONTHLY BALANCE MATRIX & LEFT RESERVE ================= */}
        {activeTab === 'monthly_summary' && (
          <div className="space-y-4">
            
            {/* Header Banner */}
            <div className="bg-[#09171e] border border-[#162d3a] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Monthly Extra Reserves & Consumption Breakdown ({selectedYear})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Monthly audit showing how much extra revenue was earned, spent, and remaining left
                  </p>
                </div>
              </div>

              <div className="text-xs text-right">
                <span className="text-zinc-400 block">Annual Net Surplus Left:</span>
                <strong className={`text-base font-black ${totals.netRemaining >= 0 ? 'text-[#00e6a8]' : 'text-rose-400'}`}>
                  {totals.netRemaining >= 0 ? `+${totals.netRemaining}` : totals.netRemaining} DH
                </strong>
              </div>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 font-mono">
              {monthlyMatrix.map((m) => {
                const isPositive = m.netRemaining >= 0;
                const hasActivity = m.inflow > 0 || m.outflow > 0;

                return (
                  <div
                    key={m.monthNum}
                    onClick={() => {
                      setActiveMonthFilter(m.monthNum);
                      setActiveTab('daily_ledger');
                    }}
                    className={`bg-[#071318] border rounded-2xl p-4 transition-all cursor-pointer shadow-lg hover:shadow-teal-950/30 group ${
                      activeMonthFilter === m.monthNum
                        ? 'border-[#00c896] bg-[#091d26]'
                        : hasActivity
                        ? 'border-[#17323f] hover:border-[#00c896]/60'
                        : 'border-[#10232c] opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-[#122631] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#00c896]/10 text-[#00e6a8] flex items-center justify-center font-black text-xs">
                          {String(m.monthNum).padStart(2, '0')}
                        </span>
                        <h4 className="text-sm font-black text-white uppercase group-hover:text-[#00e6a8] transition-colors">
                          {m.monthName}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isPositive ? 'bg-[#00c896]/20 text-[#00e6a8]' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {isPositive ? 'Surplus' : 'Deficit'}
                      </span>
                    </div>

                    {/* Financial Inflow vs Outflow */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Total Inflow:</span>
                        <strong className="text-emerald-400 font-bold">+{m.inflow} DH</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Consumptions:</span>
                        <strong className="text-rose-400 font-bold">-{m.outflow} DH</strong>
                      </div>
                      <div className="pt-2 border-t border-[#122631] flex items-center justify-between text-sm">
                        <span className="text-white font-bold">Left Reserve:</span>
                        <strong className={`font-black ${isPositive ? 'text-[#00e6a8]' : 'text-rose-400'}`}>
                          {m.netRemaining > 0 ? `+${m.netRemaining}` : m.netRemaining} DH
                        </strong>
                      </div>
                    </div>

                    {/* Category Details in Month */}
                    <div className="grid grid-cols-2 gap-1.5 bg-[#050e12] p-2 rounded-xl border border-[#122631] mt-3 text-[10px]">
                      <div>
                        <span className="text-zinc-500 block">Quads Extra:</span>
                        <span className="text-amber-400 font-bold">+{m.quadInflow} DH</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Camels Extra:</span>
                        <span className="text-orange-400 font-bold">+{m.camelInflow} DH</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Quads Spent:</span>
                        <span className="text-rose-400 font-bold">-{m.quadOutflow} DH</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Camels Spent:</span>
                        <span className="text-rose-400 font-bold">-{m.camelOutflow} DH</span>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-[#122631] flex items-center justify-between text-[11px] text-teal-400 font-bold group-hover:text-white">
                      <span>Explore {m.daysCount} Active Days</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        </main>
      </div>

      {/* ================= 5. ONE-CLICK ADD / EDIT AVANCE & CONSUMPTION MODAL ================= */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#091820] border border-[#1d4150] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative text-left font-mono space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-[#0e2531] p-2 rounded-full border border-[#1b3d4d] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title & Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00c896] to-teal-600 text-zinc-950 flex items-center justify-center font-black shadow-lg shrink-0">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">
                    {editingExpense ? 'Edit Avance / Payment' : 'Log Avance & Maintenance Payment'}
                  </h2>
                  <p className="text-xs text-teal-300/80">
                    Paid directly from daily extra funds (Quads, Camels, Personnel)
                  </p>
                </div>
              </div>

              {/* Live Remaining Balance Pill in Modal */}
              <div className="bg-[#050f14] border border-[#132c38] rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Available Extra Reserve for Period:</span>
                <strong className={`font-black text-sm ${totals.netRemaining >= 0 ? 'text-[#00e6a8]' : 'text-rose-400'}`}>
                  {totals.netRemaining} DH
                </strong>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
                
                {/* 1. Date & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Date (DD-MM-YYYY) *
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        placeholder="10-08-2026"
                        required
                        className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setFormDate(normalizeDate(new Date().toISOString()).formatted)}
                          className="text-[#00e6a8] hover:underline cursor-pointer"
                        >
                          Today
                        </button>
                        <span className="text-zinc-600">&bull;</span>
                        <button
                          type="button"
                          onClick={() => {
                            const y = new Date();
                            y.setDate(y.getDate() - 1);
                            setFormDate(normalizeDate(y.toISOString()).formatted);
                          }}
                          className="text-zinc-400 hover:text-white cursor-pointer"
                        >
                          Yesterday
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Amount to Pay (DH) *
                    </label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g. 350"
                      required
                      min="1"
                      className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none text-base font-black text-[#00e6a8]"
                    />
                  </div>
                </div>

                {/* 2. CHOOSE FROM WHICH EXTRA FUND TO PAY */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Deduct Payment From Which Extra Fund? *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSourceFund('quads')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        formSourceFund === 'quads'
                          ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-md font-black'
                          : 'bg-[#0c1f29] border-[#183645] text-zinc-400 hover:text-white'
                      }`}
                    >
                      Quads Extra
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormSourceFund('camels')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        formSourceFund === 'camels'
                          ? 'bg-orange-950 border-orange-400 text-orange-300 shadow-md font-black'
                          : 'bg-[#0c1f29] border-[#183645] text-zinc-400 hover:text-white'
                      }`}
                    >
                      Camels Extra
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormSourceFund('personnel')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        formSourceFund === 'personnel'
                          ? 'bg-purple-950 border-purple-400 text-purple-300 shadow-md font-black'
                          : 'bg-[#0c1f29] border-[#183645] text-zinc-400 hover:text-white'
                      }`}
                    >
                      Personnel Extra
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormSourceFund('general')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        formSourceFund === 'general'
                          ? 'bg-teal-950 border-teal-400 text-teal-300 shadow-md font-black'
                          : 'bg-[#0c1f29] border-[#183645] text-zinc-400 hover:text-white'
                      }`}
                    >
                      General Pool
                    </button>
                  </div>
                </div>

                {/* 3. Category & Paid To */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Expense Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="repair">Repair & Maintenance</option>
                      <option value="parts_product">Parts & Products</option>
                      <option value="fuel_oil">Fuel & Oil</option>
                      <option value="feed_animal">Camel Feed & Care</option>
                      <option value="advance_staff">Staff / Guide Advance</option>
                      <option value="supplies">Cleaning & Supplies</option>
                      <option value="other">Other Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Paid To / Supplier / Recipient
                    </label>
                    <input
                      type="text"
                      value={formPaidTo}
                      onChange={(e) => setFormPaidTo(e.target.value)}
                      placeholder="e.g. Mechanic Hassan / Moto Parts"
                      className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none"
                    />

                    {/* Quick Staff Selection for Advances */}
                    {formCategory === 'advance_staff' && staffList.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-zinc-500">Pick:</span>
                        {staffList.slice(0, 5).map(sName => (
                          <button
                            key={sName}
                            type="button"
                            onClick={() => setFormPaidTo(sName)}
                            className="text-[10px] bg-[#0d232e] text-teal-300 px-1.5 py-0.2 rounded hover:bg-[#153443] cursor-pointer"
                          >
                            {sName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. NOTE / REASON (WHERE DID YOU USE THIS PAYMENT?) - PROMINENT */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                      Where Did You Use This Payment? (Reason & Note) *
                    </label>
                    <span className="text-[10px] text-zinc-500">Required</span>
                  </div>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="e.g. To buy oil filter and brake pads for Quad #4, or emergency camel harness repair..."
                    rows={3}
                    required
                    className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none placeholder-zinc-500"
                  />

                  {/* Preset Quick Notes */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500 font-bold">Quick suggestions:</span>
                    {PRESET_NOTES.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormNote(p.text);
                          setFormSourceFund(p.fund as ExtraFundSource);
                          setFormCategory(p.cat as ExpenseCategory);
                        }}
                        className="text-[10px] bg-[#0a1820] hover:bg-[#122c39] text-zinc-300 hover:text-white border border-[#163341] px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Voucher/Receipt No */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Receipt / Voucher Reference No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={formReceiptNo}
                    onChange={(e) => setFormReceiptNo(e.target.value)}
                    placeholder="REC-2026-081"
                    className="w-full rounded-xl border border-[#193744] bg-[#0c1f29] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none text-zinc-300 font-mono"
                  />
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,200,150,0.3)] cursor-pointer"
                  >
                    {editingExpense ? 'Update Payment' : 'Confirm & Deduct from Extras'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(false)}
                    className="px-4 py-3 rounded-xl bg-[#0a1820] hover:bg-[#122a36] text-zinc-400 hover:text-white border border-[#163341] text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 6. PAYMENT VOUCHER / RECEIPT MODAL ================= */}
      <AnimatePresence>
        {selectedVoucher && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#091820] border border-[#1d4150] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-left font-mono space-y-5"
            >
              {/* Close */}
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-[#0e2531] p-2 rounded-full border border-[#1b3d4d] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Voucher Header */}
              <div className="border-b border-[#153443] pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#00e6a8]" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">
                      AGM EXCURSION EXPENSE VOUCHER
                    </span>
                  </div>
                  <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded text-[10px] font-bold">
                    PAID
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2">
                  <span>Ref: <strong className="text-white font-mono">{selectedVoucher.receiptNo || selectedVoucher.id}</strong></span>
                  <span>Date: <strong className="text-white">{normalizeDate(selectedVoucher.date).display} {selectedVoucher.time ? `@ ${selectedVoucher.time}` : ''}</strong></span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-[#050f14] border border-[#132c38] rounded-2xl p-4 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Amount Paid</span>
                <div className="text-3xl font-black text-rose-400">
                  {selectedVoucher.amount} <span className="text-sm font-normal">DH</span>
                </div>
                <span className="text-[10px] text-teal-300 font-bold uppercase block mt-1">
                  Deducted from {selectedVoucher.sourceFund.toUpperCase()} Extra Reserve
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#122631] pb-1.5">
                  <span className="text-zinc-400">Paid To / Recipient:</span>
                  <strong className="text-white uppercase">{selectedVoucher.paidTo}</strong>
                </div>
                <div className="flex justify-between border-b border-[#122631] pb-1.5">
                  <span className="text-zinc-400">Expense Category:</span>
                  <strong className="text-teal-300 uppercase">{selectedVoucher.category.replace('_', ' ')}</strong>
                </div>
                <div className="flex justify-between border-b border-[#122631] pb-1.5">
                  <span className="text-zinc-400">Authorizing Manager:</span>
                  <strong className="text-white">{selectedVoucher.managerName}</strong>
                </div>
                <div className="pt-1">
                  <span className="text-zinc-400 block mb-1">Reason & Usage Note:</span>
                  <div className="bg-[#050f14] border border-[#132c38] rounded-xl p-3 text-zinc-200 text-xs italic">
                    "{selectedVoucher.note}"
                  </div>
                </div>
              </div>

              {/* Voucher Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const voucherText = `AGM EXPENSE VOUCHER\nRef: ${selectedVoucher.receiptNo || selectedVoucher.id}\nDate: ${normalizeDate(selectedVoucher.date).display}\nAmount: ${selectedVoucher.amount} DH\nPaid To: ${selectedVoucher.paidTo}\nFund: ${selectedVoucher.sourceFund.toUpperCase()}\nReason: ${selectedVoucher.note}\nManager: ${selectedVoucher.managerName}`;
                    navigator.clipboard.writeText(voucherText);
                    showNotification('Voucher details copied to clipboard!');
                  }}
                  className="flex-1 bg-[#122833] hover:bg-[#1a3847] text-[#00e6a8] border border-[#00c896]/40 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Voucher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#0a1820] hover:bg-[#122a36] text-zinc-400 hover:text-white border border-[#163341] text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Expense Delete Confirmation In-App Modal */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09151a] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Delete Expense / Avance?
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Remove payment record & restore balance to reserve
                  </p>
                </div>
              </div>

              <div className="bg-[#050f14] border border-[#132b38] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Recipient / Paid To:</span>
                  <span className="text-white font-bold">{expenseToDelete.paidTo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Source Fund:</span>
                  <span className="text-teal-300 font-bold uppercase">{expenseToDelete.sourceFund} Extras</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Date:</span>
                  <span className="text-zinc-200">{normalizeDate(expenseToDelete.date).display}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#132b38] pt-2">
                  <span className="text-zinc-400">Amount:</span>
                  <span className="text-rose-400 font-black text-sm">-{expenseToDelete.amount} DH</span>
                </div>
                {expenseToDelete.note && (
                  <div className="text-[11px] text-zinc-400 italic pt-1">
                    "{expenseToDelete.note}"
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="flex-1 py-2.5 bg-[#050b0e] hover:bg-[#0a141a] text-zinc-300 font-bold text-xs rounded-xl border border-[#182e3b] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToRemove = expenseToDelete.id;
                    const updated = expenses.filter(e => e.id !== idToRemove);
                    saveExpenses(updated);
                    showNotification(`Expense payment of ${expenseToDelete.amount} DH removed`);
                    setExpenseToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all uppercase flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
