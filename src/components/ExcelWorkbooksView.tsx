import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  CalendarDays,
  Flame,
  Activity,
  Users,
  Search,
  Layers,
  Sparkles,
  Table,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Eye
} from 'lucide-react';
import { ResultItem, DriverItemData } from './StaffProfilesView';

export interface ExcelWorkbooksViewProps {
  results: ResultItem[];
  showExcelModal: boolean;
  currentDate?: string;
  onClose: () => void;
  showNotification: (msg: string) => void;
  onSelectTripDate?: (date: string) => void;
  onSelectStaff?: (staffName: string) => void;
}

// Date parsing helper
export function parseDateParts(dStr?: string) {
  const today = new Date();
  let dayNum = today.getDate();
  let monthNum = today.getMonth() + 1;
  let yearNum = today.getFullYear();

  if (dStr) {
    const clean = dStr.trim();
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        yearNum = parseInt(parts[0], 10) || yearNum;
        monthNum = parseInt(parts[1], 10) || monthNum;
        dayNum = parseInt(parts[2], 10) || dayNum;
      } else {
        // DD-MM-YYYY
        dayNum = parseInt(parts[0], 10) || dayNum;
        monthNum = parseInt(parts[1], 10) || monthNum;
        yearNum = parseInt(parts[2], 10) || yearNum;
      }
    }
  }

  const rawDay = String(dayNum).padStart(2, '0');
  const rawMonth = String(monthNum).padStart(2, '0');
  const rawYear = String(yearNum);
  const fullDate = `${rawDay}-${rawMonth}-${rawYear}`;

  return { day: dayNum, month: monthNum, year: yearNum, rawDay, rawMonth, rawYear, fullDate };
}

export const MONTH_NAMES_MAP: { [key: string]: string } = {
  '01': '01 - January',
  '02': '02 - February',
  '03': '03 - March',
  '04': '04 - April',
  '05': '05 - May',
  '06': '06 - June',
  '07': '07 - July',
  '08': '08 - August',
  '09': '09 - September',
  '10': '10 - October',
  '11': '11 - November',
  '12': '12 - December',
};

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const ExcelWorkbooksView: React.FC<ExcelWorkbooksViewProps> = ({
  results,
  showExcelModal,
  currentDate,
  onClose,
  showNotification,
  onSelectTripDate,
  onSelectStaff,
}) => {
  // Parse the current working date from workstation
  const initialDateParts = useMemo(() => parseDateParts(currentDate), [currentDate]);

  // 3-tier view level: 'day' (Day view table) | 'month' (Month breakdown) | 'year' (Yearly overview)
  // Default to 'day' so user immediately sees the day they are working on!
  const [viewLevel, setViewLevel] = useState<'day' | 'month' | 'year'>('day');
  
  // Selection states
  const [selectedYear, setSelectedYear] = useState<string>(() => initialDateParts.rawYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => initialDateParts.rawMonth);
  const [selectedDay, setSelectedDay] = useState<string>(() => initialDateParts.fullDate);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllMonthDaysStacked, setShowAllMonthDaysStacked] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Sync with currentDate when modal opens or currentDate changes
  useEffect(() => {
    if (showExcelModal && currentDate) {
      const p = parseDateParts(currentDate);
      setSelectedYear(p.rawYear);
      setSelectedMonth(p.rawMonth);
      setSelectedDay(p.fullDate);
      setViewLevel('day');
    }
  }, [showExcelModal, currentDate]);

  // Helper payment extractors
  const getPersonPay = (r: ResultItem) => {
    if (r.person_extra_pay && r.person_extra_pay !== 'None') return r.person_extra_pay;
    if (r.person_extra && r.person_extra !== 'None' && r.person_extra !== '0') return r.extra_payment || '0 DH';
    return '0 DH';
  };
  const getQuadPay = (r: ResultItem) => {
    if (r.quad_extra_pay && r.quad_extra_pay !== 'None') return r.quad_extra_pay;
    if (r.quad_extra && r.quad_extra !== 'None' && r.quad_extra !== '0') return r.extra_payment || '0 DH';
    return '0 DH';
  };
  const getCamelPay = (r: ResultItem) => {
    if (r.camel_extra_pay && r.camel_extra_pay !== 'None') return r.camel_extra_pay;
    if (r.camel_extra && r.camel_extra !== 'None' && r.camel_extra !== '0') return r.extra_payment || '0 DH';
    return '0 DH';
  };

  // Helper to calculate total guides, total drivers, and total H1 drivers
  const getStaffCounts = (trips: ResultItem[]) => {
    const guidesSet = new Set<string>();
    const driversSet = new Set<string>();
    const h1DriversSet = new Set<string>();

    trips.forEach(r => {
      const isMini = r.van_type === 'Mini van';
      const gRaw = (r.guide || '').trim().toUpperCase();

      // Guide check (excluding WITHOUT GUIDE, H1, ?, NONE, and mini vans)
      if (!isMini && gRaw && gRaw !== 'WITHOUT GUIDE' && gRaw !== 'H1' && gRaw !== '?' && gRaw !== 'NONE') {
        guidesSet.add(gRaw);
      }

      // Drivers (multi-driver or single driver)
      const dList: DriverItemData[] = (r.driversList && r.driversList.length > 0)
        ? r.driversList
        : [{ driver: r.driver, van_type: (r.van_type as any) || 'Big van', company: r.company || 'AGM' }];

      dList.forEach(drv => {
        const drvName = (drv.driver || '').trim().toUpperCase();
        if (drvName && drvName !== '?' && drvName !== 'NONE') {
          const isH1 = drv.van_type === 'Mini van' || isMini || gRaw === 'H1' || drvName.startsWith('H1-') || drvName === 'H1';
          if (isH1) {
            h1DriversSet.add(drvName);
          } else {
            driversSet.add(drvName);
          }
        }
      });
    });

    return {
      totalGuides: guidesSet.size,
      totalDrivers: driversSet.size,
      totalH1Drivers: h1DriversSet.size,
    };
  };

  const isRecordComplete = (item: ResultItem) => {
    const isMini = item.van_type === 'Mini van';
    const finalGuideName = isMini ? 'H1' : (item.guide || '').trim();
    if (!finalGuideName || !(item.driver || '').trim() || finalGuideName === '?' || item.driver === '?') {
      return false;
    }
    const numbers = [item.pax, item.quads, item.camels];
    for (const num of numbers) {
      const val = (num || '').trim();
      if (!val || val === '?') return false;
      if (val.toLowerCase() === 'none') continue;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 0) return false;
    }
    return true;
  };

  // Available Years in Results
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    if (initialDateParts.rawYear) set.add(initialDateParts.rawYear);
    results.forEach(r => {
      const p = parseDateParts(r.date);
      if (p.rawYear) set.add(p.rawYear);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [results, initialDateParts.rawYear]);

  // Available Months for selected year
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      const p = parseDateParts(r.date);
      if (selectedYear === 'ALL' || p.rawYear === selectedYear) {
        if (p.rawMonth) set.add(p.rawMonth);
      }
    });
    // If empty for this year, include initial month
    if (set.size === 0 && initialDateParts.rawMonth) {
      set.add(initialDateParts.rawMonth);
    }
    return Array.from(set).sort();
  }, [results, selectedYear, initialDateParts.rawMonth]);

  // Available Workdays in results for selected year & month
  const availableWorkdaysInMonth = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      const p = parseDateParts(r.date);
      if (selectedYear !== 'ALL' && p.rawYear !== selectedYear) return;
      if (selectedMonth !== 'ALL' && p.rawMonth !== selectedMonth) return;
      if (p.fullDate) set.add(p.fullDate);
    });
    return Array.from(set).sort((a, b) => {
      const pA = parseDateParts(a);
      const pB = parseDateParts(b);
      return pA.day - pB.day;
    });
  }, [results, selectedYear, selectedMonth]);

  // Filtered Results based on active viewLevel and selections
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const p = parseDateParts(r.date);
      
      // Level 1: Year View (only filter by Year if not ALL)
      if (viewLevel === 'year') {
        if (selectedYear !== 'ALL' && p.rawYear !== selectedYear) return false;
      }
      
      // Level 2: Month View (filter by Year and Month)
      if (viewLevel === 'month') {
        if (selectedYear !== 'ALL' && p.rawYear !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && p.rawMonth !== selectedMonth) return false;
      }

      // Level 3: Day View (filter by Year, Month, and specific Day if not showing all stacked)
      if (viewLevel === 'day') {
        if (selectedYear !== 'ALL' && p.rawYear !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && p.rawMonth !== selectedMonth) return false;
        if (!showAllMonthDaysStacked && selectedDay !== 'ALL') {
          if (p.fullDate !== selectedDay && p.rawDay !== selectedDay && r.date !== selectedDay) {
            return false;
          }
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const guideMatch = (r.guide || '').toLowerCase().includes(q);
        const driverMatch = (r.driver || '').toLowerCase().includes(q);
        const companyMatch = (r.company || 'AGM').toLowerCase().includes(q);
        const dateMatch = (r.date || '').toLowerCase().includes(q);
        const timeMatch = (r.time || '').toLowerCase().includes(q);
        if (!guideMatch && !driverMatch && !companyMatch && !dateMatch && !timeMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const pA = parseDateParts(a.date);
      const pB = parseDateParts(b.date);
      if (pA.year !== pB.year) return pA.year - pB.year;
      if (pA.month !== pB.month) return pA.month - pB.month;
      if (pA.day !== pB.day) return pA.day - pB.day;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [results, viewLevel, selectedYear, selectedMonth, selectedDay, showAllMonthDaysStacked, searchQuery]);

  // Group filtered results by date
  const groupedByDate = useMemo(() => {
    const map: { [date: string]: ResultItem[] } = {};
    filteredResults.forEach(r => {
      const p = parseDateParts(r.date);
      const d = p.fullDate || r.date || '01-08-2026';
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [filteredResults]);

  // Sorted date entries (ascending: 1 -> 31)
  const sortedDateEntries = useMemo(() => {
    return Object.entries(groupedByDate).sort(([dateA], [dateB]) => {
      const pA = parseDateParts(dateA);
      const pB = parseDateParts(dateB);
      if (pA.year !== pB.year) return pA.year - pB.year;
      if (pA.month !== pB.month) return pA.month - pB.month;
      return pA.day - pB.day;
    });
  }, [groupedByDate]);

  // Statistics for current active view
  const stats = useMemo(() => {
    const uniqueWorkdays = Object.keys(groupedByDate).length;
    const totalPax = filteredResults.reduce((acc, r) => acc + (parseInt(r.pax, 10) || 0), 0);
    const totalQuads = filteredResults.reduce((acc, r) => acc + (parseInt(r.quads, 10) || 0), 0);
    const totalCamels = filteredResults.reduce((acc, r) => acc + (parseInt(r.camels, 10) || 0), 0);

    const totalPersonPayDH = filteredResults.reduce((acc, r) => acc + (parseInt(getPersonPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const totalQuadPayDH = filteredResults.reduce((acc, r) => acc + (parseInt(getQuadPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const totalCamelPayDH = filteredResults.reduce((acc, r) => acc + (parseInt(getCamelPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const totalPayDH = totalPersonPayDH + totalQuadPayDH + totalCamelPayDH;

    return {
      uniqueWorkdays,
      totalTrips: filteredResults.length,
      totalPax,
      totalQuads,
      totalCamels,
      totalPersonPayDH,
      totalQuadPayDH,
      totalCamelPayDH,
      totalPayDH
    };
  }, [filteredResults, groupedByDate]);

  // Handler to export CSV / .xlsx
  const handleExportCSV = () => {
    let csv = "Row,Guide Name,Driver Name,Company,Pax,Quads,Camels,Person Extra,Person Paid (DH),Quad Extra,Quad Paid (DH),Camels Extra,Camels Paid (DH),Date,Time,Status\n";
    filteredResults.forEach((r, idx) => {
      csv += `${idx + 1},"${r.guide}","${r.driver}","${r.company || 'AGM'}",${r.pax},${r.quads},${r.camels},"${r.person_extra || 'None'}","${getPersonPay(r)}","${r.quad_extra || 'None'}","${getQuadPay(r)}","${r.camel_extra || 'None'}","${getCamelPay(r)}",${r.date},${r.time},"${isRecordComplete(r) ? 'Done' : 'Rest'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const yStr = selectedYear === 'ALL' ? 'ALL_YEARS' : selectedYear;
    const mStr = selectedMonth === 'ALL' ? 'ALL_MONTHS' : selectedMonth;
    const dStr = viewLevel === 'day' && selectedDay !== 'ALL' ? `_${selectedDay}` : '';
    link.setAttribute('download', `AGM_Agafay_${yStr}_${mStr}${dStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Exported Excel sheet for ${yStr}-${mStr}${dStr}`);
  };

  // Handler to copy report summary
  const handleCopyReport = () => {
    let scopeLabel = `Year ${selectedYear}`;
    if (viewLevel === 'month') {
      scopeLabel = `${MONTH_NAMES_MAP[selectedMonth] || `Month ${selectedMonth}`} ${selectedYear}`;
    } else if (viewLevel === 'day') {
      scopeLabel = `Workday ${selectedDay}`;
    }

    const summary = `AGM-AGAFAY EXCEL WORKBOOK SUMMARY (${scopeLabel})\n` +
      `Workdays Logged: ${stats.uniqueWorkdays} days\n` +
      `Total Trips: ${stats.totalTrips}\n` +
      `Total Pax: ${stats.totalPax}\n` +
      `Total Quads: ${stats.totalQuads}\n` +
      `Total Camels: ${stats.totalCamels}\n` +
      `Total Extra Revenue: ${stats.totalPayDH} DH (Person: ${stats.totalPersonPayDH} DH | Quads: ${stats.totalQuadPayDH} DH | Camels: ${stats.totalCamelPayDH} DH)\n` +
      `Generated by AGM Travel System`;

    navigator.clipboard.writeText(summary);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
    showNotification('Summary copied to clipboard');
  };

  // Navigate to previous or next workday
  const handleNavigateDay = (delta: number) => {
    if (availableWorkdaysInMonth.length === 0) return;
    const currentIndex = availableWorkdaysInMonth.indexOf(selectedDay);
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = currentIndex + delta;
      if (nextIndex < 0) nextIndex = availableWorkdaysInMonth.length - 1;
      if (nextIndex >= availableWorkdaysInMonth.length) nextIndex = 0;
    }
    const newDay = availableWorkdaysInMonth[nextIndex];
    if (newDay) {
      setSelectedDay(newDay);
      setViewLevel('day');
    }
  };

  if (!showExcelModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#020b0f] flex flex-col h-full w-full overflow-hidden text-zinc-100 font-mono animate-in fade-in duration-150 select-text">
      
      {/* ================= TOP HEADER BAR ================= */}
      <div className="bg-gradient-to-r from-[#06141c] via-[#091e2b] to-[#06141c] border-b border-[#16384a] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-[#00c896]/20 to-[#DFB750]/20 border border-emerald-400/60 text-emerald-400 flex items-center justify-center shadow-lg shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-[#00e6a8]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                AGM-AGAFAY &bull; Excel Workbooks
              </h1>
              <span className="bg-[#0a202c] text-[#00e6a8] text-xs font-mono font-bold px-3 py-0.5 rounded-full border border-[#173a4b] shadow-sm">
                {viewLevel === 'day' 
                  ? `Day ${parseDateParts(selectedDay).rawDay} (${selectedDay})`
                  : viewLevel === 'month' 
                  ? `${MONTH_NAMES_MAP[selectedMonth] || selectedMonth} ${selectedYear}`
                  : `Year ${selectedYear}`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Structured Excel Sheets &bull; Day View (Default Working Day) &gt; Month Breakdown &gt; Yearly Matrix
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download CSV / .XLSX */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black text-xs px-3.5 sm:px-4 py-2 rounded-xl border border-[#00c896] flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,200,150,0.3)] active:scale-95"
            title="Download formatted CSV / XLSX workbook"
          >
            <Download className="w-4 h-4" />
            <span>Download .XLSX</span>
          </button>

          {/* Copy Report */}
          <button
            type="button"
            onClick={handleCopyReport}
            className="bg-[#081822] hover:bg-[#0c222e] text-zinc-300 hover:text-white border border-[#173d50] px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Copy summary to clipboard"
          >
            {copiedReport ? (
              <>
                <Check className="w-4 h-4 text-[#00e6a8]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          {/* Close / Back to Workstation */}
          <button
            type="button"
            onClick={onClose}
            className="bg-[#0a1e28] hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-[#1a4a5f] hover:border-rose-500/50 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            title="Close Excel Viewer and return to workstation"
          >
            <X className="w-4 h-4" />
            <span>Back to Workstation</span>
          </button>
        </div>
      </div>

      {/* ================= CLEAN NAVIGATION BAR (3 VIEW MODES + YEAR/MONTH/DAY SELECTORS) ================= */}
      <div className="bg-[#051117] border-b border-[#143547] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Level Mode Switcher Tabs: Day View (Active Day), Month View, Year View */}
        <div className="flex items-center gap-1.5 bg-[#030d12] border border-[#143342] p-1 rounded-2xl flex-wrap">
          {/* Day View Button */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('day');
              if (selectedDay === 'ALL' && availableWorkdaysInMonth[0]) {
                setSelectedDay(availableWorkdaysInMonth[0]);
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewLevel === 'day'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Day View (Workday Table)</span>
          </button>

          {/* Month View Button */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('month');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewLevel === 'month'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Month View (Workdays List)</span>
          </button>

          {/* Year View Button */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('year');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewLevel === 'year'
                ? 'bg-[#DFB750] text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Year View (Months Matrix)</span>
          </button>
        </div>

        {/* Filter Controls: Year + Month + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-[#030d12] border border-[#173a4b] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
              }}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#071720] text-white">All Years ({availableYears.length})</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-[#071720] text-white">
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-[#030d12] border border-[#173a4b] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                setSelectedMonth(newMonth);
                // If in day view, update day to first workday of that month or 01
                if (newMonth !== 'ALL') {
                  const matchingDays = results
                    .map(r => parseDateParts(r.date))
                    .filter(p => (selectedYear === 'ALL' || p.rawYear === selectedYear) && p.rawMonth === newMonth);
                  if (matchingDays.length > 0 && matchingDays[0].fullDate) {
                    setSelectedDay(matchingDays[0].fullDate);
                  } else {
                    setSelectedDay(`01-${newMonth}-${selectedYear === 'ALL' ? '2026' : selectedYear}`);
                  }
                }
              }}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#071720] text-white">All Months (12)</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                <option key={m} value={m} className="bg-[#071720] text-white">
                  {MONTH_NAMES_MAP[m] || `Month ${m}`}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[140px] sm:min-w-[180px] max-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search guide/driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#030d12] border border-[#173a4b] rounded-xl pl-7 pr-6 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00c896]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ================= SECONDARY BAR: MONTH & DAY QUICK CHIPS ================= */}
      {viewLevel !== 'year' && (
        <div className="bg-[#030d12] border-b border-[#112a38] px-4 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          
          {/* Quick Month Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-zinc-500 font-bold uppercase shrink-0">Month:</span>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mNum => {
              const mKey = String(mNum).padStart(2, '0');
              const isSelected = selectedMonth === mKey;
              const monthTrips = results.filter(r => {
                const p = parseDateParts(r.date);
                return (selectedYear === 'ALL' || p.rawYear === selectedYear) && p.rawMonth === mKey;
              });
              const hasActivity = monthTrips.length > 0;
              const shortName = MONTH_SHORT_NAMES[mNum - 1];

              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(mKey);
                    // Select first available day in this month
                    const matchingDays = results
                      .map(r => parseDateParts(r.date))
                      .filter(p => (selectedYear === 'ALL' || p.rawYear === selectedYear) && p.rawMonth === mKey);
                    if (matchingDays.length > 0 && matchingDays[0].fullDate) {
                      setSelectedDay(matchingDays[0].fullDate);
                    } else {
                      setSelectedDay(`01-${mKey}-${selectedYear === 'ALL' ? '2026' : selectedYear}`);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                      : hasActivity
                      ? 'bg-[#071d26] text-[#00e6a8] border border-[#153e4d] hover:bg-[#0b2b38]'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <span>{mKey} {shortName}</span>
                  {hasActivity && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-zinc-950 text-amber-300' : 'bg-[#030d12] text-[#00e6a8]'
                    }`}>
                      {monthTrips.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Day Switcher (When in Day View) */}
          {viewLevel === 'day' && (
            <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-[#143547]">
              <span className="text-[9px] text-zinc-500 font-bold uppercase shrink-0">Day Switch:</span>
              <button
                type="button"
                onClick={() => handleNavigateDay(-1)}
                className="p-1 rounded-lg bg-[#071d26] hover:bg-[#0b2b38] text-[#00e6a8] border border-[#153e4d] cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <span className="text-xs font-black text-white bg-[#071d26] px-2.5 py-1 rounded-lg border border-[#153e4d]">
                Day {parseDateParts(selectedDay).rawDay}
              </span>

              <button
                type="button"
                onClick={() => handleNavigateDay(1)}
                className="p-1 rounded-lg bg-[#071d26] hover:bg-[#0b2b38] text-[#00e6a8] border border-[#153e4d] cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      )}

      {/* ================= KPI METRIC SQUARES ================= */}
      <div className="bg-[#030d12] border-b border-[#112a38] px-4 sm:px-6 py-3 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
          
          {/* Card 1: Workdays */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[9px] uppercase font-bold">Workdays</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-black text-amber-300 font-mono">
              {stats.uniqueWorkdays} <span className="text-[10px] text-zinc-400 font-normal">Days</span>
            </div>
          </div>

          {/* Card 2: Total Trips */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[9px] uppercase font-bold">Trips</span>
              <Table className="w-3.5 h-3.5 text-[#00e6a8]" />
            </div>
            <div className="text-base font-black text-white font-mono">
              {stats.totalTrips} <span className="text-[10px] text-zinc-400 font-normal">Trips</span>
            </div>
          </div>

          {/* Card 3: Pax */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-[#00e6a8]">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Total Pax</span>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-[#00e6a8] font-mono">
              {stats.totalPax} <span className="text-[10px] text-[#00e6a8]/70 font-normal">P</span>
            </div>
          </div>

          {/* Card 4: Quads */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Total Quads</span>
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-amber-300 font-mono">
              {stats.totalQuads} <span className="text-[10px] text-amber-400/70 font-normal">Q</span>
            </div>
          </div>

          {/* Card 5: Camels */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-[#DFB750]">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Total Camels</span>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-[#DFB750] font-mono">
              {stats.totalCamels} <span className="text-[10px] text-yellow-400/70 font-normal">C</span>
            </div>
          </div>

          {/* Card 6: Person Extra Pay */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-cyan-400">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Person Pay</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-cyan-300 font-mono">
              {stats.totalPersonPayDH} <span className="text-[9px] text-cyan-400 font-bold">DH</span>
            </div>
          </div>

          {/* Card 7: Quad Extra Pay */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Quad Pay</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-amber-300 font-mono">
              {stats.totalQuadPayDH} <span className="text-[9px] text-amber-400 font-bold">DH</span>
            </div>
          </div>

          {/* Card 8: Camel Extra Pay */}
          <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
            <div className="flex items-center justify-between text-yellow-400">
              <span className="text-[9px] uppercase font-bold text-zinc-400">Camel Pay</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-black text-yellow-300 font-mono">
              {stats.totalCamelPayDH} <span className="text-[9px] text-yellow-400 font-bold">DH</span>
            </div>
          </div>

          {/* Card 9: Grand Total Extra Revenue */}
          <div className="bg-gradient-to-br from-[#071d26] to-[#041219] border border-[#00c896]/40 p-2.5 rounded-xl space-y-0.5 shadow-[0_0_15px_rgba(0,200,150,0.15)] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[#00e6a8]">
              <span className="text-[9px] uppercase font-black tracking-wider">Grand Revenue</span>
              <Sparkles className="w-3.5 h-3.5 text-[#00e6a8]" />
            </div>
            <div className="text-base font-black text-[#00e6a8] font-mono">
              {stats.totalPayDH} <span className="text-[10px] text-[#00e6a8] font-bold">DH</span>
            </div>
          </div>

        </div>
      </div>

      {/* ================= BREADCRUMB NAVIGATION BAR ================= */}
      <div className="bg-[#051117] border-b border-[#143547] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 font-bold uppercase text-[10px]">Active Path:</span>
          
          {/* Year Breadcrumb */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('year');
            }}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
              viewLevel === 'year'
                ? 'bg-[#DFB750] text-zinc-950 shadow-md font-black'
                : 'bg-[#0a202c] text-zinc-300 hover:text-white border border-[#173a4b]'
            }`}
          >
            {selectedYear === 'ALL' ? 'All Years' : `Year ${selectedYear}`}
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Month Breadcrumb */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('month');
            }}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
              viewLevel === 'month'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'bg-[#0a202c] text-zinc-300 hover:text-white border border-[#173a4b]'
            }`}
          >
            {selectedMonth === 'ALL' ? 'All Months' : (MONTH_NAMES_MAP[selectedMonth] || `Month ${selectedMonth}`)}
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Day Breadcrumb */}
          <button
            type="button"
            onClick={() => {
              setViewLevel('day');
            }}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
              viewLevel === 'day'
                ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                : 'bg-[#0a202c] text-zinc-300 hover:text-white border border-[#173a4b]'
            }`}
          >
            Day {parseDateParts(selectedDay).rawDay} ({selectedDay})
          </button>
        </div>

        <div className="flex items-center gap-3 text-zinc-400 text-xs">
          <span>Active Workbook: <strong className="text-[#00e6a8] font-bold">{selectedYear}_{selectedMonth}.xlsx</strong></span>
        </div>
      </div>

      {/* ================= MAIN VIEW CONTENT CONTAINER ================= */}
      <div className="flex-1 overflow-y-auto bg-[#020b0f] p-3 sm:p-5 md:p-6 space-y-6 font-sans overscroll-contain">
        
        {/* ========================================================================= */}
        {/* LEVEL 1: YEAR VIEW -> SHOW ONLY INFO ABOUT YEARS (NO DAILY TABLE CLUTTER) */}
        {/* ========================================================================= */}
        {viewLevel === 'year' && (
          <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
            
            {/* Header Banner */}
            <div className="bg-[#051117] border border-[#143547] p-5 sm:p-6 rounded-3xl shadow-2xl flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#00e6a8] uppercase tracking-wider font-mono flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-[#00e6a8]" />
                  <span>Yearly Workbooks Overview &bull; {selectedYear === 'ALL' ? 'All Years' : `Year ${selectedYear}`}</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Viewing aggregated annual metrics and monthly workbook directories. Click any month to explore its workdays.
                </p>
              </div>
              <span className="text-xs font-mono bg-[#0a202c] text-amber-300 border border-[#173a4b] px-4 py-1.5 rounded-full font-bold">
                {selectedYear === 'ALL' ? `${availableYears.length} Years Available` : `12 Month Slots`}
              </span>
            </div>

            {/* If specific year selected, show 12 months for this year */}
            {selectedYear !== 'ALL' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#00e6a8]" />
                    <span>Months of Year {selectedYear}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedYear('ALL')}
                    className="text-xs text-zinc-400 hover:text-white underline font-mono cursor-pointer"
                  >
                    View All Years
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(mKey => {
                    const monthResults = results.filter(r => {
                      const p = parseDateParts(r.date);
                      return p.rawYear === selectedYear && p.rawMonth === mKey;
                    });
                    const monthWorkdays = Array.from(new Set(monthResults.map(r => r.date))).length;
                    const monthPax = monthResults.reduce((acc, r) => acc + (parseInt(r.pax, 10) || 0), 0);
                    const monthQuads = monthResults.reduce((acc, r) => acc + (parseInt(r.quads, 10) || 0), 0);
                    const monthCamels = monthResults.reduce((acc, r) => acc + (parseInt(r.camels, 10) || 0), 0);
                    const monthExtraPay = monthResults.reduce((acc, r) => {
                      const p = parseInt(getPersonPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                      const q = parseInt(getQuadPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                      const c = parseInt(getCamelPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                      return acc + p + q + c;
                    }, 0);
                    const monthStaff = getStaffCounts(monthResults);
                    const hasData = monthResults.length > 0;

                    return (
                      <div
                        key={mKey}
                        onClick={() => {
                          setSelectedMonth(mKey);
                          setViewLevel('month');
                        }}
                        className={`border rounded-3xl p-5 shadow-lg transition-all cursor-pointer group space-y-4 ${
                          hasData
                            ? 'bg-[#051117] hover:bg-[#071a24] border-[#143547] hover:border-[#00c896]'
                            : 'bg-[#030a0e] border-[#0e212b] opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-[#143547]/60 pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border ${
                              hasData ? 'bg-[#00c896]/15 border-[#00c896]/30 text-[#00e6a8]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                            }`}>
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-base font-black font-mono text-white group-hover:text-[#00e6a8] transition-colors">
                                {MONTH_NAMES_MAP[mKey] || `Month ${mKey}`}
                              </h4>
                              <span className="text-[11px] font-mono text-zinc-400">{mKey}-{selectedYear}.xlsx</span>
                            </div>
                          </div>
                          <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                            hasData ? 'bg-[#0a202c] text-[#00e6a8] border-[#173a4b]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          }`}>
                            {monthWorkdays} Days
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                          <div className="bg-[#030d12] p-2.5 rounded-xl border border-[#112a38]">
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold">Total Trips</span>
                            <strong className="text-white text-xs font-bold">{monthResults.length} Trips</strong>
                          </div>
                          <div className="bg-[#030d12] p-2.5 rounded-xl border border-[#112a38]">
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold">Pax / Quads / Camels</span>
                            <strong className="text-[#00e6a8] text-xs font-bold">{monthPax}P &bull; {monthQuads}Q &bull; {monthCamels}C</strong>
                          </div>
                        </div>

                        {/* Staff Totals: Total Guides : Total Drivers and total H1 drivers */}
                        <div className="text-xs font-mono bg-[#030d12] p-2.5 rounded-xl border border-[#112a38] space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 font-bold">Total Guides :</span>
                            <span className="text-emerald-400 font-black font-mono">{monthStaff.totalGuides}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 font-bold">Total Drivers :</span>
                            <span className="text-amber-300 font-black font-mono">{monthStaff.totalDrivers}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 font-bold">Total H1 drivers :</span>
                            <span className="text-cyan-300 font-black font-mono">{monthStaff.totalH1Drivers}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full bg-[#00c896]/15 hover:bg-[#00c896] text-[#00e6a8] hover:text-zinc-950 font-black font-mono text-xs py-2 rounded-xl border border-[#00c896]/30 hover:border-[#00c896] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Open Month Sheets &rarr;</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* All Years Matrix */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableYears.map(yearKey => {
                  const yearResults = results.filter(r => parseDateParts(r.date).rawYear === yearKey);
                  const yearWorkdays = Array.from(new Set(yearResults.map(r => r.date))).length;
                  const yearPax = yearResults.reduce((acc, r) => acc + (parseInt(r.pax, 10) || 0), 0);
                  const yearQuads = yearResults.reduce((acc, r) => acc + (parseInt(r.quads, 10) || 0), 0);
                  const yearCamels = yearResults.reduce((acc, r) => acc + (parseInt(r.camels, 10) || 0), 0);
                  const yearMonths = Array.from(new Set(yearResults.map(r => parseDateParts(r.date).rawMonth))).filter(Boolean);
                  
                  const yearExtraPay = yearResults.reduce((acc, r) => {
                    const p = parseInt(getPersonPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    const q = parseInt(getQuadPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    const c = parseInt(getCamelPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    return acc + p + q + c;
                  }, 0);

                  return (
                    <div 
                      key={yearKey}
                      onClick={() => {
                        setSelectedYear(yearKey);
                        setViewLevel('year');
                      }}
                      className="bg-[#051117] hover:bg-[#071a24] border border-[#143547] hover:border-[#00c896] rounded-3xl p-6 shadow-2xl transition-all cursor-pointer group space-y-5"
                    >
                      <div className="flex items-center justify-between border-b border-[#143547] pb-3.5">
                        <div className="flex items-center gap-3.5">
                          <div className="p-3 rounded-2xl bg-[#00c896]/15 border border-[#00c896]/30 text-[#00e6a8] group-hover:scale-105 transition-transform">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black font-mono text-white group-hover:text-[#00e6a8] transition-colors">
                              YEAR {yearKey}
                            </h3>
                            <span className="text-xs font-mono text-zinc-400">Master Workbook Directory</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono bg-[#0a202c] text-amber-300 border border-[#173a4b] px-3.5 py-1 rounded-full font-bold">
                          {yearMonths.length} Month(s) Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                        <div className="bg-[#030d12] p-3.5 rounded-2xl border border-[#112a38]">
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold">Workdays Logged</span>
                          <strong className="text-amber-400 text-sm font-bold">{yearWorkdays} Days</strong>
                        </div>
                        <div className="bg-[#030d12] p-3.5 rounded-2xl border border-[#112a38]">
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold">Total Trips</span>
                          <strong className="text-white text-sm font-bold">{yearResults.length} Trips</strong>
                        </div>
                        <div className="bg-[#030d12] p-3.5 rounded-2xl border border-[#112a38]">
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold">Pax / Quads / Camels</span>
                          <strong className="text-[#00e6a8] text-sm font-bold">{yearPax} P &bull; {yearQuads} Q &bull; {yearCamels} C</strong>
                        </div>
                        <div className="bg-[#030d12] p-3.5 rounded-2xl border border-[#112a38]">
                          <span className="block text-[10px] text-zinc-500 uppercase font-bold">Total Extra Pay</span>
                          <strong className="text-amber-300 text-sm font-black">+{yearExtraPay} DH</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full bg-[#00c896] group-hover:bg-[#00e6a8] text-zinc-950 font-black font-mono text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-[0_0_15px_rgba(0,200,150,0.25)] flex items-center justify-center gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Open Year {yearKey} Monthly Sheets &rarr;</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 2: MONTH VIEW -> SHOW ONLY INFO ABOUT MONTH (WORKDAYS BREAKDOWN)    */}
        {/* ========================================================================= */}
        {viewLevel === 'month' && (
          <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
            
            {/* Header Banner */}
            <div className="bg-[#051117] border border-[#143547] p-5 sm:p-6 rounded-3xl shadow-2xl flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#00e6a8] uppercase tracking-wider font-mono flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span>Month Overview &bull; {MONTH_NAMES_MAP[selectedMonth] || `Month ${selectedMonth}`} {selectedYear}</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Viewing daily breakdown and logged workdays for {MONTH_NAMES_MAP[selectedMonth] || selectedMonth}. Click any workday to open its full Excel table.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-[#0a202c] text-[#00e6a8] border border-[#173a4b] px-4 py-1.5 rounded-full font-bold">
                  {availableWorkdaysInMonth.length} Active Workday(s)
                </span>
                <button
                  type="button"
                  onClick={() => setViewLevel('year')}
                  className="text-xs font-mono bg-[#030d12] hover:bg-[#071922] text-zinc-300 border border-[#173a4b] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  &larr; All Months
                </button>
              </div>
            </div>

            {/* List of Workdays in this Month */}
            {availableWorkdaysInMonth.length === 0 ? (
              <div className="bg-[#051117] border border-[#143547] rounded-3xl p-12 text-center space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No Trips Logged in {MONTH_NAMES_MAP[selectedMonth] || `Month ${selectedMonth}`}</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  There are no recorded trips for this month yet. Switch to another month or start logging trips in the workstation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableWorkdaysInMonth.map(workdayDate => {
                  const dayTrips = results.filter(r => parseDateParts(r.date).fullDate === workdayDate);
                  const p = parseDateParts(workdayDate);
                  const dayPax = dayTrips.reduce((acc, r) => acc + (parseInt(r.pax, 10) || 0), 0);
                  const dayQuads = dayTrips.reduce((acc, r) => acc + (parseInt(r.quads, 10) || 0), 0);
                  const dayCamels = dayTrips.reduce((acc, r) => acc + (parseInt(r.camels, 10) || 0), 0);
                  const dayExtraPay = dayTrips.reduce((acc, r) => {
                    const personP = parseInt(getPersonPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    const quadP = parseInt(getQuadPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    const camelP = parseInt(getCamelPay(r).replace(/[^0-9]/g, ''), 10) || 0;
                    return acc + personP + quadP + camelP;
                  }, 0);

                  const dayStaff = getStaffCounts(dayTrips);

                  return (
                    <div
                      key={workdayDate}
                      onClick={() => {
                        setSelectedDay(workdayDate);
                        setViewLevel('day');
                      }}
                      className="bg-[#051117] hover:bg-[#071a24] border border-[#143547] hover:border-[#00c896] rounded-3xl p-5 shadow-lg transition-all cursor-pointer group space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#143547] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#00c896]/15 border border-[#00c896]/30 text-[#00e6a8] flex items-center justify-center font-black font-mono text-sm group-hover:scale-105 transition-transform">
                            {p.rawDay}
                          </div>
                          <div>
                            <h3 className="text-sm font-black font-mono text-white group-hover:text-[#00e6a8] transition-colors">
                              AGM-{workdayDate.replace(/-/g, '/')}
                            </h3>
                            <span className="text-[11px] font-mono text-zinc-400">Day {p.rawDay} &bull; {dayTrips.length} Trip(s)</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono bg-[#00c896]/15 text-[#00e6a8] border border-[#00c896]/30 px-3 py-1 rounded-full font-bold">
                          {dayPax} Pax
                        </span>
                      </div>

                      {/* Staff Totals: Total Guides : Total Drivers and total H1 drivers (No Names) */}
                      <div className="text-xs font-mono bg-[#030d12] p-3 rounded-2xl border border-[#112a38] space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold text-[11px]">Total Guides :</span>
                          <span className="text-emerald-400 font-black font-mono text-xs">{dayStaff.totalGuides}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold text-[11px]">Total Drivers :</span>
                          <span className="text-amber-300 font-black font-mono text-xs">{dayStaff.totalDrivers}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold text-[11px]">Total H1 drivers :</span>
                          <span className="text-cyan-300 font-black font-mono text-xs">{dayStaff.totalH1Drivers}</span>
                        </div>
                      </div>

                      {/* Day Stats */}
                      <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                        <div className="bg-[#030d12] p-2 rounded-xl border border-[#112a38]">
                          <span className="block text-[8px] text-zinc-500 uppercase font-bold">Quads</span>
                          <strong className="text-amber-400 font-bold">{dayQuads}</strong>
                        </div>
                        <div className="bg-[#030d12] p-2 rounded-xl border border-[#112a38]">
                          <span className="block text-[8px] text-zinc-500 uppercase font-bold">Camels</span>
                          <strong className="text-[#DFB750] font-bold">{dayCamels}</strong>
                        </div>
                        <div className="bg-[#030d12] p-2 rounded-xl border border-[#112a38]">
                          <span className="block text-[8px] text-zinc-500 uppercase font-bold">Extra</span>
                          <strong className="text-amber-300 font-bold">+{dayExtraPay} DH</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full bg-[#DFB750] group-hover:bg-[#cda23d] text-zinc-950 font-black font-mono text-xs py-2.5 rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span>View Workday Table &rarr;</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 3: DAY VIEW -> SHOW ONLY INFO & FULL TABLE FOR SELECTED WORKDAY     */}
        {/* ========================================================================= */}
        {viewLevel === 'day' && (
          <div className="space-y-6 max-w-full animate-in fade-in duration-200">
            
            {/* Day Header Banner with quick toggle to view stacked days */}
            <div className="bg-[#051117] border border-[#143547] p-4 sm:p-5 rounded-3xl shadow-xl flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center font-black font-mono text-base shadow-inner">
                  {parseDateParts(selectedDay).rawDay}
                </div>
                <div>
                  <h2 className="text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <span>WORKDAY SHEET: AGM-{selectedDay.replace(/-/g, '/')}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Full formatted spreadsheet view for <strong className="text-[#00e6a8] font-mono">{selectedDay}</strong> &bull; {filteredResults.length} Trip Record(s) Logged
                  </p>
                </div>
              </div>

              {/* View options */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAllMonthDaysStacked(!showAllMonthDaysStacked)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showAllMonthDaysStacked
                      ? 'bg-[#00c896] text-zinc-950 border-[#00c896] font-black shadow-md'
                      : 'bg-[#030d12] hover:bg-[#071922] text-zinc-300 border-[#173a4b]'
                  }`}
                  title="Toggle stacked view for all days in this month"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showAllMonthDaysStacked ? 'Showing All Month Days' : 'Show All Days in Month'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewLevel('month')}
                  className="bg-[#0a202c] hover:bg-[#0e2c3d] text-zinc-300 text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl border border-[#173a4b] cursor-pointer"
                >
                  &larr; Month Workdays ({availableWorkdaysInMonth.length})
                </button>
              </div>
            </div>

            {/* If no trips found for this day */}
            {sortedDateEntries.length === 0 ? (
              <div className="bg-[#051117] border border-[#143547] rounded-3xl p-12 text-center space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-zinc-300">No Trip Records for {selectedDay}</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  There are no logged trips on this specific workday. Select an active day from the bar above or return to the workstation.
                </p>
                {availableWorkdaysInMonth.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (availableWorkdaysInMonth[0]) {
                        setSelectedDay(availableWorkdaysInMonth[0]);
                      }
                    }}
                    className="mt-3 bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Jump to Active Workday ({availableWorkdaysInMonth[0]})
                  </button>
                )}
              </div>
            ) : (
              /* Render Excel Tables for each date entry */
              sortedDateEntries.map(([dateKey, dayRecords]) => {
                const totalPaxDay = dayRecords.reduce((acc, r) => acc + (parseInt(r.pax, 10) || 0), 0);
                const totalQuadsDay = dayRecords.reduce((acc, r) => acc + (parseInt(r.quads, 10) || 0), 0);
                const totalCamelsDay = dayRecords.reduce((acc, r) => acc + (parseInt(r.camels, 10) || 0), 0);
                
                const totalPersonExtra = dayRecords.reduce((acc, r) => acc + (r.person_extra && r.person_extra !== 'None' ? (parseInt(r.person_extra, 10) || 1) : 0), 0);
                const totalQuadExtra = dayRecords.reduce((acc, r) => acc + (r.quad_extra && r.quad_extra !== 'None' ? (parseInt(r.quad_extra, 10) || 1) : 0), 0);
                const totalCamelExtra = dayRecords.reduce((acc, r) => acc + (r.camel_extra && r.camel_extra !== 'None' ? (parseInt(r.camel_extra, 10) || 1) : 0), 0);

                const totalPersonPayDay = dayRecords.reduce((acc, r) => acc + (parseInt(getPersonPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
                const totalQuadPayDay = dayRecords.reduce((acc, r) => acc + (parseInt(getQuadPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
                const totalCamelPayDay = dayRecords.reduce((acc, r) => acc + (parseInt(getCamelPay(r).replace(/[^0-9]/g, ''), 10) || 0), 0);
                const totalExtraPayDay = totalPersonPayDay + totalQuadPayDay + totalCamelPayDay;

                return (
                  <div key={dateKey} className="border border-[#143547] rounded-3xl overflow-hidden shadow-2xl bg-[#051117] text-zinc-100 transition-all">
                    
                    {/* EXCEL SECTION TITLE BANNER (AGM-DD/MM/YYYY) */}
                    <div className="bg-[#071720] text-[#00e6a8] px-4 sm:px-6 py-3.5 font-mono font-bold tracking-wider text-sm border-b border-[#143547] flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono text-zinc-400 uppercase font-bold">WORKDAY SHEET:</span>
                        <span className="text-base font-black tracking-wider text-white">
                          AGM-{dateKey.replace(/-/g, '/')}
                        </span>
                        <span className="text-xs font-mono text-[#00e6a8] bg-[#00c896]/15 px-3.5 py-0.5 rounded-full border border-[#00c896]/30 font-bold">
                          {dayRecords.length} Trip Log(s)
                        </span>
                      </div>

                      {/* Summary preview metrics pill */}
                      <div className="flex items-center gap-3.5 text-xs font-mono text-zinc-300 bg-[#030d12] px-4 py-1.5 rounded-full border border-[#112a38]">
                        <span>Pax: <strong className="text-[#00e6a8]">{totalPaxDay}</strong></span>
                        <span>Quads: <strong className="text-amber-400">{totalQuadsDay}</strong></span>
                        <span>Camels: <strong className="text-[#DFB750]">{totalCamelsDay}</strong></span>
                        <span>Extra Pay: <strong className="text-amber-300 font-bold">+{totalExtraPayDay} DH</strong></span>
                      </div>
                    </div>

                    {/* EXPANDED FULL EXCEL TABLE DETAILS */}
                    <div className="overflow-x-auto w-full overscroll-contain pb-2">
                      <table className="w-full text-left border-collapse font-sans text-xs min-w-[1200px]">
                        {/* EXCEL COLUMN LETTERS HEADER (A to P) */}
                        <thead>
                          <tr className="bg-[#030d12] text-zinc-500 font-mono text-[10px] uppercase text-center border-b border-[#143547]">
                            <th className="py-1 border-r border-[#143547] w-10">A</th>
                            <th className="py-1 border-r border-[#143547]">B</th>
                            <th className="py-1 border-r border-[#143547]">C</th>
                            <th className="py-1 border-r border-[#143547] w-24">D</th>
                            <th className="py-1 border-r border-[#143547] w-16">E</th>
                            <th className="py-1 border-r border-[#143547] w-16">F</th>
                            <th className="py-1 border-r border-[#143547] w-16">G</th>
                            <th className="py-1 border-r border-[#143547] w-24 bg-[#1f190e] text-amber-400">H</th>
                            <th className="py-1 border-r border-[#143547] w-28 bg-[#00c896]/15 text-[#00e6a8] font-bold">I</th>
                            <th className="py-1 border-r border-[#143547] w-24 bg-[#1f190e] text-amber-400">J</th>
                            <th className="py-1 border-r border-[#143547] w-28 bg-[#00c896]/15 text-[#00e6a8] font-bold">K</th>
                            <th className="py-1 border-r border-[#143547] w-24 bg-[#1f190e] text-amber-400">L</th>
                            <th className="py-1 border-r border-[#143547] w-28 bg-[#00c896]/15 text-[#00e6a8] font-bold">M</th>
                            <th className="py-1 border-r border-[#143547] w-28">N</th>
                            <th className="py-1 border-r border-[#143547] w-24">O</th>
                            <th className="py-1 w-16">P</th>
                          </tr>

                          {/* EXCEL FIELD TABLE HEADERS */}
                          <tr className="bg-[#0a202c] text-zinc-200 font-bold border-b border-[#143547] whitespace-nowrap">
                            <th className="px-3 py-3 border-r border-[#143547] text-center font-mono text-zinc-400">#</th>
                            <th className="px-3 py-3 border-r border-[#143547]">Guide Name</th>
                            <th className="px-3 py-3 border-r border-[#143547]">Driver Name</th>
                            <th className="px-3 py-3 border-r border-[#143547]">Company</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center">Pax</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center">Quads</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center">Camels</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#241c0f] text-amber-300">Person Extra</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#072419] text-[#00e6a8] font-extrabold">Person Paid (DH)</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#241c0f] text-amber-300">Quad Extra</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#072419] text-[#00e6a8] font-extrabold">Quad Paid (DH)</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#241c0f] text-amber-300">Camels Extra</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center bg-[#072419] text-[#00e6a8] font-extrabold">Camels Paid (DH)</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center font-mono whitespace-nowrap">Date</th>
                            <th className="px-3 py-3 border-r border-[#143547] text-center font-mono whitespace-nowrap">Time</th>
                            <th className="px-3 py-3 text-center">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {dayRecords.flatMap((r, rIdx) => {
                            const isDone = isRecordComplete(r);
                            const pPayStr = getPersonPay(r);
                            const qPayStr = getQuadPay(r);
                            const cPayStr = getCamelPay(r);

                            const dList = (r.driversList && Array.isArray(r.driversList) && r.driversList.length > 0)
                              ? r.driversList
                              : [{ driver: r.driver || '', van_type: (r.van_type || 'Big van') as ('Big van' | 'Mini van'), company: r.company || 'AGM' }];

                            const nDrivers = dList.length;
                            const firstCompany = ((dList[0] && dList[0].company) || r.company || 'AGM').toUpperCase();
                            const allSameCompany = dList.every(d => ((d && d.company) || 'AGM').toUpperCase() === firstCompany);

                            return dList.map((dItem, dIdx) => {
                              const isFirstSubRow = dIdx === 0;

                              let displayDriverName = (dItem.driver || r.driver || '').toUpperCase();
                              const dVanType = dItem.van_type || r.van_type || '';
                              const dComp = ((dItem.company || r.company || 'AGM') as string).toUpperCase();

                              if ((dVanType === 'Mini van' || dVanType.toLowerCase().includes('mini')) && nDrivers > 1) {
                                if (!displayDriverName || displayDriverName === 'H1') {
                                  displayDriverName = `H1-${dComp}`;
                                } else if (!displayDriverName.startsWith('H1-')) {
                                  displayDriverName = `H1-${displayDriverName}`;
                                }
                              }

                              return (
                                <tr 
                                  key={`${r.id}-drv-${dIdx}`} 
                                  className={`bg-[#051117] hover:bg-[#0b2432] text-zinc-200 transition-colors border-b border-[#143547]/60 font-medium whitespace-nowrap ${dIdx > 0 ? 'bg-[#030e14]' : ''}`}
                                >
                                  {/* Column A: # */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono text-[11px] text-zinc-400 font-bold whitespace-nowrap align-middle">
                                      {rIdx + 1}
                                    </td>
                                  )}

                                  {/* Column B: Guide Name */}
                                  {isFirstSubRow && (
                                    <td 
                                      rowSpan={nDrivers} 
                                      onClick={() => onSelectStaff && onSelectStaff(r.guide)}
                                      className="px-3 py-2.5 border-r border-[#143547]/60 font-bold uppercase tracking-wide text-white whitespace-nowrap align-middle hover:text-[#00e6a8] cursor-pointer"
                                    >
                                      {r.guide}
                                    </td>
                                  )}

                                  {/* Column C: Driver Name */}
                                  <td 
                                    onClick={() => onSelectStaff && onSelectStaff(dItem.driver || r.driver)}
                                    className="px-3 py-2.5 border-r border-[#143547]/60 font-bold uppercase tracking-wide text-zinc-300 whitespace-nowrap align-middle hover:text-[#00e6a8] cursor-pointer"
                                  >
                                    {displayDriverName}
                                  </td>

                                  {/* Column D: Company */}
                                  {allSameCompany ? (
                                    isFirstSubRow && (
                                      <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 font-bold uppercase text-zinc-300 whitespace-nowrap align-middle">
                                        {firstCompany}
                                      </td>
                                    )
                                  ) : (
                                    <td className="px-3 py-2.5 border-r border-[#143547]/60 font-bold uppercase text-zinc-300 whitespace-nowrap align-middle">
                                      {((dItem.company || 'AGM') as string).toUpperCase()}
                                    </td>
                                  )}

                                  {/* Column E: Pax */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-bold font-mono text-xs text-[#00e6a8] whitespace-nowrap align-middle">
                                      {r.pax}
                                    </td>
                                  )}

                                  {/* Column F: Quads */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-bold font-mono text-xs text-amber-400 whitespace-nowrap align-middle">
                                      {r.quads === 'None' || r.quads === 'none' ? <span className="text-zinc-500 font-normal">None</span> : r.quads}
                                    </td>
                                  )}

                                  {/* Column G: Camels */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-bold font-mono text-xs text-[#DFB750] whitespace-nowrap align-middle">
                                      {r.camels === 'None' || r.camels === 'none' ? <span className="text-zinc-500 font-normal">None</span> : r.camels}
                                    </td>
                                  )}

                                  {/* Column H: Person Extra */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-bold whitespace-nowrap align-middle ${
                                      r.person_extra && r.person_extra !== 'None' ? 'bg-[#241c0f] text-amber-300' : 'text-zinc-500'
                                    }`}>
                                      {r.person_extra || 'None'}
                                    </td>
                                  )}

                                  {/* Column I: Person Extra Payment */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-black whitespace-nowrap align-middle ${
                                      pPayStr !== '0 DH' && pPayStr !== '0' && pPayStr !== 'None'
                                        ? 'bg-[#07261a] text-[#00e6a8] font-extrabold' 
                                        : 'text-zinc-500'
                                    }`}>
                                      {pPayStr}
                                    </td>
                                  )}

                                  {/* Column J: Quad Extra */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-bold whitespace-nowrap align-middle ${
                                      r.quad_extra && r.quad_extra !== 'None' ? 'bg-[#241c0f] text-amber-300' : 'text-zinc-500'
                                    }`}>
                                      {r.quad_extra || 'None'}
                                    </td>
                                  )}

                                  {/* Column K: Quad Extra Payment */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-black whitespace-nowrap align-middle ${
                                      qPayStr !== '0 DH' && qPayStr !== '0' && qPayStr !== 'None'
                                        ? 'bg-[#07261a] text-[#00e6a8] font-extrabold' 
                                        : 'text-zinc-500'
                                    }`}>
                                      {qPayStr}
                                    </td>
                                  )}

                                  {/* Column L: Camel Extra */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-bold whitespace-nowrap align-middle ${
                                      r.camel_extra && r.camel_extra !== 'None' ? 'bg-[#241c0f] text-amber-300' : 'text-zinc-500'
                                    }`}>
                                      {r.camel_extra || 'None'}
                                    </td>
                                  )}

                                  {/* Column M: Camel Extra Payment */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className={`px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono font-black whitespace-nowrap align-middle ${
                                      cPayStr !== '0 DH' && cPayStr !== '0' && cPayStr !== 'None'
                                        ? 'bg-[#07261a] text-[#00e6a8] font-extrabold' 
                                        : 'text-zinc-500'
                                    }`}>
                                      {cPayStr}
                                    </td>
                                  )}

                                  {/* Column N: Date */}
                                  {isFirstSubRow && (
                                    <td 
                                      rowSpan={nDrivers} 
                                      onClick={() => onSelectTripDate && onSelectTripDate(r.date)}
                                      className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono text-[11px] text-zinc-400 whitespace-nowrap font-bold align-middle hover:text-white cursor-pointer"
                                    >
                                      {r.date}
                                    </td>
                                  )}

                                  {/* Column O: Time */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 border-r border-[#143547]/60 text-center font-mono text-[11px] text-zinc-400 whitespace-nowrap font-bold align-middle">
                                      {r.time}
                                    </td>
                                  )}

                                  {/* Column P: Status */}
                                  {isFirstSubRow && (
                                    <td rowSpan={nDrivers} className="px-3 py-2.5 text-center font-mono text-[10px] font-black align-middle">
                                      <span className={`px-2.5 py-0.5 rounded-full border ${
                                        isDone 
                                          ? 'bg-[#00c896]/15 text-[#00e6a8] border-[#00c896]/40' 
                                          : 'bg-[#33221b] text-[#f8a171] border-[#4d3226]'
                                      }`}>
                                        {isDone ? 'DONE' : 'REST'}
                                      </span>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })}

                          {/* EXCEL TOTALS SUMMARY ROW FOR WORKDAY */}
                          <tr className="bg-[#0a202c] text-zinc-200 font-extrabold border-t-2 border-[#143547]">
                            <td colSpan={4} className="px-4 py-3 border-r border-[#143547] text-right uppercase tracking-wider font-black text-xs text-white">
                              TOTALS ({dateKey})
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-sm font-black text-[#00e6a8]">
                              {totalPaxDay}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-sm font-black text-amber-400">
                              {totalQuadsDay}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-sm font-black text-[#DFB750]">
                              {totalCamelsDay}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#241c0f] text-amber-300">
                              {totalPersonExtra > 0 ? totalPersonExtra : '0'}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#07261a] text-[#00e6a8]">
                              {totalPersonPayDay} DH
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#241c0f] text-amber-300">
                              {totalQuadExtra > 0 ? totalQuadExtra : '0'}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#07261a] text-[#00e6a8]">
                              {totalQuadPayDay} DH
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#241c0f] text-amber-300">
                              {totalCamelExtra > 0 ? totalCamelExtra : '0'}
                            </td>
                            <td className="px-3 py-3 border-r border-[#143547] text-center font-mono text-xs font-black bg-[#07261a] text-[#00e6a8]">
                              {totalCamelPayDay} DH
                            </td>
                            <td colSpan={3} className="px-3 py-3 text-center font-mono text-[11px] text-[#00e6a8] font-bold">
                              Workday Summary OK
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}

          </div>
        )}

      </div>

      {/* ================= BOTTOM WORKBOOK FOOTER BAR ================= */}
      <div className="bg-[#030d12] border-t border-[#143547] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-wrap max-w-full pb-0.5">
          <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0">Workbook Level:</span>
          
          <button
            type="button"
            onClick={() => setViewLevel('day')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewLevel === 'day'
                ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                : 'bg-[#051117] hover:bg-[#0c222e] text-zinc-300 border border-[#143547]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Day Table</span>
          </button>

          <button
            type="button"
            onClick={() => setViewLevel('month')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewLevel === 'month'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'bg-[#051117] hover:bg-[#0c222e] text-zinc-300 border border-[#143547]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Month Breakdown</span>
          </button>

          <button
            type="button"
            onClick={() => setViewLevel('year')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewLevel === 'year'
                ? 'bg-[#DFB750] text-zinc-950 shadow-md font-black'
                : 'bg-[#051117] hover:bg-[#0c222e] text-zinc-300 border border-[#143547]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Year Matrix</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-zinc-400 shrink-0 font-mono">
          <span className="text-[#00e6a8] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00e6a8]" />
            <span>EXCEL MATRIX SYNCED</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#00e6a8]">
            <span className="w-2 h-2 rounded-full bg-[#00e6a8] inline-block animate-pulse"></span>
            <span>PRO WORKBOOKS</span>
          </span>
        </div>
      </div>

    </div>
  );
};
