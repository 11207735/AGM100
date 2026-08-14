import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Activity, 
  Calendar, 
  CalendarDays, 
  TrendingUp, 
  Award, 
  Search, 
  Filter, 
  Download, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Compass, 
  Users, 
  Zap, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  LayoutGrid,
  List,
  Layers,
  ArrowUpRight,
  BarChart3,
  X,
  Footprints,
  Bike,
  FileSpreadsheet,
  Coins
} from 'lucide-react';
import { ResultItem, StaffProfile, parseDate, MONTH_NAMES } from './StaffProfilesView';

export interface QuadsAndCamelsFleetViewProps {
  results: ResultItem[];
  staffProfiles: StaffProfile[];
  initialMode?: 'all' | 'quads' | 'camels';
  onSelectStaff?: (staffName: string) => void;
  onSelectTripDate?: (date: string) => void;
  showNotification: (msg: string) => void;
  onClose?: () => void;
  onOpenExtraFunds?: () => void;
}

// Helper to extract clean numeric extra count
function parseExtraCount(val?: string): number {
  if (!val || val === 'None' || val === 'none' || val === '0' || val === '-') return 0;
  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? (val.trim() && val !== 'None' ? 1 : 0) : num;
}

// Helper to extract clean numeric extra payment in DH
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

export const QuadsAndCamelsFleetView: React.FC<QuadsAndCamelsFleetViewProps> = ({
  results,
  staffProfiles,
  initialMode = 'all',
  onSelectStaff,
  onSelectTripDate,
  showNotification,
  onClose,
  onOpenExtraFunds,
}) => {
  // Main Category Filter: All Fleet, Only Quads, Only Camels, Extras
  const [fleetFilter, setFleetFilter] = useState<'all' | 'quads' | 'camels' | 'extras'>(initialMode);
  
  // Year selector
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  
  // Month selector (1..12 or 'all' for all 12 months)
  const [activeMonthFilter, setActiveMonthFilter] = useState<number | 'all'>('all');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Expandable month state
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({});
  
  // Expandable day state: stores date strings that are currently expanded for trip details
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Extras specific sub-filter (when in 'extras' mode)
  const [extrasSubCategory, setExtrasSubCategory] = useState<'all' | 'quads' | 'camels' | 'person'>('all');

  // Copied feedback state
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Available Years in Results
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    results.forEach(r => {
      const p = parseDate(r.date);
      if (p.year) yearsSet.add(p.year);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [results]);

  // Master Processed Excursions with parsed date and clean extra details
  const processedTrips = useMemo(() => {
    return results.map(r => {
      const parsed = parseDate(r.date);
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
        parsedDate: parsed,
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
    }).sort((a, b) => {
      if (a.parsedDate.year !== b.parsedDate.year) return b.parsedDate.year - a.parsedDate.year;
      if (a.parsedDate.month !== b.parsedDate.month) return b.parsedDate.month - a.parsedDate.month;
      if (a.parsedDate.day !== b.parsedDate.day) return b.parsedDate.day - a.parsedDate.day;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [results]);

  // Global Extras breakdown across selected year & active month filter (for subcategory badge counts)
  const extrasBreakdown = useMemo(() => {
    let qUnits = 0, qDH = 0, qTours = 0;
    let cUnits = 0, cDH = 0, cTours = 0;
    let pUnits = 0, pDH = 0, pTours = 0;

    processedTrips.forEach(t => {
      if (t.parsedDate.year !== selectedYear) return;
      if (activeMonthFilter !== 'all' && t.parsedDate.month !== activeMonthFilter) return;

      if (t.qExtraCount > 0 || t.qExtraPay > 0) {
        qUnits += t.qExtraCount;
        qDH += t.qExtraPay;
        qTours += 1;
      }
      if (t.cExtraCount > 0 || t.cExtraPay > 0) {
        cUnits += t.cExtraCount;
        cDH += t.cExtraPay;
        cTours += 1;
      }
      if (t.pExtraCount > 0 || t.pExtraPay > 0) {
        pUnits += t.pExtraCount;
        pDH += t.pExtraPay;
        pTours += 1;
      }
    });

    const totalDH = qDH + cDH + pDH;
    const totalUnits = qUnits + cUnits + pUnits;

    return {
      qUnits,
      qDH,
      qTours,
      cUnits,
      cDH,
      cTours,
      pUnits,
      pDH,
      pTours,
      totalDH,
      totalUnits
    };
  }, [processedTrips, selectedYear, activeMonthFilter]);

  // Trips strictly filtered by Year, Selected Month, Fleet Filter, Extras Subcategory, and Search
  const filteredTrips = useMemo(() => {
    return processedTrips.filter(t => {
      // 1. Year Filter
      if (t.parsedDate.year !== selectedYear) return false;

      // 2. Month Filter (if not 'all', strictly match the month)
      if (activeMonthFilter !== 'all' && t.parsedDate.month !== activeMonthFilter) {
        return false;
      }

      // 3. Fleet Filter: Only Quads, Only Camels, Extras
      if (fleetFilter === 'quads') {
        if (t.quadsCount <= 0 && t.qExtraCount <= 0) return false;
      } else if (fleetFilter === 'camels') {
        if (t.camelsCount <= 0 && t.cExtraCount <= 0) return false;
      } else if (fleetFilter === 'extras') {
        if (!t.hasAnyExtra) return false;
        if (extrasSubCategory === 'quads' && t.qExtraCount <= 0 && t.qExtraPay <= 0) return false;
        if (extrasSubCategory === 'camels' && t.cExtraCount <= 0 && t.cExtraPay <= 0) return false;
        if (extrasSubCategory === 'person' && t.pExtraCount <= 0 && t.pExtraPay <= 0) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const guideMatch = (t.guide || '').toLowerCase().includes(q);
        const driverMatch = (t.driver || '').toLowerCase().includes(q);
        const companyMatch = (t.company || '').toLowerCase().includes(q);
        const dateMatch = (t.date || '').toLowerCase().includes(q);
        const timeMatch = (t.time || '').toLowerCase().includes(q);
        const qExtraMatch = (t.quad_extra || '').toLowerCase().includes(q);
        const cExtraMatch = (t.camel_extra || '').toLowerCase().includes(q);
        const pExtraMatch = (t.person_extra || '').toLowerCase().includes(q);

        if (!guideMatch && !driverMatch && !companyMatch && !dateMatch && !timeMatch && !qExtraMatch && !cExtraMatch && !pExtraMatch) {
          return false;
        }
      }

      return true;
    });
  }, [processedTrips, selectedYear, activeMonthFilter, fleetFilter, extrasSubCategory, searchQuery]);

  // Overall Statistics for current exact selection (Year, Month, and Mode)
  const currentStats = useMemo(() => {
    let totalQuads = 0;
    let totalCamels = 0;
    let totalPax = 0;
    let totalQuadsExtras = 0;
    let totalQuadsExtraPay = 0;
    let totalCamelsExtras = 0;
    let totalCamelsExtraPay = 0;
    let totalPersonExtras = 0;
    let totalPersonExtraPay = 0;
    const uniqueDates = new Set<string>();
    const uniqueMonths = new Set<number>();
    let totalTripsCount = filteredTrips.length;

    filteredTrips.forEach(t => {
      totalQuads += t.quadsCount;
      totalCamels += t.camelsCount;
      totalPax += t.paxCount;
      totalQuadsExtras += t.qExtraCount;
      totalQuadsExtraPay += t.qExtraPay;
      totalCamelsExtras += t.cExtraCount;
      totalCamelsExtraPay += t.cExtraPay;
      totalPersonExtras += t.pExtraCount;
      totalPersonExtraPay += t.pExtraPay;
      if (t.date) uniqueDates.add(t.date.trim());
      uniqueMonths.add(t.parsedDate.month);
    });

    const totalExtraRevenue = totalQuadsExtraPay + totalCamelsExtraPay + totalPersonExtraPay;
    const totalExtraUnits = totalQuadsExtras + totalCamelsExtras + totalPersonExtras;
    const activeDaysCount = uniqueDates.size || (totalTripsCount > 0 ? 1 : 0);

    return {
      totalQuads,
      totalCamels,
      totalPax,
      totalQuadsExtras,
      totalQuadsExtraPay,
      totalCamelsExtras,
      totalCamelsExtraPay,
      totalPersonExtras,
      totalPersonExtraPay,
      totalExtraRevenue,
      totalExtraUnits,
      activeDaysCount,
      activeMonthsCount: uniqueMonths.size,
      totalTours: totalTripsCount,
      avgQuadsPerDay: activeDaysCount > 0 ? (totalQuads / activeDaysCount).toFixed(1) : '0.0',
      avgCamelsPerDay: activeDaysCount > 0 ? (totalCamels / activeDaysCount).toFixed(1) : '0.0',
      avgQuadsPerTour: totalTripsCount > 0 ? (totalQuads / totalTripsCount).toFixed(1) : '0.0',
      avgCamelsPerTour: totalTripsCount > 0 ? (totalCamels / totalTripsCount).toFixed(1) : '0.0',
      avgPaxPerTour: totalTripsCount > 0 ? (totalPax / totalTripsCount).toFixed(1) : '0.0',
      avgQuadsExtraPerTour: totalTripsCount > 0 ? (totalQuadsExtras / totalTripsCount).toFixed(1) : '0.0',
      avgQuadsExtraPayPerTour: totalTripsCount > 0 ? (totalQuadsExtraPay / totalTripsCount).toFixed(1) : '0.0',
      avgCamelsExtraPerTour: totalTripsCount > 0 ? (totalCamelsExtras / totalTripsCount).toFixed(1) : '0.0',
      avgCamelsExtraPayPerTour: totalTripsCount > 0 ? (totalCamelsExtraPay / totalTripsCount).toFixed(1) : '0.0',
      avgPersonExtraPerTour: totalTripsCount > 0 ? (totalPersonExtras / totalTripsCount).toFixed(1) : '0.0',
      avgPersonExtraPayPerTour: totalTripsCount > 0 ? (totalPersonExtraPay / totalTripsCount).toFixed(1) : '0.0',
    };
  }, [filteredTrips]);

  // ================= MONTH-BY-MONTH DATA STRUCTURE =================
  // Groups the filtered year's data by month (1 to 12)
  const monthByMonthData = useMemo(() => {
    const monthsToProcess = activeMonthFilter === 'all' 
      ? Array.from({ length: 12 }, (_, idx) => idx + 1)
      : [activeMonthFilter];

    return monthsToProcess.map((monthNum) => {
      const monthName = MONTH_NAMES[monthNum] || `Month ${monthNum}`;
      
      const tripsInMonth = filteredTrips.filter(t => t.parsedDate.month === monthNum);
      
      let quads = 0;
      let camels = 0;
      let pax = 0;
      let quadExtras = 0;
      let quadExtraPay = 0;
      let camelExtras = 0;
      let camelExtraPay = 0;
      let personExtras = 0;
      let personExtraPay = 0;
      let totalExtraPay = 0;

      // Group days in this month
      const daysMap: Record<string, {
        dateStr: string;
        parsedDate: ReturnType<typeof parseDate>;
        formattedDate: string;
        trips: typeof processedTrips;
        quads: number;
        camels: number;
        pax: number;
        quadExtras: number;
        quadExtraPay: number;
        camelExtras: number;
        camelExtraPay: number;
        personExtras: number;
        personExtraPay: number;
        totalExtraPay: number;
        guides: Set<string>;
        drivers: Set<string>;
        bigVanCount: number;
        miniVanCount: number;
        companies: Set<string>;
      }> = {};

      tripsInMonth.forEach(t => {
        quads += t.quadsCount;
        camels += t.camelsCount;
        pax += t.paxCount;
        quadExtras += t.qExtraCount;
        quadExtraPay += t.qExtraPay;
        camelExtras += t.cExtraCount;
        camelExtraPay += t.cExtraPay;
        personExtras += t.pExtraCount;
        personExtraPay += t.pExtraPay;
        totalExtraPay += t.totalExtraPay;

        const dKey = t.date.trim();
        if (!daysMap[dKey]) {
          daysMap[dKey] = {
            dateStr: dKey,
            parsedDate: t.parsedDate,
            formattedDate: `${t.parsedDate.rawDay}-${t.parsedDate.rawMonth}-${t.parsedDate.rawYear}`,
            trips: [],
            quads: 0,
            camels: 0,
            pax: 0,
            quadExtras: 0,
            quadExtraPay: 0,
            camelExtras: 0,
            camelExtraPay: 0,
            personExtras: 0,
            personExtraPay: 0,
            totalExtraPay: 0,
            guides: new Set<string>(),
            drivers: new Set<string>(),
            bigVanCount: 0,
            miniVanCount: 0,
            companies: new Set<string>()
          };
        }

        daysMap[dKey].trips.push(t);
        daysMap[dKey].quads += t.quadsCount;
        daysMap[dKey].camels += t.camelsCount;
        daysMap[dKey].pax += t.paxCount;
        daysMap[dKey].quadExtras += t.qExtraCount;
        daysMap[dKey].quadExtraPay += t.qExtraPay;
        daysMap[dKey].camelExtras += t.cExtraCount;
        daysMap[dKey].camelExtraPay += t.cExtraPay;
        daysMap[dKey].personExtras += t.pExtraCount;
        daysMap[dKey].personExtraPay += t.pExtraPay;
        daysMap[dKey].totalExtraPay += t.totalExtraPay;

        // Guide aggregation
        if (t.guide && t.guide !== 'WITHOUT GUIDE' && t.guide !== '?' && t.guide !== 'H1' && t.guide !== 'None' && t.guide !== 'none' && t.guide.trim()) {
          t.guide.split(/[,/]/).forEach(g => {
            const cleanG = g.trim();
            if (cleanG && cleanG !== 'WITHOUT GUIDE' && cleanG !== '?' && cleanG !== 'H1' && cleanG !== 'None' && cleanG !== 'none') {
              daysMap[dKey].guides.add(cleanG);
            }
          });
        }

        // Driver & Van Type aggregation
        if (t.driversList && t.driversList.length > 0) {
          t.driversList.forEach(d => {
            if (d.driver && d.driver !== '?' && d.driver !== 'None' && d.driver !== 'none' && d.driver.trim()) {
              daysMap[dKey].drivers.add(d.driver.trim());
            }
            const vType = String(d.van_type || '');
            if (vType === 'Big van' || vType.toLowerCase().includes('big')) {
              daysMap[dKey].bigVanCount += 1;
            } else if (vType === 'Mini van' || vType.toLowerCase().includes('mini')) {
              daysMap[dKey].miniVanCount += 1;
            } else {
              daysMap[dKey].bigVanCount += 1;
            }
            if (d.company && d.company.trim()) {
              daysMap[dKey].companies.add(d.company.trim());
            }
          });
        } else {
          if (t.driver && t.driver !== '?' && t.driver !== 'None' && t.driver !== 'none' && t.driver.trim()) {
            t.driver.split(/[,/]/).forEach(dr => {
              const cleanD = dr.trim();
              if (cleanD && cleanD !== '?' && cleanD !== 'None' && cleanD !== 'none') {
                daysMap[dKey].drivers.add(cleanD);
              }
            });
          }
          if (t.van_type === 'Mini van' || (t.van_type && t.van_type.toLowerCase().includes('mini'))) {
            daysMap[dKey].miniVanCount += 1;
          } else {
            daysMap[dKey].bigVanCount += 1;
          }
        }

        // Company aggregation
        if (t.company && t.company.trim()) {
          daysMap[dKey].companies.add(t.company.trim());
        }
      });

      const daysList = Object.values(daysMap).map(d => ({
        ...d,
        totalGuidesCount: d.guides.size,
        totalDriversCount: d.drivers.size,
        companiesList: Array.from(d.companies).filter(Boolean).join(', ') || 'AGM'
      })).sort((a, b) => {
        return a.parsedDate.day - b.parsedDate.day;
      });

      const activeDays = daysList.length;

      return {
        monthNum,
        monthName,
        tripsCount: tripsInMonth.length,
        activeDays,
        quads,
        camels,
        pax,
        quadExtras,
        quadExtraPay,
        camelExtras,
        camelExtraPay,
        personExtras,
        personExtraPay,
        totalExtraPay,
        daysList,
        hasActivity: tripsInMonth.length > 0
      };
    });
  }, [filteredTrips, activeMonthFilter]);

  // Toggle month expansion
  const toggleMonth = (mNum: number) => {
    setExpandedMonths(prev => ({
      ...prev,
      [mNum]: !prev[mNum]
    }));
  };

  // Toggle day expansion for trip details
  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Expand all active months
  const expandAllMonths = () => {
    const next: Record<number, boolean> = {};
    monthByMonthData.forEach(m => {
      if (m.hasActivity) next[m.monthNum] = true;
    });
    setExpandedMonths(next);
  };

  // Collapse all months
  const collapseAllMonths = () => {
    setExpandedMonths({});
  };

  // Copy structured summary report to clipboard
  const handleCopyReport = () => {
    const periodLabel = activeMonthFilter === 'all' 
      ? `Full Year ${selectedYear}` 
      : `${MONTH_NAMES[activeMonthFilter]} ${selectedYear}`;
    
    let reportText = `AGM FLEET REPORT: ${periodLabel.toUpperCase()} [Mode: ${fleetFilter.toUpperCase()}]\n`;
    reportText += `------------------------------------------------------\n`;
    if (fleetFilter === 'all') {
      reportText += `Total Quads: ${currentStats.totalQuads} Q (Avg: ${currentStats.avgQuadsPerDay}/day)\n`;
      reportText += `Total Camels: ${currentStats.totalCamels} C (Avg: ${currentStats.avgCamelsPerDay}/day)\n`;
      reportText += `Quads Extras: ${currentStats.totalQuadsExtras} units (+${currentStats.totalQuadsExtraPay} DH)\n`;
      reportText += `Camels Extras: ${currentStats.totalCamelsExtras} units (+${currentStats.totalCamelsExtraPay} DH)\n`;
      reportText += `Person Extras: ${currentStats.totalPersonExtras} units (+${currentStats.totalPersonExtraPay} DH)\n`;
      reportText += `Total Extra Revenue: +${currentStats.totalExtraRevenue} DH\n`;
      reportText += `Total Pax: ${currentStats.totalPax} | Active Workdays: ${currentStats.activeDaysCount} | Tours: ${currentStats.totalTours}\n`;
    } else if (fleetFilter === 'quads') {
      reportText += `Total Quads: ${currentStats.totalQuads} Q (Avg: ${currentStats.avgQuadsPerDay}/day, ${currentStats.avgQuadsPerTour}/tour)\n`;
      reportText += `Quads Extras: ${currentStats.totalQuadsExtras} units\n`;
      reportText += `Quads Extra Revenue: +${currentStats.totalQuadsExtraPay} DH\n`;
      reportText += `Active Workdays: ${currentStats.activeDaysCount} | Quads Tours: ${currentStats.totalTours}\n`;
    } else if (fleetFilter === 'camels') {
      reportText += `Total Camels: ${currentStats.totalCamels} C (Avg: ${currentStats.avgCamelsPerDay}/day, ${currentStats.avgCamelsPerTour}/tour)\n`;
      reportText += `Camels Extras: ${currentStats.totalCamelsExtras} units\n`;
      reportText += `Camels Extra Revenue: +${currentStats.totalCamelsExtraPay} DH\n`;
      reportText += `Active Workdays: ${currentStats.activeDaysCount} | Camels Tours: ${currentStats.totalTours}\n`;
    } else if (fleetFilter === 'extras') {
      reportText += `Quads Extras: ${currentStats.totalQuadsExtras} units (+${currentStats.totalQuadsExtraPay} DH)\n`;
      reportText += `Camels Extras: ${currentStats.totalCamelsExtras} units (+${currentStats.totalCamelsExtraPay} DH)\n`;
      reportText += `Person Extras: ${currentStats.totalPersonExtras} units (+${currentStats.totalPersonExtraPay} DH)\n`;
      reportText += `Total Extra Upgrades: ${currentStats.totalExtraUnits} units\n`;
      reportText += `Grand Total Extra Revenue: +${currentStats.totalExtraRevenue} DH\n`;
      reportText += `Excursions with Extras: ${currentStats.totalTours} | Days: ${currentStats.activeDaysCount}\n`;
    }

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    showNotification(`Copied ${periodLabel} summary report to clipboard`);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const activePeriodTitle = activeMonthFilter === 'all'
    ? `Year ${selectedYear} \u2022 All 12 Months`
    : `Year ${selectedYear} \u2022 ${MONTH_NAMES[activeMonthFilter]} (Month ${activeMonthFilter})`;

  return (
    <div className="w-full h-full flex flex-col font-mono text-zinc-100 bg-[#03090d] overflow-hidden select-none">
      
      {/* ================= 1. HEADER & TOP CONTROLS SUITE ================= */}
      <header className="bg-gradient-to-r from-[#06141c] via-[#091e2b] to-[#06141c] border-b border-[#16384a] shrink-0 z-30 shadow-2xl backdrop-blur-md p-4 sm:p-5 space-y-3.5">
        
        {/* Top Line: Brand Title + Period Badge + Copy & Close Buttons */}
        <div className="flex items-center justify-between gap-3 border-b border-[#143242] pb-3 flex-wrap">
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 border ${
              fleetFilter === 'quads' 
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-400'
                : fleetFilter === 'camels'
                ? 'bg-yellow-500/20 border-yellow-400/60 text-yellow-400'
                : fleetFilter === 'extras'
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400'
                : 'bg-gradient-to-br from-amber-500/20 via-[#DFB750]/20 to-[#00c896]/20 border-amber-400/60 text-amber-400'
            }`}>
              {fleetFilter === 'quads' ? (
                <Flame className="w-5 h-5 text-amber-400" />
              ) : fleetFilter === 'camels' ? (
                <Activity className="w-5 h-5 text-yellow-400" />
              ) : fleetFilter === 'extras' ? (
                <Sparkles className="w-5 h-5 text-emerald-400" />
              ) : (
                <Flame className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  {fleetFilter === 'quads' 
                    ? 'Quads Fleet Station' 
                    : fleetFilter === 'camels' 
                    ? 'Camels Caravan Fleet' 
                    : fleetFilter === 'extras'
                    ? 'Fleet Extras & Upgrades'
                    : 'Quads & Camels Fleet & Extras'}
                </h1>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                  activeMonthFilter === 'all'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                }`}>
                  {activePeriodTitle}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {fleetFilter === 'quads'
                  ? 'Detailed analysis of Quads operations, machines, daily tours, and quad upgrades'
                  : fleetFilter === 'camels'
                  ? 'Detailed analysis of Camels caravan operations, rides, daily tours, and camel upgrades'
                  : fleetFilter === 'extras'
                  ? (extrasSubCategory === 'all'
                      ? 'Detailed analysis of all extra upgrades: Quads extras, Camels extras, Person extras, and payments'
                      : extrasSubCategory === 'quads'
                      ? 'Showing only Quads extras: machine upgrades, extra quad units, and quad extra payments'
                      : extrasSubCategory === 'camels'
                      ? 'Showing only Camels extras: caravan upgrades, extra camel units, and camel extra payments'
                      : 'Showing only Person extras: extra passenger upgrades, pax additions, and person extra payments')
                  : 'Monthly breakdowns of Quads, Camels & Extras with on-click daily trip details'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Extra Funds & Consumptions, Copy Report & Close */}
          <div className="flex items-center gap-2">
            {onOpenExtraFunds && (
              <button
                type="button"
                onClick={onOpenExtraFunds}
                className="bg-gradient-to-r from-[#00c896]/20 via-teal-900/40 to-[#00c896]/20 hover:from-[#00c896]/30 hover:to-teal-800/50 text-[#00e6a8] border border-[#00c896]/50 hover:border-[#00e6a8] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Open Daily Extra Funds & Manager Consumptions Ledger"
              >
                <Coins className="w-3.5 h-3.5 text-[#00e6a8]" />
                <span>Extra Funds & Consumptions</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyReport}
              className="bg-[#081822] hover:bg-[#0c222e] text-zinc-300 hover:text-white border border-[#173d50] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Copy Summary Report"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedReport ? 'Copied Report!' : 'Copy Summary'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="bg-[#0a1e28] hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-[#1a4a5f] hover:border-rose-500/50 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Back to Workstation</span>
              </button>
            )}
          </div>

        </div>

        {/* Filter Controls Row 1: Fleet Mode Selector (All Fleet, Only Quads, Only Camels, Extras) + Year Selector + Month Selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          
          {/* Main Filter Buttons: All Fleet, Only Quads, Only Camels, Extras */}
          <div className="flex items-center gap-1.5 bg-[#030d12] border border-[#143342] p-1.5 rounded-2xl flex-wrap">
            
            {/* 1. All Fleet */}
            <button
              type="button"
              onClick={() => setFleetFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                fleetFilter === 'all'
                  ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Fleet (Q + C + Extras)</span>
            </button>

            {/* 2. Only Quads */}
            <button
              type="button"
              onClick={() => setFleetFilter('quads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                fleetFilter === 'quads'
                  ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Only Quads</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                fleetFilter === 'quads' ? 'bg-zinc-950 text-amber-300' : 'bg-amber-950 text-amber-400'
              }`}>
                {currentStats.totalQuads} Q
              </span>
            </button>

            {/* 3. Only Camels */}
            <button
              type="button"
              onClick={() => setFleetFilter('camels')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                fleetFilter === 'camels'
                  ? 'bg-yellow-400 text-zinc-950 font-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#DFB750]" />
              <span>Only Camels</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                fleetFilter === 'camels' ? 'bg-zinc-950 text-yellow-300' : 'bg-yellow-950 text-yellow-400'
              }`}>
                {currentStats.totalCamels} C
              </span>
            </button>

            {/* 4. Extras Button */}
            <button
              type="button"
              onClick={() => setFleetFilter('extras')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                fleetFilter === 'extras'
                  ? 'bg-gradient-to-r from-[#DFB750] to-yellow-300 text-zinc-950 font-black shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#0c222e]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Extras</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                fleetFilter === 'extras' ? 'bg-zinc-950 text-yellow-300' : 'bg-yellow-950 text-yellow-400'
              }`}>
                +{currentStats.totalExtraRevenue} DH
              </span>
            </button>

          </div>

          {/* Right Controls: Year Selector + Month Selector + Search */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-[#051117] border border-[#173a4b] px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#00c896]" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-[#071720] text-white">
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#051117] border border-[#173a4b] px-3 py-1.5 rounded-xl text-xs">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Month:</span>
              <select
                value={activeMonthFilter}
                onChange={(e) => setActiveMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-[#071720] text-white">All 12 Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mNum => (
                  <option key={mNum} value={mNum} className="bg-[#071720] text-white">
                    {MONTH_NAMES[mNum]} (Month {mNum})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[160px] max-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff/dates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#051117] border border-[#173a4b] rounded-xl pl-7 pr-6 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00c896]"
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

        {/* Filter Controls Row 2: Interactive Fast Month Selector Chips Bar */}
        <div className="flex items-center gap-1.5 bg-[#030d12] border border-[#112a38] p-1.5 rounded-xl flex-wrap">
          <span className="text-[9px] text-zinc-500 font-bold uppercase shrink-0 pl-1">Quick Month:</span>
          
          <button
            type="button"
            onClick={() => setActiveMonthFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeMonthFilter === 'all'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
            }`}
          >
            All Months
          </button>

          {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
            const shortName = MONTH_NAMES[mNum].substring(0, 3);
            const isSelected = activeMonthFilter === mNum;

            return (
              <button
                key={mNum}
                type="button"
                onClick={() => setActiveMonthFilter(mNum)}
                className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#DFB750] text-zinc-950 font-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                }`}
              >
                {shortName} ({mNum})
              </button>
            );
          })}
        </div>

        {/* Extras Sub-filter bar (when Extras is selected) */}
        {fleetFilter === 'extras' && (
          <div className="flex items-center gap-2 bg-[#040e14] border border-yellow-500/30 p-2 rounded-xl text-xs animate-fadeIn flex-wrap">
            <span className="text-[10px] text-yellow-300 font-bold uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>Filter Extras Category:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setExtrasSubCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                  extrasSubCategory === 'all' ? 'bg-yellow-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                }`}
              >
                All Extras ({extrasBreakdown.totalUnits} units &bull; +{extrasBreakdown.totalDH} DH)
              </button>

              <button
                type="button"
                onClick={() => setExtrasSubCategory('quads')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  extrasSubCategory === 'quads' ? 'bg-amber-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Quads Extras ({extrasBreakdown.qUnits} &bull; +{extrasBreakdown.qDH} DH)</span>
              </button>

              <button
                type="button"
                onClick={() => setExtrasSubCategory('camels')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  extrasSubCategory === 'camels' ? 'bg-yellow-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                }`}
              >
                <Activity className="w-3 h-3 text-[#DFB750]" />
                <span>Camels Extras ({extrasBreakdown.cUnits} &bull; +{extrasBreakdown.cDH} DH)</span>
              </button>

              <button
                type="button"
                onClick={() => setExtrasSubCategory('person')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  extrasSubCategory === 'person' ? 'bg-cyan-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                }`}
              >
                <Users className="w-3 h-3 text-cyan-400" />
                <span>Person Extras ({extrasBreakdown.pUnits} &bull; +{extrasBreakdown.pDH} DH)</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= DYNAMIC FILTERED KPI SQUARES UNDER FILTERING ================= */}
        {/* Strictly calculates ONLY for the selected Year, Month, and fleetFilter mode! */}
        
        {/* 1. ALL FLEET MODE KPI SQUARES (Includes Person Extra card!) */}
        {fleetFilter === 'all' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-1">
            
            {/* Square 1: Total Quads */}
            <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Quads</span>
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-black text-amber-300">
                {currentStats.totalQuads} <span className="text-xs text-amber-400 font-normal">Quads</span>
              </div>
              <div className="text-[9px] text-zinc-400 flex items-center justify-between">
                <span>Avg: <strong className="text-white">{currentStats.avgQuadsPerDay}/day</strong></span>
                <span className="text-amber-400 font-bold">Machines</span>
              </div>
            </div>

            {/* Square 2: Total Camels */}
            <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-[#DFB750]">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Camels</span>
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-black text-[#DFB750]">
                {currentStats.totalCamels} <span className="text-xs text-yellow-400 font-normal">Camels</span>
              </div>
              <div className="text-[9px] text-zinc-400 flex items-center justify-between">
                <span>Avg: <strong className="text-white">{currentStats.avgCamelsPerDay}/day</strong></span>
                <span className="text-yellow-400 font-bold">Caravan</span>
              </div>
            </div>

            {/* Square 3: Quads Extras */}
            <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-amber-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extras</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-black text-white">
                {currentStats.totalQuadsExtras} <span className="text-xs text-zinc-400 font-normal">Units</span>
              </div>
              <div className="text-[9px] text-amber-400 font-bold truncate">
                +{currentStats.totalQuadsExtraPay} DH Extra Pay
              </div>
            </div>

            {/* Square 4: Camels Extras */}
            <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-yellow-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extras</span>
                <Sparkles className="w-3.5 h-3.5 text-[#DFB750]" />
              </div>
              <div className="text-lg font-black text-white">
                {currentStats.totalCamelsExtras} <span className="text-xs text-zinc-400 font-normal">Units</span>
              </div>
              <div className="text-[9px] text-yellow-400 font-bold truncate">
                +{currentStats.totalCamelsExtraPay} DH Extra Pay
              </div>
            </div>

            {/* Square 5: Person Extras (Pax Extra) -> Added as requested! */}
            <div className="bg-[#051117] border border-cyan-500/30 p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-cyan-400">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Person Extra (Pax)</span>
                <Users className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-black text-cyan-300">
                {currentStats.totalPersonExtras} <span className="text-xs text-zinc-400 font-normal">Pax</span>
              </div>
              <div className="text-[9px] text-cyan-400 font-bold truncate">
                +{currentStats.totalPersonExtraPay} DH Extra Pay
              </div>
            </div>

            {/* Square 6: Total Extra Revenue */}
            <div className="bg-[#051117] border border-[#00c896]/40 p-2.5 rounded-xl space-y-0.5 bg-[#00c896]/5 shadow-sm">
              <div className="flex items-center justify-between text-[#00e6a8]">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Extras Pay</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-black text-[#00e6a8]">
                +{currentStats.totalExtraRevenue} <span className="text-xs font-normal">DH</span>
              </div>
              <div className="text-[9px] text-zinc-400">
                {currentStats.totalExtraUnits} Upgrades Logged
              </div>
            </div>

            {/* Square 7: Total Pax & Workdays */}
            <div className="bg-[#051117] border border-[#16384a] p-2.5 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-200">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Pax</span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="text-lg font-black text-white">
                {currentStats.totalPax} <span className="text-xs text-zinc-400 font-normal">Pax</span>
              </div>
              <div className="text-[9px] text-zinc-400">
                {currentStats.activeDaysCount} Days ({currentStats.totalTours} Tours)
              </div>
            </div>

          </div>
        )}

        {/* 2. ONLY QUADS MODE KPI SQUARES (Shows ONLY Quads information - No camels!) */}
        {fleetFilter === 'quads' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 animate-fadeIn">
            
            {/* Card 1: Total Quads Machines */}
            <div className="bg-[#051117] border border-amber-500/40 p-3 rounded-xl space-y-0.5 bg-amber-500/5 shadow-sm">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Quads Fleet</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300">
                {currentStats.totalQuads} <span className="text-xs text-amber-400 font-normal">Quads</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgQuadsPerDay}</strong> machines / workday
              </div>
            </div>

            {/* Card 2: Quads Extras Count */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-amber-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extras Units</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalQuadsExtras} <span className="text-xs text-zinc-400 font-normal">Extra Quads</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Logged quad upgrades
              </div>
            </div>

            {/* Card 3: Quads Extra Revenue in DH */}
            <div className="bg-[#051117] border border-[#00c896]/40 p-3 rounded-xl space-y-0.5 bg-[#00c896]/5 shadow-sm">
              <div className="flex items-center justify-between text-[#00e6a8]">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extra Revenue</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-[#00e6a8]">
                +{currentStats.totalQuadsExtraPay} <span className="text-xs font-normal">DH</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Extra payment generated
              </div>
            </div>

            {/* Card 4: Quads Excursions / Tours */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Excursions</span>
                <Bike className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgQuadsPerTour}</strong> quads / tour
              </div>
            </div>

            {/* Card 5: Active Quads Workdays */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Active Quads Days</span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.activeDaysCount} <span className="text-xs text-zinc-400 font-normal">Workdays</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                in {activePeriodTitle}
              </div>
            </div>

            {/* Card 6: Total Pax on Quads */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Pax (Quads)</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalPax} <span className="text-xs text-zinc-400 font-normal">Pax</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgPaxPerTour}</strong> pax / excursion
              </div>
            </div>

          </div>
        )}

        {/* 3. ONLY CAMELS MODE KPI SQUARES (Shows ONLY Camels information - No quads!) */}
        {fleetFilter === 'camels' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 animate-fadeIn">
            
            {/* Card 1: Total Camels Caravan */}
            <div className="bg-[#051117] border border-yellow-500/40 p-3 rounded-xl space-y-0.5 bg-yellow-500/5 shadow-sm">
              <div className="flex items-center justify-between text-yellow-400">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Camels Fleet</span>
                <Activity className="w-4 h-4 text-[#DFB750]" />
              </div>
              <div className="text-xl font-black text-[#DFB750]">
                {currentStats.totalCamels} <span className="text-xs text-yellow-400 font-normal">Camels</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgCamelsPerDay}</strong> camels / workday
              </div>
            </div>

            {/* Card 2: Camels Extras Count */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-yellow-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extras Units</span>
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalCamelsExtras} <span className="text-xs text-zinc-400 font-normal">Extra Camels</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Logged camel upgrades
              </div>
            </div>

            {/* Card 3: Camels Extra Revenue in DH */}
            <div className="bg-[#051117] border border-[#00c896]/40 p-3 rounded-xl space-y-0.5 bg-[#00c896]/5 shadow-sm">
              <div className="flex items-center justify-between text-[#00e6a8]">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extra Revenue</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-[#00e6a8]">
                +{currentStats.totalCamelsExtraPay} <span className="text-xs font-normal">DH</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Extra payment generated
              </div>
            </div>

            {/* Card 4: Camels Excursions / Tours */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Excursions</span>
                <Footprints className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgCamelsPerTour}</strong> camels / tour
              </div>
            </div>

            {/* Card 5: Active Camels Workdays */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Active Camels Days</span>
                <Calendar className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.activeDaysCount} <span className="text-xs text-zinc-400 font-normal">Workdays</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                in {activePeriodTitle}
              </div>
            </div>

            {/* Card 6: Total Pax on Camels */}
            <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Pax (Camels)</span>
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-black text-white">
                {currentStats.totalPax} <span className="text-xs text-zinc-400 font-normal">Pax</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Avg: <strong className="text-white">{currentStats.avgPaxPerTour}</strong> pax / excursion
              </div>
            </div>

          </div>
        )}

        {/* 4. EXTRAS MODE KPI SQUARES (Shows specialized metrics based on subcategory) */}
        {fleetFilter === 'extras' && (
          <div className="pt-1 animate-fadeIn">
            {/* 4.1 All Extras Mode (6 general overview cards) */}
            {extrasSubCategory === 'all' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Card 1: Quads Extras */}
                <div className="bg-[#051117] border border-amber-500/40 p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extras</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-amber-300">
                    {currentStats.totalQuadsExtras} <span className="text-xs text-zinc-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    +{currentStats.totalQuadsExtraPay} DH Extra Pay
                  </div>
                </div>

                {/* Card 2: Camels Extras */}
                <div className="bg-[#051117] border border-yellow-500/40 p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-yellow-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extras</span>
                    <Activity className="w-4 h-4 text-[#DFB750]" />
                  </div>
                  <div className="text-xl font-black text-[#DFB750]">
                    {currentStats.totalCamelsExtras} <span className="text-xs text-zinc-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    +{currentStats.totalCamelsExtraPay} DH Extra Pay
                  </div>
                </div>

                {/* Card 3: Person Extras */}
                <div className="bg-[#051117] border border-cyan-500/40 p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Person Extras</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    {currentStats.totalPersonExtras} <span className="text-xs text-zinc-400 font-normal">Pax</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    +{currentStats.totalPersonExtraPay} DH Extra Pay
                  </div>
                </div>

                {/* Card 4: Grand Total Extras Revenue */}
                <div className="bg-[#051117] border border-[#00c896]/60 p-3 rounded-xl space-y-0.5 bg-[#00c896]/10 shadow-sm">
                  <div className="flex items-center justify-between text-[#00e6a8]">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Extras Revenue</span>
                    <Coins className="w-4 h-4 text-[#00e6a8]" />
                  </div>
                  <div className="text-xl font-black text-[#00e6a8]">
                    +{currentStats.totalExtraRevenue} <span className="text-xs font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    Grand Total of All Upgrades
                  </div>
                </div>

                {/* Card 5: Total Upgrade Units */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Total Extra Units</span>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.totalExtraUnits} <span className="text-xs text-zinc-400 font-normal">Upgrades</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Q ({currentStats.totalQuadsExtras}) + C ({currentStats.totalCamelsExtras}) + P ({currentStats.totalPersonExtras})
                  </div>
                </div>

                {/* Card 6: Tours with Extras */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Extras Excursions</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    across {currentStats.activeDaysCount} active workdays
                  </div>
                </div>
              </div>
            )}

            {/* 4.2 Quads Extras Only Mode (6 Quads Extras specific cards) */}
            {extrasSubCategory === 'quads' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Card 1: Quads Extras Units */}
                <div className="bg-[#051117] border border-amber-500/50 p-3 rounded-xl space-y-0.5 bg-amber-500/5 shadow-sm">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extras</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-amber-300">
                    {currentStats.totalQuadsExtras} <span className="text-xs text-amber-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Logged quad machine upgrades
                  </div>
                </div>

                {/* Card 2: Quads Extra Revenue */}
                <div className="bg-[#051117] border border-[#00c896]/50 p-3 rounded-xl space-y-0.5 bg-[#00c896]/10 shadow-sm">
                  <div className="flex items-center justify-between text-[#00e6a8]">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extra Revenue</span>
                    <Coins className="w-4 h-4 text-[#00e6a8]" />
                  </div>
                  <div className="text-xl font-black text-[#00e6a8]">
                    +{currentStats.totalQuadsExtraPay} <span className="text-xs font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    Extra payment from Quads
                  </div>
                </div>

                {/* Card 3: Tours with Quads Extras */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Quads Extra Tours</span>
                    <Bike className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Excursions with Quads Extras
                  </div>
                </div>

                {/* Card 4: Active Quads Extra Days */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Active Extra Days</span>
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.activeDaysCount} <span className="text-xs text-zinc-400 font-normal">Days</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Workdays with Q Extras
                  </div>
                </div>

                {/* Card 5: Avg Q Extra per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg Q Extra / Tour</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.avgQuadsExtraPerTour} <span className="text-xs text-zinc-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average per excursion
                  </div>
                </div>

                {/* Card 6: Avg Q Extra Pay per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg Extra Pay / Tour</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-300">
                    +{currentStats.avgQuadsExtraPayPerTour} <span className="text-xs text-zinc-400 font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average revenue per tour
                  </div>
                </div>
              </div>
            )}

            {/* 4.3 Camels Extras Only Mode (6 Camels Extras specific cards) */}
            {extrasSubCategory === 'camels' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Card 1: Camels Extras Units */}
                <div className="bg-[#051117] border border-yellow-500/50 p-3 rounded-xl space-y-0.5 bg-yellow-500/5 shadow-sm">
                  <div className="flex items-center justify-between text-yellow-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extras</span>
                    <Activity className="w-4 h-4 text-[#DFB750]" />
                  </div>
                  <div className="text-xl font-black text-[#DFB750]">
                    {currentStats.totalCamelsExtras} <span className="text-xs text-yellow-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Logged camel ride upgrades
                  </div>
                </div>

                {/* Card 2: Camels Extra Revenue */}
                <div className="bg-[#051117] border border-[#00c896]/50 p-3 rounded-xl space-y-0.5 bg-[#00c896]/10 shadow-sm">
                  <div className="flex items-center justify-between text-[#00e6a8]">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extra Revenue</span>
                    <Coins className="w-4 h-4 text-[#00e6a8]" />
                  </div>
                  <div className="text-xl font-black text-[#00e6a8]">
                    +{currentStats.totalCamelsExtraPay} <span className="text-xs font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    Extra payment from Camels
                  </div>
                </div>

                {/* Card 3: Tours with Camels Extras */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Camels Extra Tours</span>
                    <Footprints className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Excursions with Camels Extras
                  </div>
                </div>

                {/* Card 4: Active Camels Extra Days */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Active Extra Days</span>
                    <Calendar className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.activeDaysCount} <span className="text-xs text-zinc-400 font-normal">Days</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Workdays with C Extras
                  </div>
                </div>

                {/* Card 5: Avg C Extra per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg C Extra / Tour</span>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.avgCamelsExtraPerTour} <span className="text-xs text-zinc-400 font-normal">Units</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average per excursion
                  </div>
                </div>

                {/* Card 6: Avg C Extra Pay per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg Extra Pay / Tour</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-300">
                    +{currentStats.avgCamelsExtraPayPerTour} <span className="text-xs text-zinc-400 font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average revenue per tour
                  </div>
                </div>
              </div>
            )}

            {/* 4.4 Person Extras Only Mode (6 Person Extras specific cards) */}
            {extrasSubCategory === 'person' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Card 1: Person Extras Pax */}
                <div className="bg-[#051117] border border-cyan-500/50 p-3 rounded-xl space-y-0.5 bg-cyan-500/5 shadow-sm">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Person Extras</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    {currentStats.totalPersonExtras} <span className="text-xs text-cyan-400 font-normal">Pax</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Logged passenger upgrades
                  </div>
                </div>

                {/* Card 2: Person Extra Revenue */}
                <div className="bg-[#051117] border border-[#00c896]/50 p-3 rounded-xl space-y-0.5 bg-[#00c896]/10 shadow-sm">
                  <div className="flex items-center justify-between text-[#00e6a8]">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Person Extra Revenue</span>
                    <Coins className="w-4 h-4 text-[#00e6a8]" />
                  </div>
                  <div className="text-xl font-black text-[#00e6a8]">
                    +{currentStats.totalPersonExtraPay} <span className="text-xs font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    Extra payment from Pax
                  </div>
                </div>

                {/* Card 3: Tours with Person Extras */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Pax Extra Tours</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.totalTours} <span className="text-xs text-zinc-400 font-normal">Tours</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Excursions with Person Extras
                  </div>
                </div>

                {/* Card 4: Active Person Extra Days */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Active Extra Days</span>
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.activeDaysCount} <span className="text-xs text-zinc-400 font-normal">Days</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Workdays with Pax Extras
                  </div>
                </div>

                {/* Card 5: Avg Pax Extra per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg Pax Extra / Tour</span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {currentStats.avgPersonExtraPerTour} <span className="text-xs text-zinc-400 font-normal">Pax</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average per excursion
                  </div>
                </div>

                {/* Card 6: Avg Pax Extra Pay per Tour */}
                <div className="bg-[#051117] border border-[#16384a] p-3 rounded-xl space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-200">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">Avg Extra Pay / Tour</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-300">
                    +{currentStats.avgPersonExtraPayPerTour} <span className="text-xs text-zinc-400 font-normal">DH</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Average revenue per tour
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </header>

      {/* ================= 2. MONTH-BY-MONTH VIEW CONTAINER ================= */}
      <main className="w-full p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-none">
        
        {/* Section Header with Expand / Collapse Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#00c896]" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              {activeMonthFilter === 'all' 
                ? `Month by Month Overview \u2022 Year ${selectedYear}`
                : `${MONTH_NAMES[activeMonthFilter]} Overview \u2022 Year ${selectedYear}`}
            </h2>
            <span className="bg-[#081822] text-zinc-400 border border-[#143242] text-[10px] px-2 py-0.5 rounded-full font-bold">
              {fleetFilter === 'quads' ? 'Only Quads' : fleetFilter === 'camels' ? 'Only Camels' : fleetFilter === 'extras' ? 'Extras Only' : 'All Fleet'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Click on any month to view days &bull; Click on any day to view daily trip details
            </span>

            {activeMonthFilter === 'all' && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={expandAllMonths}
                  className="px-2.5 py-1 rounded-lg bg-[#081822] hover:bg-[#0c2433] text-zinc-300 hover:text-white border border-[#153a4e] text-[11px] font-bold cursor-pointer transition-all"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAllMonths}
                  className="px-2.5 py-1 rounded-lg bg-[#081822] hover:bg-[#0c2433] text-zinc-300 hover:text-white border border-[#153a4e] text-[11px] font-bold cursor-pointer transition-all"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Month Cards Grid / List */}
        <div className="space-y-4">
          {monthByMonthData.map((month) => {
            const isMonthOpen = expandedMonths[month.monthNum] ?? (activeMonthFilter !== 'all' || month.hasActivity);
            const hasActivity = month.hasActivity;

            return (
              <div
                key={month.monthNum}
                className={`bg-[#071720] border transition-all rounded-2xl overflow-hidden shadow-xl ${
                  hasActivity 
                    ? (isMonthOpen ? 'border-[#00c896]/60 shadow-[0_0_25px_rgba(0,200,150,0.1)]' : 'border-[#163c4e] hover:border-[#1e5068]')
                    : 'border-[#0e2430] opacity-70 bg-[#050f14]'
                }`}
              >
                {/* Month Summary Bar Header */}
                <div
                  onClick={() => toggleMonth(month.monthNum)}
                  className="p-4 sm:p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer hover:bg-[#0c222e] transition-colors"
                >
                  {/* Left: Month Info */}
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      hasActivity ? 'bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8]' : 'bg-[#0a1820] text-zinc-600'
                    }`}>
                      {String(month.monthNum).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-black text-white tracking-wide">
                          {month.monthName} {selectedYear}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          hasActivity ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {hasActivity ? `${month.activeDays} Workdays \u2022 ${month.tripsCount} Tours` : 'No Excursions'}
                        </span>
                      </div>
                      
                      {/* Subtitle depending on mode */}
                      <div className="text-[11px] text-zinc-400 flex items-center gap-3 mt-1 flex-wrap">
                        {fleetFilter === 'all' && (
                          <>
                            <span>Pax: <strong className="text-white">{month.pax}</strong></span>
                            <span>&bull;</span>
                            <span>Quads: <strong className="text-amber-400">{month.quads} Q</strong></span>
                            <span>&bull;</span>
                            <span>Camels: <strong className="text-[#DFB750]">{month.camels} C</strong></span>
                            <span>&bull;</span>
                            <span className="text-[#00e6a8] font-bold">Extras: +{month.totalExtraPay} DH</span>
                          </>
                        )}

                        {fleetFilter === 'quads' && (
                          <>
                            <span>Quads: <strong className="text-amber-400">{month.quads} Q</strong></span>
                            <span>&bull;</span>
                            <span>Quads Extras: <strong className="text-amber-300">{month.quadExtras} Units</strong></span>
                            <span>&bull;</span>
                            <span className="text-[#00e6a8] font-bold">Quads Extra Pay: +{month.quadExtraPay} DH</span>
                            <span>&bull;</span>
                            <span>Pax: <strong className="text-white">{month.pax}</strong></span>
                          </>
                        )}

                        {fleetFilter === 'camels' && (
                          <>
                            <span>Camels: <strong className="text-[#DFB750]">{month.camels} C</strong></span>
                            <span>&bull;</span>
                            <span>Camels Extras: <strong className="text-yellow-300">{month.camelExtras} Units</strong></span>
                            <span>&bull;</span>
                            <span className="text-[#00e6a8] font-bold">Camels Extra Pay: +{month.camelExtraPay} DH</span>
                            <span>&bull;</span>
                            <span>Pax: <strong className="text-white">{month.pax}</strong></span>
                          </>
                        )}

                        {fleetFilter === 'extras' && (
                          <>
                            {extrasSubCategory === 'all' ? (
                              <>
                                <span>Quads Extras: <strong className="text-amber-400">{month.quadExtras} (+{month.quadExtraPay} DH)</strong></span>
                                <span>&bull;</span>
                                <span>Camels Extras: <strong className="text-yellow-400">{month.camelExtras} (+{month.camelExtraPay} DH)</strong></span>
                                <span>&bull;</span>
                                <span>Person Extras: <strong className="text-cyan-400">{month.personExtras} (+{month.personExtraPay} DH)</strong></span>
                                <span>&bull;</span>
                                <span className="text-[#00e6a8] font-black">Total Extra Revenue: +{month.totalExtraPay} DH</span>
                              </>
                            ) : extrasSubCategory === 'quads' ? (
                              <>
                                <span>Quads Extras: <strong className="text-amber-400">{month.quadExtras} Units</strong></span>
                                <span>&bull;</span>
                                <span className="text-[#00e6a8] font-bold">Quads Extra Pay: +{month.quadExtraPay} DH</span>
                                <span>&bull;</span>
                                <span>Tours with Q Extras: <strong className="text-white">{month.tripsCount}</strong></span>
                              </>
                            ) : extrasSubCategory === 'camels' ? (
                              <>
                                <span>Camels Extras: <strong className="text-yellow-400">{month.camelExtras} Units</strong></span>
                                <span>&bull;</span>
                                <span className="text-[#00e6a8] font-bold">Camels Extra Pay: +{month.camelExtraPay} DH</span>
                                <span>&bull;</span>
                                <span>Tours with C Extras: <strong className="text-white">{month.tripsCount}</strong></span>
                              </>
                            ) : (
                              <>
                                <span>Person Extras: <strong className="text-cyan-400">{month.personExtras} Pax</strong></span>
                                <span>&bull;</span>
                                <span className="text-[#00e6a8] font-bold">Person Extra Pay: +{month.personExtraPay} DH</span>
                                <span>&bull;</span>
                                <span>Tours with Pax Extras: <strong className="text-white">{month.tripsCount}</strong></span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Key Counters depending strictly on fleetFilter + Expand Toggle */}
                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
                    
                    {/* ALL FLEET MODE RIGHT COUNTERS */}
                    {fleetFilter === 'all' && (
                      <>
                        <div className="bg-[#030d12] border border-amber-500/30 px-3 py-1.5 rounded-xl text-center min-w-[85px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Quads</span>
                          <span className="text-sm font-black text-amber-400">{month.quads} Q</span>
                        </div>

                        <div className="bg-[#030d12] border border-yellow-500/30 px-3 py-1.5 rounded-xl text-center min-w-[85px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Camels</span>
                          <span className="text-sm font-black text-[#DFB750]">{month.camels} C</span>
                        </div>

                        <div className="bg-[#030d12] border border-[#00c896]/30 px-3 py-1.5 rounded-xl text-center min-w-[100px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Extras</span>
                          <span className="text-xs font-bold text-[#00e6a8]">
                            {month.totalExtraPay > 0 ? `+${month.totalExtraPay} DH` : '0 DH'}
                          </span>
                        </div>
                      </>
                    )}

                    {/* ONLY QUADS RIGHT COUNTERS (No Camels!) */}
                    {fleetFilter === 'quads' && (
                      <>
                        <div className="bg-[#030d12] border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-center min-w-[95px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Quads</span>
                          <span className="text-sm font-black text-amber-400">{month.quads} Q</span>
                        </div>

                        <div className="bg-[#030d12] border border-[#16384a] px-3 py-1.5 rounded-xl text-center min-w-[85px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Q Extras</span>
                          <span className="text-xs font-bold text-white">{month.quadExtras} Units</span>
                        </div>

                        <div className="bg-[#030d12] border border-[#00c896]/30 px-3 py-1.5 rounded-xl text-center min-w-[100px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Q Extra DH</span>
                          <span className="text-xs font-bold text-[#00e6a8]">
                            {month.quadExtraPay > 0 ? `+${month.quadExtraPay} DH` : '0 DH'}
                          </span>
                        </div>
                      </>
                    )}

                    {/* ONLY CAMELS RIGHT COUNTERS (No Quads!) */}
                    {fleetFilter === 'camels' && (
                      <>
                        <div className="bg-[#030d12] border border-yellow-500/40 px-3.5 py-1.5 rounded-xl text-center min-w-[95px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Camels</span>
                          <span className="text-sm font-black text-[#DFB750]">{month.camels} C</span>
                        </div>

                        <div className="bg-[#030d12] border border-[#16384a] px-3 py-1.5 rounded-xl text-center min-w-[85px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">C Extras</span>
                          <span className="text-xs font-bold text-white">{month.camelExtras} Units</span>
                        </div>

                        <div className="bg-[#030d12] border border-[#00c896]/30 px-3 py-1.5 rounded-xl text-center min-w-[100px]">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block">C Extra DH</span>
                          <span className="text-xs font-bold text-[#00e6a8]">
                            {month.camelExtraPay > 0 ? `+${month.camelExtraPay} DH` : '0 DH'}
                          </span>
                        </div>
                      </>
                    )}

                    {/* EXTRAS MODE RIGHT COUNTERS (Only Extras Data based on subcategory!) */}
                    {fleetFilter === 'extras' && (
                      <>
                        {extrasSubCategory === 'all' && (
                          <>
                            <div className="bg-[#030d12] border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-center min-w-[80px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Q Extra</span>
                              <span className="text-xs font-bold text-amber-300">+{month.quadExtraPay} DH</span>
                            </div>

                            <div className="bg-[#030d12] border border-yellow-500/30 px-2.5 py-1.5 rounded-xl text-center min-w-[80px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">C Extra</span>
                              <span className="text-xs font-bold text-yellow-300">+{month.camelExtraPay} DH</span>
                            </div>

                            <div className="bg-[#030d12] border border-cyan-500/30 px-2.5 py-1.5 rounded-xl text-center min-w-[80px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Pax Extra</span>
                              <span className="text-xs font-bold text-cyan-300">+{month.personExtraPay} DH</span>
                            </div>

                            <div className="bg-[#030d12] border border-[#00c896]/40 px-3 py-1.5 rounded-xl text-center min-w-[105px] bg-[#00c896]/5">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Total Extra DH</span>
                              <span className="text-xs font-black text-[#00e6a8]">
                                {month.totalExtraPay > 0 ? `+${month.totalExtraPay} DH` : '0 DH'}
                              </span>
                            </div>
                          </>
                        )}

                        {extrasSubCategory === 'quads' && (
                          <>
                            <div className="bg-[#030d12] border border-amber-500/40 px-3 py-1.5 rounded-xl text-center min-w-[95px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Q Extras</span>
                              <span className="text-xs font-black text-amber-300">{month.quadExtras} Units</span>
                            </div>

                            <div className="bg-[#030d12] border border-[#00c896]/40 px-3 py-1.5 rounded-xl text-center min-w-[105px] bg-[#00c896]/5">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Q Extra Pay</span>
                              <span className="text-xs font-black text-[#00e6a8]">
                                {month.quadExtraPay > 0 ? `+${month.quadExtraPay} DH` : '0 DH'}
                              </span>
                            </div>
                          </>
                        )}

                        {extrasSubCategory === 'camels' && (
                          <>
                            <div className="bg-[#030d12] border border-yellow-500/40 px-3 py-1.5 rounded-xl text-center min-w-[95px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">C Extras</span>
                              <span className="text-xs font-black text-yellow-300">{month.camelExtras} Units</span>
                            </div>

                            <div className="bg-[#030d12] border border-[#00c896]/40 px-3 py-1.5 rounded-xl text-center min-w-[105px] bg-[#00c896]/5">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">C Extra Pay</span>
                              <span className="text-xs font-black text-[#00e6a8]">
                                {month.camelExtraPay > 0 ? `+${month.camelExtraPay} DH` : '0 DH'}
                              </span>
                            </div>
                          </>
                        )}

                        {extrasSubCategory === 'person' && (
                          <>
                            <div className="bg-[#030d12] border border-cyan-500/40 px-3 py-1.5 rounded-xl text-center min-w-[95px]">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Pax Extras</span>
                              <span className="text-xs font-black text-cyan-300">{month.personExtras} Pax</span>
                            </div>

                            <div className="bg-[#030d12] border border-[#00c896]/40 px-3 py-1.5 rounded-xl text-center min-w-[105px] bg-[#00c896]/5">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold block">Pax Extra Pay</span>
                              <span className="text-xs font-black text-[#00e6a8]">
                                {month.personExtraPay > 0 ? `+${month.personExtraPay} DH` : '0 DH'}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Expand/Collapse Button */}
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0c222e] text-zinc-300 text-xs font-bold">
                      <span>{isMonthOpen ? 'Hide Days' : `Show ${month.activeDays} Days`}</span>
                      {isMonthOpen ? <ChevronUp className="w-4 h-4 text-[#00e6a8]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </div>

                  </div>
                </div>

                {/* Month Body: Days in this Month (shown when month is open) */}
                {isMonthOpen && (
                  <div className="bg-[#040e14] border-t border-[#122c38] p-4 sm:p-5 space-y-3 animate-fadeIn">
                    
                    {month.daysList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                        No excursion records logged for {month.monthName} {selectedYear} matching current filter.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400 px-1 border-b border-[#0f2532] pb-2 flex-wrap gap-2">
                          <span className="font-bold uppercase text-[#00e6a8] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Days of {month.monthName} ({month.daysList.length} Active Workdays)</span>
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Click on any day below to expand daily trip details
                          </span>
                        </div>

                        {/* Days List */}
                        {month.daysList.map((dayItem) => {
                          const isDayExpanded = expandedDays[dayItem.dateStr] || false;

                          return (
                            <div
                              key={dayItem.dateStr}
                              className={`bg-[#07161f] border transition-all rounded-xl overflow-hidden ${
                                isDayExpanded ? 'border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-[#112a38] hover:border-[#1d475d]'
                              }`}
                            >
                              {/* Day Row Header */}
                              <div
                                onClick={() => toggleDay(dayItem.dateStr)}
                                className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-[#0c222e] transition-colors"
                              >
                                {/* Left: Day Number, Date, Tours, Total Pax & Summary of Guides/Drivers/Vans/Companies */}
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#030d12] border border-[#183d50] text-[#00e6a8] flex flex-col items-center justify-center font-bold text-xs shrink-0">
                                    <span className="text-[9px] text-zinc-400 uppercase leading-none">DAY</span>
                                    <span className="text-xs font-black text-white leading-none mt-0.5">{dayItem.parsedDate.rawDay}</span>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-white tracking-wide">
                                        {dayItem.formattedDate}
                                      </span>
                                      <span className="text-zinc-500">&bull;</span>
                                      <span className="text-xs font-bold text-zinc-300">
                                        {dayItem.trips.length} {dayItem.trips.length === 1 ? 'tour' : 'tours'}
                                      </span>
                                      <span className="text-zinc-500">&bull;</span>
                                      <span className="text-xs font-bold text-[#00e6a8]">
                                        Total pax: {dayItem.pax}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-1 flex-wrap">
                                      <span>Total guides: <strong className="text-emerald-300">{dayItem.totalGuidesCount}</strong></span>
                                      <span className="text-zinc-600">&bull;</span>
                                      <span>Total drivers: <strong className="text-cyan-300">{dayItem.totalDriversCount}</strong></span>
                                      <span className="text-zinc-600">&bull;</span>
                                      <span>Big van: <strong className="text-amber-300">{dayItem.bigVanCount}</strong> - Mini van: <strong className="text-yellow-300">{dayItem.miniVanCount}</strong></span>
                                      <span className="text-zinc-600">&bull;</span>
                                      <span>Companies: <strong className="text-white">{dayItem.companiesList}</strong></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Day Counters & Badges strictly filtered by mode */}
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                                  
                                  {/* 1. ALL FLEET DAY COUNTERS */}
                                  {fleetFilter === 'all' && (
                                    <>
                                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {dayItem.quads} Quads
                                      </span>

                                      <span className="bg-yellow-950/80 text-yellow-300 border border-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {dayItem.camels} Camels
                                      </span>

                                      <span className="bg-[#030d12] border border-[#00c896]/30 text-[#00e6a8] px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {dayItem.totalExtraPay > 0 ? `+${dayItem.totalExtraPay} DH Extras` : 'No Extras'}
                                      </span>
                                    </>
                                  )}

                                  {/* 2. ONLY QUADS DAY COUNTERS (No Camels!) */}
                                  {fleetFilter === 'quads' && (
                                    <>
                                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {dayItem.quads} Quads
                                      </span>

                                      {dayItem.quadExtras > 0 && (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg text-xs font-bold">
                                          {dayItem.quadExtras} Q Extras (+{dayItem.quadExtraPay} DH)
                                        </span>
                                      )}
                                    </>
                                  )}

                                  {/* 3. ONLY CAMELS DAY COUNTERS (No Quads!) */}
                                  {fleetFilter === 'camels' && (
                                    <>
                                      <span className="bg-yellow-950/80 text-yellow-300 border border-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {dayItem.camels} Camels
                                      </span>

                                      {dayItem.camelExtras > 0 && (
                                        <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-1 rounded-lg text-xs font-bold">
                                          {dayItem.camelExtras} C Extras (+{dayItem.camelExtraPay} DH)
                                        </span>
                                      )}
                                    </>
                                  )}

                                  {/* 4. EXTRAS MODE DAY COUNTERS (Only Extras Data!) */}
                                  {fleetFilter === 'extras' && (
                                    <>
                                      {dayItem.quadExtras > 0 && (
                                        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-1 rounded-lg text-xs font-bold">
                                          Q Extra: {dayItem.quadExtras} (+{dayItem.quadExtraPay} DH)
                                        </span>
                                      )}

                                      {dayItem.camelExtras > 0 && (
                                        <span className="bg-yellow-950 text-yellow-300 border border-yellow-800 px-2 py-1 rounded-lg text-xs font-bold">
                                          C Extra: {dayItem.camelExtras} (+{dayItem.camelExtraPay} DH)
                                        </span>
                                      )}

                                      {dayItem.personExtras > 0 && (
                                        <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-1 rounded-lg text-xs font-bold">
                                          Pax Extra: {dayItem.personExtras} (+{dayItem.personExtraPay} DH)
                                        </span>
                                      )}

                                      <span className="bg-[#030d12] border border-[#00c896]/40 text-[#00e6a8] px-2.5 py-1 rounded-lg text-xs font-black">
                                        +{dayItem.totalExtraPay} DH Total
                                      </span>
                                    </>
                                  )}

                                  {/* Day Details Toggle Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDay(dayItem.dateStr);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isDayExpanded 
                                        ? 'bg-amber-400 text-zinc-950 font-black' 
                                        : 'bg-[#0a1e28] hover:bg-[#123648] text-zinc-200 border border-[#1a4a5f]'
                                    }`}
                                  >
                                    <span>{isDayExpanded ? 'Hide Details' : 'Day Details'}</span>
                                    {isDayExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>

                                </div>
                              </div>

                              {/* TRIP DETAILS FOR THIS DAY (Only shown if user clicked on day!) */}
                              {isDayExpanded && (
                                <div className="bg-[#030a0e] border-t border-[#102735] p-3.5 sm:p-4 space-y-2.5 animate-fadeIn">
                                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#0d222e] flex-wrap gap-2">
                                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                      {fleetFilter === 'quads' ? <Flame className="w-3.5 h-3.5 text-amber-400" /> : fleetFilter === 'camels' ? <Activity className="w-3.5 h-3.5 text-yellow-400" /> : <Sparkles className="w-3.5 h-3.5 text-[#00e6a8]" />}
                                      <span>
                                        {fleetFilter === 'quads' 
                                          ? `Quads Excursions for ${dayItem.dateStr} (${dayItem.trips.length} Tours)`
                                          : fleetFilter === 'camels'
                                          ? `Camels Excursions for ${dayItem.dateStr} (${dayItem.trips.length} Tours)`
                                          : fleetFilter === 'extras'
                                          ? `Extras Breakdown for ${dayItem.dateStr} (${dayItem.trips.length} Tours)`
                                          : `Trip Details for ${dayItem.dateStr} (${dayItem.trips.length} Logged Excursions)`}
                                      </span>
                                    </span>

                                    {onSelectTripDate && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSelectTripDate(dayItem.dateStr);
                                          showNotification(`Selected ${dayItem.dateStr} in main workstation`);
                                        }}
                                        className="text-[#00e6a8] hover:text-white bg-[#0a1e28] hover:bg-[#123648] border border-[#1a4a5f] px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                      >
                                        <span>Open in Workstation</span>
                                        <ArrowUpRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Individual Trip Rows */}
                                  <div className="space-y-2">
                                    {dayItem.trips.map((trip, tIdx) => (
                                      <div
                                        key={trip.id || tIdx}
                                        className="bg-[#06141c] border border-[#112a38] hover:border-[#1d475d] p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                          <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-bold text-[10px]">
                                            {trip.time || '10:31'}
                                          </span>

                                          <span className="text-white font-bold">
                                            Guide: <strong className="text-emerald-300 uppercase">{trip.guide || 'Direct / H1'}</strong>
                                          </span>

                                          <span className="text-zinc-400">
                                            Driver: <strong className="text-cyan-300 uppercase">{trip.driver || 'AGM'}</strong>
                                          </span>

                                          <span className="text-zinc-400">
                                            Type: <strong className="text-zinc-300">{trip.van_type || 'Big van'}</strong>
                                          </span>

                                          <span className="text-zinc-400">
                                            Company: <strong className="text-white">{trip.company || 'AGM'}</strong>
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-zinc-300">
                                            Pax: <strong className="text-white">{trip.paxCount}</strong>
                                          </span>

                                          {/* In ONLY QUADS or ALL FLEET mode: show Quads & Quads Extra */}
                                          {(fleetFilter === 'all' || fleetFilter === 'quads') && trip.quadsCount > 0 && (
                                            <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
                                              {trip.quadsCount} Quads
                                            </span>
                                          )}

                                          {/* In ONLY CAMELS or ALL FLEET mode: show Camels & Camels Extra */}
                                          {(fleetFilter === 'all' || fleetFilter === 'camels') && trip.camelsCount > 0 && (
                                            <span className="bg-yellow-950 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded font-bold">
                                              {trip.camelsCount} Camels
                                            </span>
                                          )}

                                          {/* Quads Extras details */}
                                          {(fleetFilter === 'all' || fleetFilter === 'quads' || (fleetFilter === 'extras' && (extrasSubCategory === 'all' || extrasSubCategory === 'quads'))) && trip.qExtraCount > 0 && (
                                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold text-[10px]">
                                              Extra Q: {trip.quad_extra} (+{trip.qExtraPay} DH)
                                            </span>
                                          )}

                                          {/* Camels Extras details */}
                                          {(fleetFilter === 'all' || fleetFilter === 'camels' || (fleetFilter === 'extras' && (extrasSubCategory === 'all' || extrasSubCategory === 'camels'))) && trip.cExtraCount > 0 && (
                                            <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded font-bold text-[10px]">
                                              Extra C: {trip.camel_extra} (+{trip.cExtraPay} DH)
                                            </span>
                                          )}

                                          {/* Person Extras details */}
                                          {(fleetFilter === 'all' || (fleetFilter === 'extras' && (extrasSubCategory === 'all' || extrasSubCategory === 'person'))) && trip.pExtraCount > 0 && (
                                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold text-[10px]">
                                              Extra Pax: {trip.person_extra} (+{trip.pExtraPay} DH)
                                            </span>
                                          )}

                                          {/* In extras mode: display total trip extra revenue */}
                                          {fleetFilter === 'extras' && (
                                            extrasSubCategory === 'all' ? (
                                              trip.totalExtraPay > 0 && (
                                                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-black text-[10px]">
                                                  +{trip.totalExtraPay} DH Extra Pay
                                                </span>
                                              )
                                            ) : extrasSubCategory === 'quads' ? (
                                              trip.qExtraPay > 0 && (
                                                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-black text-[10px]">
                                                  +{trip.qExtraPay} DH Q Extra
                                                </span>
                                              )
                                            ) : extrasSubCategory === 'camels' ? (
                                              trip.cExtraPay > 0 && (
                                                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-black text-[10px]">
                                                  +{trip.cExtraPay} DH C Extra
                                                </span>
                                              )
                                            ) : (
                                              trip.pExtraPay > 0 && (
                                                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-black text-[10px]">
                                                  +{trip.pExtraPay} DH Pax Extra
                                                </span>
                                              )
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ))}
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
              </div>
            );
          })}
        </div>

      </main>

    </div>
  );
};
