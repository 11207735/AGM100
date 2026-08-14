import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  CalendarDays,
  Search,
  ArrowLeft,
  X,
  Check,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Compass,
  Bus,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Lock,
  Building2,
  Clock,
  Eye,
  RotateCcw,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { ResultItem, StaffProfile } from './StaffProfilesView';
import { RegisteredGuide, RegisteredDriver } from './IdManagerView';
import { ManagerData } from './AutoPyneIntro';
import { PaymentRates, DEFAULT_PAYMENT_RATES } from './PaymentsDetailsModal';
import {
  SettledPaymentRecord,
  getStoredSettledPayments,
  saveSettledPaymentRecord,
  removeSettledPaymentRecord,
  verifyManagerPassword
} from '../utils/paymentSettlements';
import { resolveGuide, resolveDriver } from '../utils/staffResolver';

export type AccountCategory = 'all' | 'guides' | 'drivers' | 'companies' | 'avances' | 'settlements';

export interface AccountsViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  results: ResultItem[];
  staffProfiles: StaffProfile[];
  registeredGuides?: RegisteredGuide[];
  registeredDrivers?: RegisteredDriver[];
  managersList?: ManagerData[];
  paymentRates?: PaymentRates;
  currentManager?: ManagerData;
  showNotification: (msg: string) => void;
  onSelectTripDate?: (date: string) => void;
  initialCategory?: AccountCategory;
  embeddedMode?: boolean;
  externalYear?: string;
  onYearChange?: (year: string) => void;
  externalMonthNum?: number;
  onMonthChange?: (month: number) => void;
  externalSearchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const MONTH_NAMES = [
  'All Months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const AccountsView: React.FC<AccountsViewProps> = ({
  isOpen = true,
  onClose,
  results = [],
  staffProfiles = [],
  registeredGuides = [],
  registeredDrivers = [],
  managersList = [],
  paymentRates = DEFAULT_PAYMENT_RATES,
  currentManager,
  showNotification,
  onSelectTripDate,
  initialCategory = 'all',
  embeddedMode = false,
  externalYear,
  onYearChange,
  externalMonthNum,
  onMonthChange,
  externalSearchQuery,
  onSearchChange
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<AccountCategory>(initialCategory);

  useEffect(() => {
    if (initialCategory) {
      setActiveTab(initialCategory);
    }
  }, [initialCategory]);

  // Timeframe filter states (controlled or local)
  const [internalYear, setInternalYear] = useState<string>('2026');
  const [internalMonthNum, setInternalMonthNum] = useState<number>(0); // 0 = All Months
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');

  const selectedYear = externalYear !== undefined ? externalYear : internalYear;
  const setSelectedYear = (yr: string) => {
    if (onYearChange) onYearChange(yr);
    else setInternalYear(yr);
  };

  const selectedMonthNum = externalMonthNum !== undefined ? externalMonthNum : internalMonthNum;
  const setSelectedMonthNum = (m: number) => {
    if (onMonthChange) onMonthChange(m);
    else setInternalMonthNum(m);
  };

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (q: string) => {
    if (onSearchChange) onSearchChange(q);
    else setInternalSearchQuery(q);
  };

  // Settlements category and driver van sub-filters
  const [settlementSubFilter, setSettlementSubFilter] = useState<'all' | 'guides' | 'drivers' | 'companies'>('all');
  const [settlementDriverVanType, setSettlementDriverVanType] = useState<'all' | 'big' | 'mini'>('all');

  // Settlements storage state
  const [settledRecords, setSettledRecords] = useState<Record<string, SettledPaymentRecord>>(() => getStoredSettledPayments());

  // Password confirmation modal state for "Payed"
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    entityType: 'guide' | 'driver' | 'employee' | 'company';
    entityId: string;
    entityName: string;
    subRole?: string;
    periodType: 'month' | 'day';
    periodKey: string;
    periodLabel: string;
    amountDH: number;
    daysCount: number;
    tripsCount: number;
    paxCount: number;
    bigVansCount?: number;
    miniVansCount?: number;
    detailsNote?: string;
  } | null>(null);

  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Direct Payout'>('Cash');
  const [settlementNotes, setSettlementNotes] = useState<string>('');

  // Voucher Receipt Modal state
  const [viewVoucherRecord, setViewVoucherRecord] = useState<SettledPaymentRecord | null>(null);

  // Sync settlements
  const refreshSettlements = () => {
    setSettledRecords(getStoredSettledPayments());
  };

  // Real-time synchronization across views when settlements are updated
  useEffect(() => {
    const handleSettlementUpdate = () => {
      refreshSettlements();
    };
    window.addEventListener('agm_settlements_updated', handleSettlementUpdate);
    return () => {
      window.removeEventListener('agm_settlements_updated', handleSettlementUpdate);
    };
  }, []);

  // Extract years from results
  const recordedYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2026');
    results.forEach(r => {
      if (!r.date) return;
      const parts = r.date.split(/[-/]/);
      if (parts.length === 3) {
        const y = parts[0].length === 4 ? parts[0] : parts[2].length === 4 ? parts[2] : null;
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [results]);

  // Comprehensive analytics for settlements
  const settlementsAnalytics = useMemo(() => {
    const allRecords = (Object.values(settledRecords) as SettledPaymentRecord[]);

    // Filter by year & month if applicable
    const periodRecords = allRecords.filter(rec => {
      // Filter by year
      if (selectedYear && selectedYear !== 'ALL') {
        const yearInKey = rec.periodKey ? rec.periodKey.includes(selectedYear) : false;
        const yearInPaidAt = rec.paidAt ? rec.paidAt.includes(selectedYear) : false;
        if (!yearInKey && !yearInPaidAt) return false;
      }
      // Filter by month
      if (selectedMonthNum > 0) {
        const mStr = String(selectedMonthNum).padStart(2, '0');
        const hasMonthInKey = rec.periodKey ? (
          rec.periodKey.includes(`${mStr}-${selectedYear}`) ||
          rec.periodKey.includes(`-${mStr}-`) ||
          rec.periodKey.includes(`${mStr}-`)
        ) : false;
        const hasMonthInPaidAt = rec.paidAt ? rec.paidAt.includes(`-${mStr}-`) : false;
        if (!hasMonthInKey && !hasMonthInPaidAt && rec.periodKey && !rec.periodKey.startsWith('year-')) {
          return false;
        }
      }
      return true;
    });

    let totalSettledDH = 0;
    let guidesSettledDH = 0;
    let guidesCount = 0;
    let guidesDays = 0;

    let driversSettledDH = 0;
    let driversCount = 0;
    let bigDriversSettledDH = 0;
    let bigDriversCount = 0;
    let miniDriversSettledDH = 0;
    let miniDriversCount = 0;

    let companiesSettledDH = 0;
    let companiesCount = 0;
    let totalBigVans = 0;
    let totalMiniVans = 0;

    periodRecords.forEach(rec => {
      const amt = rec.amountDH || 0;
      totalSettledDH += amt;

      if (rec.entityType === 'guide') {
        guidesSettledDH += amt;
        guidesCount++;
        guidesDays += (rec.daysCount || 0);
      } else if (rec.entityType === 'driver') {
        driversSettledDH += amt;
        driversCount++;
        const isBig = rec.subRole?.toLowerCase().includes('big') || (rec.notes && rec.notes.toLowerCase().includes('big')) || false;
        if (isBig) {
          bigDriversSettledDH += amt;
          bigDriversCount++;
        } else {
          miniDriversSettledDH += amt;
          miniDriversCount++;
        }
      } else if (rec.entityType === 'company') {
        companiesSettledDH += amt;
        companiesCount++;
        totalBigVans += (rec.bigVansCount || 0);
        totalMiniVans += (rec.miniVansCount || 0);
      }
    });

    return {
      records: periodRecords,
      totalSettledDH,
      totalCount: periodRecords.length,
      guides: {
        records: periodRecords.filter(r => r.entityType === 'guide'),
        totalDH: guidesSettledDH,
        count: guidesCount,
        days: guidesDays
      },
      drivers: {
        records: periodRecords.filter(r => r.entityType === 'driver'),
        totalDH: driversSettledDH,
        count: driversCount,
        bigDriversDH: bigDriversSettledDH,
        bigDriversCount,
        miniDriversDH: miniDriversSettledDH,
        miniDriversCount
      },
      companies: {
        records: periodRecords.filter(r => r.entityType === 'company'),
        totalDH: companiesSettledDH,
        count: companiesCount,
        totalBigVans,
        totalMiniVans
      }
    };
  }, [settledRecords, selectedYear, selectedMonthNum]);

  // Process data for all categories
  const accountsData = useMemo(() => {
    // Helper to check if date matches filter
    const dateMatchesFilter = (dateStr: string) => {
      if (!dateStr) return false;
      const parts = dateStr.split(/[-/]/);
      if (parts.length !== 3) return false;

      let y = '';
      let m = 0;
      if (parts[0].length === 4) {
        y = parts[0];
        m = parseInt(parts[1], 10);
      } else if (parts[2].length === 4) {
        y = parts[2];
        m = parseInt(parts[1], 10);
      }

      if (selectedYear !== 'ALL' && y !== selectedYear) return false;
      if (selectedMonthNum !== 0 && m !== selectedMonthNum) return false;
      return true;
    };

    // Filter results according to timeframe
    const filteredTrips = results.filter(r => dateMatchesFilter(r.date));

    // 1. Guides Ledger
    const guidesMap: Record<string, {
      id: string;
      guideId?: string;
      name: string;
      nickname?: string;
      role: 'guide';
      daysSet: Set<string>;
      tripsCount: number;
      paxCount: number;
      quadsCount: number;
      camelsCount: number;
      ratePerDay: number;
      totalEarningsDH: number;
      monthsDetail: Record<string, { daysSet: Set<string>; tripsCount: number; pax: number }>;
    }> = {};

    // 2. Drivers Ledger
    const driversMap: Record<string, {
      id: string;
      driverId?: string;
      name: string;
      role: 'big_driver' | 'mini_driver';
      vanType: 'Big van' | 'Mini van';
      companyName: string;
      daysSet: Set<string>;
      tripsCount: number;
      paxCount: number;
      ratePerDay: number;
      totalEarningsDH: number;
      monthsDetail: Record<string, { daysSet: Set<string>; tripsCount: number; pax: number }>;
    }> = {};

    // 3. Transport Companies Ledger
    const companiesMap: Record<string, {
      id: string;
      name: string;
      driversSet: Set<string>;
      bigVansTripsCount: number;
      miniVansTripsCount: number;
      totalTransports: number;
      daysSet: Set<string>;
      paxCount: number;
      bigRate: number;
      miniRate: number;
      totalBillingDH: number;
      monthsDetail: Record<string, { daysSet: Set<string>; bigVans: number; miniVans: number; pax: number }>;
    }> = {};

    // Seed default companies
    ['AGM', 'TransTours Atlas', 'Sahara Express', 'Marrakech Trans'].forEach(cName => {
      companiesMap[cName.toUpperCase()] = {
        id: `comp_${cName.toLowerCase().replace(/\s+/g, '_')}`,
        name: cName,
        driversSet: new Set(),
        bigVansTripsCount: 0,
        miniVansTripsCount: 0,
        totalTransports: 0,
        daysSet: new Set(),
        paxCount: 0,
        bigRate: paymentRates?.bigVanDriverDailyRate || 500,
        miniRate: paymentRates?.miniVanDriverDailyRate || 350,
        totalBillingDH: 0,
        monthsDetail: {}
      };
    });

    // Populate from filtered trips
    filteredTrips.forEach(trip => {
      const pax = parseInt(trip.pax) || 0;
      const quads = parseInt(trip.quads) || 0;
      const camels = parseInt(trip.camels) || 0;
      const dateKey = trip.date;

      // Extract monthKey e.g. "08-2026"
      const dateParts = (trip.date || '').split(/[-/]/);
      let monthKey = 'all';
      if (dateParts.length === 3) {
        const y = dateParts[0].length === 4 ? dateParts[0] : dateParts[2];
        const m = String(parseInt(dateParts[1], 10)).padStart(2, '0');
        monthKey = `${m}-${y}`;
      }

      // Guide Processing
      const resolvedG = resolveGuide(trip.guide, registeredGuides as any, []);
      if (resolvedG) {
        const gName = resolvedG.canonicalName;
        const gKey = gName.toUpperCase();
        if (!guidesMap[gKey]) {
          guidesMap[gKey] = {
            id: resolvedG.profileKey,
            guideId: resolvedG.guideId,
            name: gName,
            nickname: resolvedG.nickname,
            role: 'guide',
            daysSet: new Set(),
            tripsCount: 0,
            paxCount: 0,
            quadsCount: 0,
            camelsCount: 0,
            ratePerDay: paymentRates?.guideDailyRate || 500,
            totalEarningsDH: 0,
            monthsDetail: {}
          };
        }
        const gProf = guidesMap[gKey];
        if (resolvedG.guideId && !gProf.guideId) gProf.guideId = resolvedG.guideId;
        if (resolvedG.nickname && !gProf.nickname) gProf.nickname = resolvedG.nickname;
        gProf.daysSet.add(dateKey);
        gProf.tripsCount += 1;
        gProf.paxCount += pax;
        gProf.quadsCount += quads;
        gProf.camelsCount += camels;

        if (!gProf.monthsDetail[monthKey]) {
          gProf.monthsDetail[monthKey] = { daysSet: new Set(), tripsCount: 0, pax: 0 };
        }
        gProf.monthsDetail[monthKey].daysSet.add(dateKey);
        gProf.monthsDetail[monthKey].tripsCount += 1;
        gProf.monthsDetail[monthKey].pax += pax;
      }

      // Multi-Driver & Company Processing
      const dList = (trip.driversList && trip.driversList.length > 0)
        ? trip.driversList
        : [{ driver: trip.driver, van_type: (trip.van_type as any) || 'Big van', company: trip.company || 'AGM', pax: trip.pax }];

      dList.forEach(drv => {
        const resolvedD = resolveDriver(drv.driver, drv.van_type, drv.company, registeredDrivers as any, []);
        if (resolvedD) {
          const dName = resolvedD.canonicalName;
          const dKey = dName.toUpperCase();
          const role = resolvedD.role;
          const vType = resolvedD.vanType;
          const cName = (drv.company || resolvedD.companyName || 'AGM').trim();
          const rate = vType === 'Mini van' ? (paymentRates?.miniVanDriverDailyRate || 350) : (paymentRates?.bigVanDriverDailyRate || 500);
          const drvPax = parseInt(drv.pax || '') || pax;

          if (!driversMap[dKey]) {
            driversMap[dKey] = {
              id: resolvedD.profileKey,
              driverId: resolvedD.driverId,
              name: dName,
              role,
              vanType: vType,
              companyName: cName,
              daysSet: new Set(),
              tripsCount: 0,
              paxCount: 0,
              ratePerDay: rate,
              totalEarningsDH: 0,
              monthsDetail: {}
            };
          }
          const dProf = driversMap[dKey];
          if (resolvedD.driverId && !dProf.driverId) dProf.driverId = resolvedD.driverId;
          dProf.daysSet.add(dateKey);
          dProf.tripsCount += 1;
          dProf.paxCount += drvPax;

          if (!dProf.monthsDetail[monthKey]) {
            dProf.monthsDetail[monthKey] = { daysSet: new Set(), tripsCount: 0, pax: 0 };
          }
          dProf.monthsDetail[monthKey].daysSet.add(dateKey);
          dProf.monthsDetail[monthKey].tripsCount += 1;
          dProf.monthsDetail[monthKey].pax += drvPax;

          // Company Tracking
          if (cName) {
            const cKey = cName.toUpperCase();
            if (!companiesMap[cKey]) {
              companiesMap[cKey] = {
                id: `comp_${cKey.toLowerCase().replace(/\s+/g, '_')}`,
                name: cName,
                driversSet: new Set(),
                bigVansTripsCount: 0,
                miniVansTripsCount: 0,
                totalTransports: 0,
                daysSet: new Set(),
                paxCount: 0,
                bigRate: paymentRates?.bigVanDriverDailyRate || 500,
                miniRate: paymentRates?.miniVanDriverDailyRate || 350,
                totalBillingDH: 0,
                monthsDetail: {}
              };
            }
            companiesMap[cKey].driversSet.add(dName);
            companiesMap[cKey].daysSet.add(dateKey);
            companiesMap[cKey].totalTransports += 1;
            companiesMap[cKey].paxCount += drvPax;

            if (vType === 'Mini van') {
              companiesMap[cKey].miniVansTripsCount += 1;
            } else {
              companiesMap[cKey].bigVansTripsCount += 1;
            }

            if (!companiesMap[cKey].monthsDetail[monthKey]) {
              companiesMap[cKey].monthsDetail[monthKey] = { daysSet: new Set(), bigVans: 0, miniVans: 0, pax: 0 };
            }
            companiesMap[cKey].monthsDetail[monthKey].daysSet.add(dateKey);
            companiesMap[cKey].monthsDetail[monthKey].pax += drvPax;
            if (vType === 'Mini van') {
              companiesMap[cKey].monthsDetail[monthKey].miniVans += 1;
            } else {
              companiesMap[cKey].monthsDetail[monthKey].bigVans += 1;
            }
          }
        }
      });
    });

    // Calculate money totals
    Object.values(guidesMap).forEach(g => {
      g.totalEarningsDH = g.daysSet.size * g.ratePerDay;
    });

    Object.values(driversMap).forEach(d => {
      d.totalEarningsDH = d.daysSet.size * d.ratePerDay;
    });

    Object.values(companiesMap).forEach(c => {
      c.totalBillingDH = (c.bigVansTripsCount * c.bigRate) + (c.miniVansTripsCount * c.miniRate);
    });

    const guidesList = Object.values(guidesMap).sort((a, b) => b.totalEarningsDH - a.totalEarningsDH);
    const driversList = Object.values(driversMap).sort((a, b) => b.totalEarningsDH - a.totalEarningsDH);
    const companiesList = Object.values(companiesMap).filter(c => c.totalTransports > 0 || c.name === 'AGM').sort((a, b) => b.totalBillingDH - a.totalBillingDH);

    // Totals
    const totalGuideEarnings = guidesList.reduce((sum, g) => sum + g.totalEarningsDH, 0);
    const totalDriverEarnings = driversList.reduce((sum, d) => sum + d.totalEarningsDH, 0);
    const totalCompanyBilling = companiesList.reduce((sum, c) => sum + c.totalBillingDH, 0);
    const totalStaffDays = guidesList.reduce((sum, g) => sum + g.daysSet.size, 0) + driversList.reduce((sum, d) => sum + d.daysSet.size, 0);

    return {
      filteredTripsCount: filteredTrips.length,
      guidesList,
      driversList,
      companiesList,
      totalGuideEarnings,
      totalDriverEarnings,
      totalCompanyBilling,
      totalStaffDays
    };
  }, [results, registeredGuides, registeredDrivers, selectedYear, selectedMonthNum, paymentRates]);

  // Check if a period is settled
  const getSettlement = (entityType: string, entityName: string, periodKey: string): SettledPaymentRecord | null => {
    const id = `${entityType}_${entityName.toLowerCase().replace(/\s+/g, '_')}_${periodKey}`;
    return settledRecords[id] || null;
  };

  // Open "Payed" verification dialog
  const handleInitiatePayment = (target: {
    id: string;
    entityType: 'guide' | 'driver' | 'employee' | 'company';
    entityId: string;
    entityName: string;
    periodType: 'month' | 'day';
    periodKey: string;
    periodLabel: string;
    amountDH: number;
    daysCount: number;
    tripsCount: number;
    paxCount: number;
    detailsNote?: string;
  }) => {
    setPaymentTarget(target);
    setPasswordInput('');
    setPasswordError(null);
    setSelectedPaymentMethod('Cash');
    setSettlementNotes('');
  };

  // Confirm password and save settled payment
  const handleConfirmPasswordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;

    if (!verifyManagerPassword(passwordInput, managersList)) {
      setPasswordError('Invalid manager password! Accepted: agm, agmtravelagm, 1234, admin, ismail');
      return;
    }

    const currentMgrName = currentManager ? `${currentManager.name} ${currentManager.lastname}` : 'Manager Abdelilah';
    const settlementRecord: SettledPaymentRecord = {
      id: paymentTarget.id,
      entityType: paymentTarget.entityType,
      entityId: paymentTarget.entityId,
      entityName: paymentTarget.entityName,
      periodType: paymentTarget.periodType,
      periodKey: paymentTarget.periodKey,
      amountDH: paymentTarget.amountDH,
      daysCount: paymentTarget.daysCount,
      tripsCount: paymentTarget.tripsCount,
      isPaid: true,
      paidAt: new Date().toISOString(),
      paidByManager: currentMgrName,
      paymentMethod: selectedPaymentMethod,
      notes: settlementNotes || paymentTarget.detailsNote || `Official payout confirmed by ${currentMgrName}`
    };

    saveSettledPaymentRecord(settlementRecord);
    refreshSettlements();
    setPaymentTarget(null);
    showNotification(`💰 Payment of ${paymentTarget.amountDH.toLocaleString()} DH confirmed & settled for ${paymentTarget.entityName}!`);
  };

  // Revoke settlement
  const handleRevokePayment = (recordId: string, entityName: string) => {
    if (window.confirm(`Revoke paid settlement status for ${entityName}?`)) {
      removeSettledPaymentRecord(recordId);
      refreshSettlements();
      showNotification(`↩ Payment settlement revoked for ${entityName}`);
    }
  };

  // Current period key for active filter
  const currentFilterPeriodKey = useMemo(() => {
    if (selectedMonthNum > 0) {
      return `${String(selectedMonthNum).padStart(2, '0')}-${selectedYear}`;
    }
    return `year-${selectedYear}`;
  }, [selectedMonthNum, selectedYear]);

  const currentFilterPeriodLabel = useMemo(() => {
    if (selectedMonthNum > 0) {
      return `${MONTH_NAMES[selectedMonthNum]} ${selectedYear}`;
    }
    return `Full Year ${selectedYear}`;
  }, [selectedMonthNum, selectedYear]);

  if (!isOpen) return null;

  return (
    <div className={`${embeddedMode ? 'w-full h-full flex flex-col' : 'fixed inset-0 z-50 bg-[#03090d] text-white flex flex-col overflow-hidden animate-fadeIn'}`}>
      
      {/* Top Header if in Standalone mode */}
      {!embeddedMode && (
        <header className="w-full bg-[#07131a]/95 border-b border-[#142e3b] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 z-20 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c896]/20 border border-[#00c896]/50 text-[#00e6a8] flex items-center justify-center shadow-lg font-black">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Staff &amp; Accounts Ledger</span>
                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                  {accountsData.filteredTripsCount} Tours
                </span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Comprehensive money payments, daily work records, and password-secured settlements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#0b1d26] hover:bg-[#00c896] text-zinc-200 hover:text-zinc-950 border border-[#193e4f] hover:border-[#00c896] transition-all cursor-pointer text-xs font-mono font-bold flex items-center gap-2 shadow-sm group"
              >
                <ArrowLeft className="w-4 h-4 text-[#00e6a8] group-hover:text-zinc-950 transition-all" />
                <span>Return Back</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main Filter & Category Controller Bar */}
      <div className="bg-[#06141c] border-b border-[#132c38] px-4 sm:px-6 lg:px-8 py-3 shrink-0">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Left: Category Sub-tabs */}
          <div className="flex items-center gap-1.5 flex-wrap max-w-full font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#00c896] text-zinc-950 font-black shadow-[0_0_12px_rgba(0,200,150,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>All Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guides')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'guides'
                  ? 'bg-emerald-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tour Guides ({accountsData.guidesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('drivers')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'drivers'
                  ? 'bg-cyan-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Van Drivers ({accountsData.driversList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'companies'
                  ? 'bg-purple-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(192,132,252,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
              }`}
            >
              <Bus className="w-3.5 h-3.5 text-purple-400" />
              <span>Transport Companies ({accountsData.companiesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settlements')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'settlements'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'text-teal-300 hover:text-white hover:bg-[#0b1f29]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-teal-400" />
              <span>Paid &amp; Settlements ({Object.values(settledRecords).length})</span>
            </button>
          </div>

          {/* Right: Year, Month, and Search Timeframe Filters (or Active Indicator in Embedded Mode) */}
          <div className="flex items-center gap-2.5 flex-wrap ml-auto font-mono text-xs">
            {embeddedMode ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#091b24] border border-[#163949] rounded-xl px-3 py-1 text-zinc-300 shadow-inner">
                  <Calendar className="w-3.5 h-3.5 text-[#00c896] mr-1.5" />
                  <span className="text-[10px] text-zinc-400 uppercase mr-1.5 font-bold">Active Filter:</span>
                  <span className="text-white font-bold">{currentFilterPeriodLabel}</span>
                </div>
                {searchQuery && (
                  <div className="flex items-center bg-teal-950/80 border border-teal-700/60 rounded-xl px-2.5 py-1 text-teal-300 text-[11px] font-bold">
                    <Search className="w-3 h-3 text-teal-400 mr-1" />
                    <span>&quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-teal-400 hover:text-white ml-1.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Year Selector */}
                <div className="flex items-center bg-[#091b24] border border-[#163949] rounded-xl px-2.5 py-1 text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-[#00c896] mr-1.5" />
                  <span className="text-[10px] text-zinc-400 uppercase mr-1">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer"
                  >
                    {recordedYears.map(yr => (
                      <option key={yr} value={yr} className="bg-[#071720] text-white">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                <div className="flex items-center bg-[#091b24] border border-[#163949] rounded-xl px-2.5 py-1 text-zinc-300">
                  <CalendarDays className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
                  <span className="text-[10px] text-zinc-400 uppercase mr-1">Month:</span>
                  <select
                    value={selectedMonthNum}
                    onChange={(e) => setSelectedMonthNum(parseInt(e.target.value, 10))}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={idx} value={idx} className="bg-[#071720] text-white">
                        {idx === 0 ? 'All Months (Full Year)' : `M${idx} - ${mName}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff / partner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#091b24] border border-[#163949] rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00e6a8]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Financial Overview Strip */}
      <div className="bg-[#051117] border-b border-[#112936] px-4 sm:px-6 lg:px-8 py-3 shrink-0">
        <div className="w-full max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          
          <div className="bg-[#081b24] border border-[#143949] p-3 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Guides Payout</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {accountsData.totalGuideEarnings.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
              </span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                {accountsData.guidesList.length} Active Guides &bull; {paymentRates?.guideDailyRate || 500} DH/day
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#081b24] border border-[#143949] p-3 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Drivers Payout</span>
              <span className="text-base sm:text-lg font-black text-cyan-400">
                {accountsData.totalDriverEarnings.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
              </span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                {accountsData.driversList.length} Active Drivers
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#081b24] border border-[#143949] p-3 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Company Transports Billing</span>
              <span className="text-base sm:text-lg font-black text-purple-400">
                {accountsData.totalCompanyBilling.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
              </span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                {accountsData.companiesList.length} Partner Fleets
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Bus className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#081b24] border border-[#143949] p-3 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Days Executed</span>
              <span className="text-base sm:text-lg font-black text-[#00e6a8]">
                {accountsData.totalStaffDays} <span className="text-xs font-mono font-bold">Days</span>
              </span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                Period: {currentFilterPeriodLabel}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 border border-[#00c896]/30 text-[#00e6a8] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

        </div>
      </div>

      {/* Main Ledger Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="w-full max-w-[1920px] mx-auto space-y-6 font-mono">
          
          {/* SECTION 1: GUIDES LEDGER TABLE */}
          {(activeTab === 'all' || activeTab === 'guides') && (
            <div className="bg-[#081721] border border-[#143444] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#122c3b] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Tour Guides Accounts &amp; Settlements
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Daily rate: <strong className="text-emerald-400">{paymentRates?.guideDailyRate || 500} DH / Day</strong> &bull; Period: {currentFilterPeriodLabel}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-xl font-bold">
                  {accountsData.guidesList.length} Guides Logged
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#051117] text-zinc-400 uppercase text-[10px] border-b border-[#143444]">
                    <tr>
                      <th className="py-3 px-4">Guide Name</th>
                      <th className="py-3 px-4 text-center">Days Worked</th>
                      <th className="py-3 px-4 text-center">Tours Count</th>
                      <th className="py-3 px-4 text-center">Pax Handled</th>
                      <th className="py-3 px-4 text-center">Daily Rate</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Settlement Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102936]">
                    {accountsData.guidesList
                      .filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((guide) => {
                        const settlementId = `guide_${guide.name.toLowerCase().replace(/\s+/g, '_')}_${currentFilterPeriodKey}`;
                        const settlement = settledRecords[settlementId] || null;
                        const isPaid = !!settlement;

                        return (
                          <tr key={guide.id} className="hover:bg-[#0c222e] transition-colors">
                            <td className="py-3 px-4 font-bold text-white uppercase">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs shrink-0">
                                  {guide.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span>{guide.name}</span>
                                    {guide.guideId && (
                                      <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 px-1.5 py-0.5 rounded font-black tracking-wider">
                                        #{guide.guideId}
                                      </span>
                                    )}
                                  </div>
                                  {guide.nickname && <span className="text-[10px] text-zinc-400 font-normal lowercase tracking-normal">"{guide.nickname}"</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-[#05141c] border border-emerald-600/40 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                                {guide.daysSet.size} Days
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-zinc-300">{guide.tripsCount}</td>
                            <td className="py-3 px-4 text-center text-zinc-300">{guide.paxCount} Pax</td>
                            <td className="py-3 px-4 text-center text-zinc-400 font-mono">{guide.ratePerDay} DH</td>
                            <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                              {guide.totalEarningsDH.toLocaleString()} DH
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPaid ? (
                                <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>PAID ✓</span>
                                </span>
                              ) : (
                                <span className="bg-amber-950/60 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                                  Pending Payout
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isPaid ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewVoucherRecord(settlement)}
                                    className="px-2.5 py-1 rounded-lg bg-[#09222c] hover:bg-[#113847] text-teal-300 border border-teal-600/50 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                                    title="View Payment Voucher Receipt"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Voucher</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokePayment(settlement.id, guide.name)}
                                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                                    title="Revoke Payment"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleInitiatePayment({
                                    id: settlementId,
                                    entityType: 'guide',
                                    entityId: guide.id,
                                    entityName: guide.name,
                                    periodType: selectedMonthNum > 0 ? 'month' : 'day',
                                    periodKey: currentFilterPeriodKey,
                                    periodLabel: currentFilterPeriodLabel,
                                    amountDH: guide.totalEarningsDH,
                                    daysCount: guide.daysSet.size,
                                    tripsCount: guide.tripsCount,
                                    paxCount: guide.paxCount,
                                    detailsNote: `${guide.daysSet.size} days worked in ${currentFilterPeriodLabel} @ ${guide.ratePerDay} DH/day`
                                  })}
                                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#00c896] to-emerald-400 hover:from-[#00e6a8] hover:to-emerald-300 text-zinc-950 font-black text-xs transition-all cursor-pointer shadow-md active:scale-95 inline-flex items-center gap-1.5"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>Payed (Confirm)</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 2: DRIVERS LEDGER TABLE */}
          {(activeTab === 'all' || activeTab === 'drivers') && (
            <div className="bg-[#081721] border border-[#143444] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#122c3b] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Van Drivers Accounts &amp; Settlements
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Big Van: <strong className="text-cyan-400">{paymentRates?.bigVanDriverDailyRate || 500} DH</strong> &bull; Mini Van: <strong className="text-purple-400">{paymentRates?.miniVanDriverDailyRate || 350} DH</strong>
                    </p>
                  </div>
                </div>

                <span className="text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-700/60 px-3 py-1 rounded-xl font-bold">
                  {accountsData.driversList.length} Drivers Logged
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#051117] text-zinc-400 uppercase text-[10px] border-b border-[#143444]">
                    <tr>
                      <th className="py-3 px-4">Driver Name</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Vehicle Type</th>
                      <th className="py-3 px-4 text-center">Days Worked</th>
                      <th className="py-3 px-4 text-center">Tours Count</th>
                      <th className="py-3 px-4 text-center">Daily Tariff</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Settlement Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102936]">
                    {accountsData.driversList
                      .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((driver) => {
                        const settlementId = `driver_${driver.name.toLowerCase().replace(/\s+/g, '_')}_${currentFilterPeriodKey}`;
                        const settlement = settledRecords[settlementId] || null;
                        const isPaid = !!settlement;

                        return (
                          <tr key={driver.id} className="hover:bg-[#0c222e] transition-colors">
                            <td className="py-3 px-4 font-bold text-white uppercase">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-black flex items-center justify-center text-xs shrink-0">
                                  {driver.name.charAt(0)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span>{driver.name}</span>
                                  {driver.driverId && (
                                    <span className="font-mono text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-700/60 px-1.5 py-0.5 rounded font-black tracking-wider">
                                      #{driver.driverId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-purple-300 font-bold">{driver.companyName}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                driver.vanType === 'Mini van' 
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              }`}>
                                {driver.vanType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-[#05141c] border border-cyan-600/40 text-cyan-400 px-2 py-0.5 rounded-md font-bold">
                                {driver.daysSet.size} Days
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-zinc-300">{driver.tripsCount}</td>
                            <td className="py-3 px-4 text-center text-zinc-400">{driver.ratePerDay} DH</td>
                            <td className="py-3 px-4 text-right font-black text-cyan-400 text-sm">
                              {driver.totalEarningsDH.toLocaleString()} DH
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPaid ? (
                                <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>PAID ✓</span>
                                </span>
                              ) : (
                                <span className="bg-amber-950/60 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                                  Pending Payout
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isPaid ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewVoucherRecord(settlement)}
                                    className="px-2.5 py-1 rounded-lg bg-[#09222c] hover:bg-[#113847] text-teal-300 border border-teal-600/50 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Voucher</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokePayment(settlement.id, driver.name)}
                                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleInitiatePayment({
                                    id: settlementId,
                                    entityType: 'driver',
                                    entityId: driver.id,
                                    entityName: driver.name,
                                    periodType: selectedMonthNum > 0 ? 'month' : 'day',
                                    periodKey: currentFilterPeriodKey,
                                    periodLabel: currentFilterPeriodLabel,
                                    amountDH: driver.totalEarningsDH,
                                    daysCount: driver.daysSet.size,
                                    tripsCount: driver.tripsCount,
                                    paxCount: driver.paxCount,
                                    detailsNote: `${driver.daysSet.size} days driven (${driver.vanType}) in ${currentFilterPeriodLabel}`
                                  })}
                                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-zinc-950 font-black text-xs transition-all cursor-pointer shadow-md active:scale-95 inline-flex items-center gap-1.5"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>Payed (Confirm)</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: TRANSPORT COMPANIES LEDGER */}
          {(activeTab === 'all' || activeTab === 'companies') && (
            <div className="bg-[#081721] border border-[#143444] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#122c3b] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Transport Companies Billing &amp; Invoices
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Partner fleet transport billing for Big Vans &amp; Mini Vans &bull; Period: {currentFilterPeriodLabel}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-purple-300 bg-purple-950/80 border border-purple-700/60 px-3 py-1 rounded-xl font-bold">
                  {accountsData.companiesList.length} Fleet Companies
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accountsData.companiesList
                  .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((company) => {
                    const settlementId = `company_${company.name.toLowerCase().replace(/\s+/g, '_')}_${currentFilterPeriodKey}`;
                    const settlement = settledRecords[settlementId] || null;
                    const isPaid = !!settlement;

                    return (
                      <div
                        key={company.id}
                        className="bg-[#06141c] border border-[#163546] hover:border-purple-500/50 rounded-2xl p-5 space-y-4 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-base flex items-center justify-center uppercase">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-white uppercase">{company.name}</h4>
                              <p className="text-xs text-zinc-400">
                                Drivers: <strong className="text-zinc-200">{Array.from(company.driversSet).join(', ') || 'Various Drivers'}</strong>
                              </p>
                            </div>
                          </div>

                          {isPaid ? (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 px-3 py-1 rounded-xl text-xs font-black uppercase inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>SETTLED ✓</span>
                            </span>
                          ) : (
                            <span className="bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2.5 py-1 rounded-xl text-xs font-bold uppercase">
                              Pending Settlement
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-[#030d12] p-3 rounded-xl border border-[#112a38] text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Big Vans</span>
                            <span className="text-white font-bold">{company.bigVansTripsCount} Trips</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Mini Vans</span>
                            <span className="text-white font-bold">{company.miniVansTripsCount} Trips</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Pax</span>
                            <span className="text-purple-300 font-bold">{company.paxCount} Pax</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#122b39]">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase block">Total Billing Invoice</span>
                            <span className="text-lg font-black text-purple-400">
                              {company.totalBillingDH.toLocaleString()} DH
                            </span>
                          </div>

                          {isPaid ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewVoucherRecord(settlement)}
                                className="px-3 py-1.5 rounded-xl bg-[#0a232f] hover:bg-[#11394a] text-teal-300 border border-teal-600/50 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Official Receipt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokePayment(settlement.id, company.name)}
                                className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                                title="Revoke Settlement"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiatePayment({
                                id: settlementId,
                                entityType: 'company',
                                entityId: company.id,
                                entityName: company.name,
                                periodType: selectedMonthNum > 0 ? 'month' : 'day',
                                periodKey: currentFilterPeriodKey,
                                periodLabel: currentFilterPeriodLabel,
                                amountDH: company.totalBillingDH,
                                daysCount: company.daysSet.size,
                                tripsCount: company.totalTransports,
                                paxCount: company.paxCount,
                                detailsNote: `Transport fleet billing for ${company.name}: ${company.bigVansTripsCount} Big Vans + ${company.miniVansTripsCount} Mini Vans (${currentFilterPeriodLabel})`
                              })}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-zinc-950 font-black text-xs transition-all cursor-pointer shadow-lg active:scale-95 inline-flex items-center gap-1.5"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Payed Company (Confirm)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SECTION 4: OFFICIAL PAID & SETTLEMENTS LEDGER */}
          {(activeTab === 'all' || activeTab === 'settlements') && (
            <div className="bg-[#081721] border border-[#143444] rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl font-mono">
              
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#122c3b] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400/20 to-emerald-400/10 border border-teal-500/40 text-teal-400 flex items-center justify-center font-black shadow-md">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Paid &amp; Settlements Ledger</span>
                      <span className="text-[10px] font-mono text-teal-400 bg-teal-950/80 border border-teal-700/60 px-2 py-0.5 rounded-full font-bold">
                        {currentFilterPeriodLabel}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Official verified payouts, historical receipts, breakdown by role &amp; manager authorizations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-teal-300 bg-teal-950/80 border border-teal-700/60 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>{settlementsAnalytics.totalCount} Settled Vouchers</span>
                  </span>
                </div>
              </div>

              {/* 1. TOP AGGREGATE FINANCIAL OVERVIEW FOR SETTLEMENTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* Total Settlements Paid (All) */}
                <div className="bg-[#05131b] border border-[#143949] p-3.5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Settlements Paid</span>
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {settlementsAnalytics.totalSettledDH.toLocaleString()} <span className="text-xs text-teal-400 font-mono font-bold">DH</span>
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                      <span>{settlementsAnalytics.totalCount} Authorized Vouchers</span>
                      <span className="text-teal-400 font-bold">100% Settled</span>
                    </div>
                  </div>
                </div>

                {/* Total Guides Settled Payout */}
                <div className="bg-[#05131b] border border-[#143949] p-3.5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Guides Payout</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight">
                      {settlementsAnalytics.guides.totalDH.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                      <span>{settlementsAnalytics.guides.count} Guides Settled</span>
                      <span className="text-emerald-300 font-bold">{settlementsAnalytics.guides.days} Days Paid</span>
                    </div>
                  </div>
                </div>

                {/* Total Drivers Settled Payout (Big Van / Mini Van) */}
                <div className="bg-[#05131b] border border-[#143949] p-3.5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Drivers Payout</span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black text-cyan-400 tracking-tight">
                      {settlementsAnalytics.drivers.totalDH.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
                    </span>
                    <div className="flex items-center gap-2 text-[10px] mt-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold">
                        Big: {settlementsAnalytics.drivers.bigDriversDH.toLocaleString()} DH ({settlementsAnalytics.drivers.bigDriversCount})
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                        Mini: {settlementsAnalytics.drivers.miniDriversDH.toLocaleString()} DH ({settlementsAnalytics.drivers.miniDriversCount})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Transport Companies Settled Billing */}
                <div className="bg-[#05131b] border border-[#143949] p-3.5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Company Transports Billing</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black text-purple-400 tracking-tight">
                      {settlementsAnalytics.companies.totalDH.toLocaleString()} <span className="text-xs font-mono font-bold">DH</span>
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                      <span>{settlementsAnalytics.companies.count} Fleets Invoiced</span>
                      <span className="text-purple-300 font-bold">
                        {settlementsAnalytics.companies.totalBigVans} Big + {settlementsAnalytics.companies.totalMiniVans} Mini
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. SUB-FILTERS: ALL, GUIDES, DRIVERS (BIG / MINI), COMPANY TRANSPORTS */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#051117] border border-[#143343] p-2.5 rounded-2xl flex-wrap">
                
                {/* Main Category Sub-Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap max-w-full text-xs">
                  <button
                    type="button"
                    onClick={() => setSettlementSubFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                      settlementSubFilter === 'all'
                        ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>All Settlements ({settlementsAnalytics.totalCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementSubFilter('guides')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                      settlementSubFilter === 'guides'
                        ? 'bg-emerald-400 text-zinc-950 font-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tour Guides ({settlementsAnalytics.guides.count})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementSubFilter('drivers')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                      settlementSubFilter === 'drivers'
                        ? 'bg-cyan-400 text-zinc-950 font-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Drivers ({settlementsAnalytics.drivers.count})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementSubFilter('companies')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 whitespace-nowrap ${
                      settlementSubFilter === 'companies'
                        ? 'bg-purple-400 text-zinc-950 font-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-[#0b1f29]'
                    }`}
                  >
                    <Bus className="w-3.5 h-3.5 text-purple-400" />
                    <span>Company Transports ({settlementsAnalytics.companies.count})</span>
                  </button>
                </div>

                {/* Sub-chips for Drivers (Big Van vs Mini Van) when Drivers or All is selected */}
                {(settlementSubFilter === 'drivers' || settlementSubFilter === 'all') && (
                  <div className="flex items-center gap-1 bg-[#081822] border border-[#163848] p-1 rounded-xl text-xs font-mono ml-auto">
                    <span className="text-[10px] text-zinc-400 px-1.5 uppercase font-bold">Van Type:</span>
                    <button
                      type="button"
                      onClick={() => setSettlementDriverVanType('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settlementDriverVanType === 'all'
                          ? 'bg-[#00c896] text-zinc-950 font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      All Vans
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementDriverVanType('big')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settlementDriverVanType === 'big'
                          ? 'bg-blue-500 text-white font-black'
                          : 'text-blue-300 hover:text-white'
                      }`}
                    >
                      Big Van ({settlementsAnalytics.drivers.bigDriversCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementDriverVanType('mini')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settlementDriverVanType === 'mini'
                          ? 'bg-cyan-400 text-zinc-950 font-black'
                          : 'text-cyan-300 hover:text-white'
                      }`}
                    >
                      Mini Van ({settlementsAnalytics.drivers.miniDriversCount})
                    </button>
                  </div>
                )}
              </div>

              {/* 3. DETAILED SETTLEMENTS RECORDS TABLE */}
              {(() => {
                const displayedRecords = settlementsAnalytics.records.filter(rec => {
                  // Category filter
                  if (settlementSubFilter === 'guides' && rec.entityType !== 'guide') return false;
                  if (settlementSubFilter === 'companies' && rec.entityType !== 'company') return false;
                  if (settlementSubFilter === 'drivers') {
                    if (rec.entityType !== 'driver') return false;
                    if (settlementDriverVanType === 'big') {
                      const isBig = rec.subRole?.toLowerCase().includes('big') || (rec.notes && rec.notes.toLowerCase().includes('big')) || false;
                      if (!isBig) return false;
                    }
                    if (settlementDriverVanType === 'mini') {
                      const isBig = rec.subRole?.toLowerCase().includes('big') || (rec.notes && rec.notes.toLowerCase().includes('big')) || false;
                      if (isBig) return false;
                    }
                  }
                  if (settlementSubFilter === 'all' && settlementDriverVanType !== 'all') {
                    if (rec.entityType === 'driver') {
                      const isBig = rec.subRole?.toLowerCase().includes('big') || (rec.notes && rec.notes.toLowerCase().includes('big')) || false;
                      if (settlementDriverVanType === 'big' && !isBig) return false;
                      if (settlementDriverVanType === 'mini' && isBig) return false;
                    }
                  }

                  // Search query filter
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = rec.entityName.toLowerCase().includes(q);
                    const typeMatch = rec.entityType.toLowerCase().includes(q);
                    const subRoleMatch = (rec.subRole || '').toLowerCase().includes(q);
                    const managerMatch = (rec.paidByManager || '').toLowerCase().includes(q);
                    const notesMatch = (rec.notes || '').toLowerCase().includes(q);
                    if (!nameMatch && !typeMatch && !subRoleMatch && !managerMatch && !notesMatch) return false;
                  }
                  return true;
                }).sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));

                if (displayedRecords.length === 0) {
                  return (
                    <div className="text-center py-12 text-zinc-500 space-y-3 font-mono bg-[#051117] border border-[#143343] rounded-2xl p-6">
                      <Wallet className="w-10 h-10 mx-auto text-zinc-600 mb-1" />
                      <p className="text-sm font-bold text-zinc-300">No settled records match the selected filter</p>
                      <p className="text-xs max-w-md mx-auto text-zinc-500">
                        {settlementSubFilter === 'all' 
                          ? `No payouts settled for period ${currentFilterPeriodLabel}. Use the "Payed (Confirm)" buttons on the guides, drivers, or companies tabs to authorize settlements.` 
                          : `No ${settlementSubFilter} payout records found for ${currentFilterPeriodLabel}.`}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto no-scrollbar border border-[#122e3e] rounded-2xl bg-[#051016]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#030c10] text-zinc-400 uppercase text-[10px] border-b border-[#143444] font-mono">
                        <tr>
                          <th className="py-3 px-4">Beneficiary &amp; Recipient</th>
                          <th className="py-3 px-4">Category / Role</th>
                          <th className="py-3 px-4">Settled Period</th>
                          <th className="py-3 px-4 text-center">Service Volume</th>
                          <th className="py-3 px-4 text-right">Amount Paid</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4">Settlement Authorization</th>
                          <th className="py-3 px-4 text-right">Receipt Voucher &amp; Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0f2735]">
                        {displayedRecords.map((rec) => {
                          const isGuide = rec.entityType === 'guide';
                          const isDriver = rec.entityType === 'driver';
                          const isCompany = rec.entityType === 'company';
                          const isBigDriver = isDriver && (rec.subRole?.toLowerCase().includes('big') || (rec.notes && rec.notes.toLowerCase().includes('big')));

                          return (
                            <tr key={rec.id} className="hover:bg-[#0a1e2a]/60 transition-colors">
                              
                              {/* Beneficiary Name */}
                              <td className="py-3.5 px-4 font-bold text-white uppercase">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-xs shadow-sm ${
                                    isGuide 
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                      : isCompany 
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : isBigDriver
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  }`}>
                                    {rec.entityName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-black text-white text-xs">{rec.entityName}</div>
                                    <div className="text-[10px] text-zinc-400 font-mono">ID: {rec.entityId || rec.id}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Category / Role Badge */}
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-1 shadow-sm ${
                                  isGuide
                                    ? 'bg-emerald-950/80 border border-emerald-600/70 text-emerald-300'
                                    : isCompany
                                    ? 'bg-purple-950/80 border border-purple-600/70 text-purple-300'
                                    : isBigDriver
                                    ? 'bg-blue-950/80 border border-blue-600/70 text-blue-300'
                                    : 'bg-cyan-950/80 border border-cyan-600/70 text-cyan-300'
                                }`}>
                                  {isGuide && <Compass className="w-3 h-3 text-emerald-400" />}
                                  {isCompany && <Bus className="w-3 h-3 text-purple-400" />}
                                  {isDriver && <Users className="w-3 h-3 text-cyan-400" />}
                                  <span>{rec.subRole || rec.entityType}</span>
                                </span>
                              </td>

                              {/* Settled Period */}
                              <td className="py-3.5 px-4 text-zinc-300 font-mono text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{rec.periodKey}</span>
                                </div>
                              </td>

                              {/* Service Volume */}
                              <td className="py-3.5 px-4 text-center text-xs">
                                {isCompany ? (
                                  <div className="text-[11px] text-zinc-300 font-mono">
                                    <span className="font-bold text-purple-300">{rec.tripsCount || 0} Total Transports</span>
                                    {(rec.bigVansCount || rec.miniVansCount) ? (
                                      <div className="text-[10px] text-zinc-400">
                                        {rec.bigVansCount || 0} Big + {rec.miniVansCount || 0} Mini
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-zinc-300 font-mono">
                                    <span className="font-bold text-emerald-400">{rec.daysCount || 0} Days</span> &bull; <span>{rec.tripsCount || 0} Trips</span>
                                    {rec.paxCount ? <span className="text-[10px] text-zinc-400 block">{rec.paxCount} Pax</span> : null}
                                  </div>
                                )}
                              </td>

                              {/* Amount Paid (DH) */}
                              <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm">
                                <span className="bg-emerald-950/70 border border-emerald-600/60 px-2.5 py-1 rounded-xl shadow-inner inline-block">
                                  {rec.amountDH.toLocaleString()} DH
                                </span>
                              </td>

                              {/* Payment Method */}
                              <td className="py-3.5 px-4 text-zinc-300 font-medium">
                                <span className="px-2 py-0.5 rounded bg-[#091f2a] border border-[#163d4f] text-[11px] text-zinc-200">
                                  {rec.paymentMethod || 'Cash'}
                                </span>
                              </td>

                              {/* Settlement Authorization */}
                              <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                                <div className="flex items-center gap-1.5 text-zinc-200">
                                  <Check className="w-3.5 h-3.5 text-teal-400" />
                                  <span>{rec.paidAt ? new Date(rec.paidAt).toLocaleDateString() : 'Settled'}</span>
                                </div>
                                <div className="text-[10px] text-teal-400 font-bold">
                                  By {rec.paidByManager || 'Manager'}
                                </div>
                              </td>

                              {/* Voucher Receipt & Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setViewVoucherRecord(rec)}
                                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 hover:text-white border border-teal-600/60 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                    title="View & Print Official Voucher Receipt"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Voucher</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokePayment(rec.id, rec.entityName)}
                                    className="p-1.5 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 cursor-pointer transition-all"
                                    title="Revert / Void Settlement Status"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      </main>

      {/* ================= PASSWORD CONFIRMATION MODAL ("PAYED" CONFIRMATION) ================= */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09151a] border-2 border-[#00c896]/50 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_60px_rgba(0,200,150,0.25)] space-y-5 font-mono text-left animate-fadeIn">
            
            {/* Header Icon + Title */}
            <div className="flex items-center gap-3.5 border-b border-[#143240] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/50 text-[#00e6a8] flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Manager Payment Authorization
                </h3>
                <p className="text-xs text-teal-300/80">
                  Confirm official payout settlement with manager password
                </p>
              </div>
            </div>

            {/* Recipient & Work Details Summary Box */}
            <div className="bg-[#050f14] border border-[#132d3a] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Recipient / Partner:</span>
                <strong className="text-white font-black uppercase text-sm">{paymentTarget.entityName}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Category &bull; Period:</span>
                <span className="text-teal-300 font-bold uppercase">
                  {paymentTarget.entityType} &bull; {paymentTarget.periodLabel}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Days / Shifts Executed:</span>
                <span className="text-zinc-200 font-bold">
                  {paymentTarget.daysCount} Days &bull; {paymentTarget.tripsCount} Excursions ({paymentTarget.paxCount} Pax)
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#122b37] pt-2">
                <span className="text-zinc-400 font-bold">Total Payment Amount:</span>
                <strong className="text-emerald-400 font-black text-base">
                  {paymentTarget.amountDH.toLocaleString()} DH
                </strong>
              </div>
            </div>

            {passwordError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
                {passwordError}
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleConfirmPasswordPayment} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'Bank Transfer', 'Cheque', 'Direct Payout'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        selectedPaymentMethod === method
                          ? 'bg-[#00c896]/20 border-[#00c896] text-[#00e6a8]'
                          : 'bg-[#050f14] border-[#132d3a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Manager Security Password
                </label>
                <div className="relative rounded-xl border border-[#1b3b49] bg-[#050f14] focus-within:border-[#00e6a8] flex items-center px-3.5 py-2.5">
                  <Lock className="w-4 h-4 text-teal-400 mr-2 shrink-0" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Enter manager password (e.g. agm / 1234)"
                    required
                    autoFocus
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Accepted passwords: agm, agmtravelagm, 1234, admin, ismail
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentTarget(null)}
                  className="flex-1 py-3 rounded-xl bg-[#091a22] hover:bg-[#112d3b] text-zinc-300 font-bold border border-[#173847] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,200,150,0.4)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize &amp; Settle Payout</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================= OFFICIAL PAYMENT VOUCHER / RECEIPT MODAL ================= */}
      {viewVoucherRecord && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08151c] border-2 border-teal-500/50 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 font-mono text-left animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-[#143240] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">AGM Travel Official Payment Voucher</h3>
                  <p className="text-[10px] text-teal-400 font-mono">VOUCHER ID: {viewVoucherRecord.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewVoucherRecord(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#040c10] border border-[#122834] rounded-2xl p-5 space-y-3 text-xs leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Beneficiary / Recipient:</span>
                <strong className="text-white uppercase font-black">{viewVoucherRecord.entityName}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Category &bull; Period:</span>
                <span className="text-teal-300 font-bold uppercase">
                  {viewVoucherRecord.entityType} &bull; {viewVoucherRecord.periodKey}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Days / Trips:</span>
                <span className="text-zinc-200 font-bold">
                  {viewVoucherRecord.daysCount || 0} Days &bull; {viewVoucherRecord.tripsCount || 0} Trips
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Payment Method:</span>
                <span className="text-white font-bold">{viewVoucherRecord.paymentMethod || 'Cash'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Authorized By:</span>
                <span className="text-[#00e6a8] font-bold">{viewVoucherRecord.paidByManager || 'Manager'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Timestamp:</span>
                <span className="text-zinc-300">{viewVoucherRecord.paidAt ? new Date(viewVoucherRecord.paidAt).toLocaleString() : 'Confirmed'}</span>
              </div>

              <div className="border-t border-[#122834] pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-300">Total Settled Amount:</span>
                <strong className="text-xl font-black text-emerald-400">
                  {viewVoucherRecord.amountDH.toLocaleString()} DH
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-[#09222c] hover:bg-[#123847] text-teal-300 border border-teal-600/50 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setViewVoucherRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
