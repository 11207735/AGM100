import React, { useState, useMemo, useEffect, memo } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Building2, 
  Calendar, 
  Compass, 
  Phone, 
  Mail, 
  MoreVertical, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Activity, 
  ArrowLeft, 
  Award, 
  Clock, 
  Copy, 
  Eye, 
  Flame, 
  CheckCircle2, 
  CalendarDays, 
  BarChart3, 
  Check, 
  ArrowUpRight,
  QrCode,
  Tag,
  Trash2,
  UserX,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Lock,
  Wallet,
  Coins,
  DollarSign,
  Receipt,
  Bus,
  KeyRound,
  Printer
} from 'lucide-react';
import { getStoredGuides, RegisteredGuide, RegisteredDriver } from './IdManagerView';
import { getInactiveStaffMap, isStaffInactive, markStaffInactiveStatus, clearAllInactiveStaff, StaffStatusInfo } from '../utils/staffStatus';
import { ManagerData } from './AutoPyneIntro';
import { PaymentRates, DEFAULT_PAYMENT_RATES } from './PaymentsDetailsModal';
import { AccountsView } from './AccountsView';
import {
  SettledPaymentRecord,
  getStoredSettledPayments,
  saveSettledPaymentRecord,
  removeSettledPaymentRecord,
  verifyManagerPassword
} from '../utils/paymentSettlements';

export interface DriverItemData {
  driver: string;
  van_type: 'Big van' | 'Mini van';
  company?: string;
  pax?: string;
}

export interface ResultItem {
  id: number;
  van_type?: string;
  guide: string;
  driver: string;
  company?: string;
  pax: string;
  quads: string;
  camels: string;
  person_extra?: string;
  quad_extra?: string;
  camel_extra?: string;
  extra_payment?: string;
  person_extra_pay?: string;
  quad_extra_pay?: string;
  camel_extra_pay?: string;
  date: string;
  time: string;
  status?: 'Logged' | 'Confirmed' | 'Cancelled';
  driversList?: DriverItemData[];
}

export interface StaffProfile {
  id: string;
  name: string;
  role: 'guide' | 'big_driver' | 'mini_driver';
  initial: string;
  daysWorked: number;
  totalTrips: number;
  totalPax: number;
  totalQuads: number;
  totalCamels: number;
  companiesSet?: Set<string>;
  companyName?: string;
  datesWorked: {
    date: string;
    trips: ResultItem[];
    dayPax: number;
    dayQuads: number;
    dayCamels: number;
  }[];
}

export interface StaffProfilesViewProps {
  isOpen: boolean;
  onClose: () => void;
  results: ResultItem[];
  staffProfiles: StaffProfile[];
  knownGuidesList: string[];
  knownDriversList: string[];
  registeredGuides?: RegisteredGuide[];
  registeredDrivers?: RegisteredDriver[];
  managersList?: ManagerData[];
  paymentRates?: PaymentRates;
  currentManager?: ManagerData;
  onSelectTripDate?: (date: string) => void;
  showNotification: (msg: string) => void;
  initialTab?: 'profiles' | 'accounts' | 'companies' | 'settlements';
}

// Date parsing helper functions
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
        // YYYY-MM-DD or YYYY/MM/DD
        year = parseInt(parts[0], 10) || year;
        month = parseInt(parts[1], 10) || month;
        day = parseInt(parts[2], 10) || day;
      } else {
        // DD-MM-YYYY or DD/MM/YYYY
        day = parseInt(parts[0], 10) || day;
        month = parseInt(parts[1], 10) || month;
        year = parseInt(parts[2], 10) || year;
      }
    }
  }

  const rawDay = String(day).padStart(2, '0');
  const rawMonth = String(month).padStart(2, '0');
  const rawYear = String(year);
  const isoDate = `${rawYear}-${rawMonth}-${rawDay}`;
  const displayDate = `${rawDay}/${rawMonth}/${rawYear}`;

  return { day, month, year, rawDay, rawMonth, rawYear, isoDate, displayDate };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const MONTH_NAMES: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

// Generate consistent initials (2 characters) from full name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (name[0] || 'S').toUpperCase();
}

// Helper to format clean role name without any emoji characters
function getRoleLabel(role: 'guide' | 'big_driver' | 'mini_driver'): string {
  if (role === 'guide') return 'TOUR GUIDE';
  if (role === 'big_driver') return 'BIG VAN DRIVER';
  return 'MINI VAN DRIVER';
}

// ================= MEMOIZED STAFF CARD FOR GRID VIEW (ULTRA-FAST & 60FPS) =================
interface StaffCardProps {
  profile: StaffProfile;
  onOpen: (profile: StaffProfile) => void;
  menuOpenId: string | null;
  setMenuOpenId: React.Dispatch<React.SetStateAction<string | null>>;
  showNotification: (msg: string) => void;
  isInactive?: boolean;
  onDeleteClick: (profile: StaffProfile) => void;
  onToggleActive?: (profile: StaffProfile) => void;
}

const StaffCard: React.FC<StaffCardProps> = memo(({
  profile,
  onOpen,
  menuOpenId,
  setMenuOpenId,
  showNotification,
  isInactive = false,
  onDeleteClick,
  onToggleActive
}) => {
  const initials = useMemo(() => getInitials(profile.name), [profile.name]);
  const isMenuOpen = menuOpenId === profile.id;

  // Registered Guide lookup for 6-digit ID and Nickname
  const guideInfo = useMemo(() => {
    if (profile.role !== 'guide') return null;
    const guides = getStoredGuides();
    const pUpper = profile.name.toUpperCase();
    return guides.find(g => 
      g.name.toUpperCase() === pUpper || 
      (g.nickname && g.nickname.toUpperCase() === pUpper) ||
      g.id === profile.id
    ) || null;
  }, [profile]);

  return (
    <div
      className={`relative border rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-150 transform hover:-translate-y-0.5 group cursor-pointer ${
        isInactive
          ? 'bg-[#150a0e]/95 hover:bg-[#1c0d13] border-rose-900/60 hover:border-rose-500/80 shadow-[0_4px_20px_rgba(244,63,94,0.12)] opacity-90'
          : 'bg-[#091820]/95 hover:bg-[#0c202a] border-[#153442] hover:border-[#00c896]/70 hover:shadow-[0_4px_20px_rgba(0,200,150,0.15)]'
      }`}
      onClick={() => onOpen(profile)}
    >
      {/* Top Notice if Inactive / Removed */}
      {isInactive && (
        <div className="mb-2.5 bg-rose-950/90 border border-rose-500/70 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-rose-200 font-bold shadow-sm">
          <span className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">REMOVED BY MANAGER</span>
          </span>
          <span className="bg-rose-600 text-white font-black px-2 py-0.5 rounded text-[9px] shrink-0 uppercase tracking-wider shadow-sm">
            REMOVED
          </span>
        </div>
      )}

      {/* Top Row: Avatar + Name + Action Buttons */}
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-grow">
            {/* Circular Avatar with 2-letter Initials */}
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-md border ${
              isInactive
                ? 'bg-gradient-to-br from-rose-900 to-zinc-800 text-rose-200 border-rose-600/50'
                : profile.role === 'guide'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-300/40'
                : profile.role === 'big_driver'
                ? 'bg-gradient-to-br from-cyan-600 to-blue-800 text-white border-cyan-300/40'
                : 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white border-purple-300/40'
            }`}>
              {initials}
            </div>

            {/* Name and Role Subtitle */}
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 truncate">
                <h3 className={`text-sm font-bold tracking-wide truncate transition-colors ${
                  isInactive ? 'text-zinc-200 group-hover:text-rose-300' : 'text-white group-hover:text-[#00e6a8]'
                }`}>
                  {guideInfo ? guideInfo.name : profile.name}
                </h3>
                {isInactive && (
                  <span className="text-[9px] font-black text-white bg-rose-600 border border-rose-400 px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 shadow-xs">
                    REMOVED
                  </span>
                )}
                {guideInfo?.nickname && (
                  <span className="text-[10px] font-bold text-teal-300 bg-[#071d24] border border-[#12424f] px-1.5 py-0.2 rounded shrink-0">
                    "{guideInfo.nickname}"
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e6a8] shrink-0" />
                <span className="truncate">{getRoleLabel(profile.role)}</span>
                {guideInfo?.id && (
                  <>
                    <span className="text-zinc-600">&bull;</span>
                    <span className="text-teal-400 font-bold">ID: {guideInfo.id}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons: Quick Delete & 3-Dots Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Delete / Inactive Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(profile);
              }}
              className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 transition-all cursor-pointer"
              title={isInactive ? "Staff options / Re-activate" : "Mark as Removed by Manager"}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Three Dots Menu Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(isMenuOpen ? null : profile.id);
                }}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#112a36] transition-all cursor-pointer"
                title="Staff Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Quick dropdown */}
              {isMenuOpen && (
                <div 
                  className="absolute right-0 top-7 z-30 w-52 bg-[#071720] border border-[#194052] rounded-xl shadow-2xl p-1 font-mono text-xs text-zinc-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpen(profile);
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#123140] hover:text-[#00e6a8] flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.name);
                      showNotification(`Copied name: ${profile.name}`);
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#123140] flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Name</span>
                  </button>
                  <div className="border-t border-[#13303f] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null);
                      onDeleteClick(profile);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/70 text-rose-300 hover:text-rose-200 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isInactive ? 'Re-activate / Manage Status' : 'Mark as Removed'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Role & Company Badges */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
            isInactive
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              : profile.role === 'guide'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : profile.role === 'big_driver'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
              : 'bg-purple-950/80 text-purple-300 border-purple-700/60'
          }`}>
            {profile.role === 'guide' && <Compass className="w-3 h-3 text-emerald-400" />}
            <span>{getRoleLabel(profile.role)}</span>
          </span>

          {profile.companyName ? (
            <span className="text-[10px] font-mono text-zinc-300 bg-[#07161e] border border-[#163a4b] px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[130px]">
              <Building2 className="w-3 h-3 text-[#00e6a8] shrink-0" />
              <span className="truncate">{profile.companyName}</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-400 bg-[#07161e] border border-[#163a4b] px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>AGM Travel</span>
            </span>
          )}
        </div>

        {/* Real System Data Badges: Days Worked, Trips */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-[#040e13]/80 border border-[#132c38] rounded-xl p-2 text-center text-xs font-mono">
          <div>
            <span className="text-[9px] text-zinc-400 uppercase block font-bold">Days Worked</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">{profile.daysWorked} Days</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 uppercase block font-bold">Total Trips</span>
            <span className="text-xs sm:text-sm font-black text-white">{profile.totalTrips} Shifts</span>
          </div>
        </div>

        {/* Quads, Camels & Pax Handled Stats */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Quads: <strong className="text-amber-300">{profile.totalQuads}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-[#DFB750]" />
            <span>Camels: <strong className="text-[#DFB750]">{profile.totalCamels}</strong></span>
          </span>
          <span className="text-zinc-300">
            Pax: <strong className="text-white">{profile.totalPax}</strong>
          </span>
        </div>

        {/* Preservation Guarantee Note if Removed */}
        {isInactive && (
          <div className="mt-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono text-rose-300">
            <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Data details intact &bull; Click to view logs</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Last Active Date & "See details >" Link */}
      <div className="mt-4 pt-2.5 border-t border-[#122b37] flex items-center justify-between font-mono">
        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
          <span>{profile.datesWorked.length > 0 ? `Latest: ${profile.datesWorked[profile.datesWorked.length - 1].date}` : 'Active'}</span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(profile);
          }}
          className="text-xs font-mono font-bold text-[#00e6a8] hover:text-[#00f5b8] flex items-center gap-1 cursor-pointer transition-all hover:translate-x-1"
        >
          <span>See details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// ================= MEMOIZED STAFF ROW FOR LIST VIEW =================
interface StaffRowProps {
  profile: StaffProfile;
  onOpen: (profile: StaffProfile) => void;
  isInactive?: boolean;
  onDeleteClick: (profile: StaffProfile) => void;
  onToggleActive?: (profile: StaffProfile) => void;
}

const StaffRow: React.FC<StaffRowProps> = memo(({ profile, onOpen, isInactive = false, onDeleteClick, onToggleActive }) => {
  const initials = useMemo(() => getInitials(profile.name), [profile.name]);

  // Registered Guide lookup for 6-digit ID and Nickname
  const guideInfo = useMemo(() => {
    if (profile.role !== 'guide') return null;
    const guides = getStoredGuides();
    const pUpper = profile.name.toUpperCase();
    return guides.find(g => 
      g.name.toUpperCase() === pUpper || 
      (g.nickname && g.nickname.toUpperCase() === pUpper) ||
      g.id === profile.id
    ) || null;
  }, [profile]);

  return (
    <tr 
      className={`hover:bg-[#0c2330] transition-colors group cursor-pointer border-b border-[#102936] last:border-0 ${
        isInactive ? 'bg-[#140a0e]/40' : ''
      }`}
      onClick={() => onOpen(profile)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
            isInactive
              ? 'bg-rose-950 text-rose-300 border border-rose-800'
              : profile.role === 'guide'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
          }`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold block transition-colors ${
                isInactive ? 'text-zinc-300 group-hover:text-rose-300' : 'text-white group-hover:text-[#00e6a8]'
              }`}>
                {guideInfo ? guideInfo.name : profile.name}
              </span>
              {isInactive && (
                <span className="bg-rose-600 text-white border border-rose-400 text-[9px] font-mono font-black px-1.5 py-0.2 rounded uppercase tracking-wider shadow-xs">
                  REMOVED
                </span>
              )}
              {guideInfo?.nickname && (
                <span className="text-[10px] font-bold text-teal-300 bg-[#071d24] border border-[#12424f] px-1.5 py-0.2 rounded shrink-0">
                  "{guideInfo.nickname}"
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {guideInfo?.id ? `Guide ID: ${guideInfo.id}` : getRoleLabel(profile.role)}
            </span>
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#06141c] border border-[#16394a] text-zinc-300 font-bold uppercase inline-flex items-center gap-1">
          {profile.role === 'guide' && <Compass className="w-3 h-3 text-emerald-400" />}
          <span>{getRoleLabel(profile.role)}</span>
        </span>
      </td>

      <td className="py-3 px-4 text-zinc-300 font-mono">
        <span className="text-xs text-teal-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-teal-400 shrink-0" />
          <span>{profile.datesWorked.length > 0 ? profile.datesWorked[profile.datesWorked.length - 1].date : 'Active'}</span>
        </span>
      </td>

      <td className="py-3 px-4 text-purple-300 font-bold">
        {profile.companyName || 'AGM Travel'}
      </td>

      <td className="py-3 px-4 text-center font-black text-emerald-400">
        {profile.daysWorked} Days
      </td>

      <td className="py-3 px-4 text-center font-bold text-white">
        {profile.totalTrips}
      </td>

      <td className="py-3 px-4 text-center font-bold text-amber-400">
        {profile.totalQuads}
      </td>

      <td className="py-3 px-4 text-center font-bold text-[#DFB750]">
        {profile.totalCamels}
      </td>

      <td className="py-3 px-4 text-center font-bold text-white">
        {profile.totalPax}
      </td>

      <td className="py-3 px-4 text-right">
        <div className="inline-flex items-center gap-2">
          {isInactive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleActive) onToggleActive(profile);
              }}
              className="p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/80 border border-emerald-700/60 transition-all cursor-pointer"
              title="Re-activate / Clean from Inactive"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(profile);
            }}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 transition-all cursor-pointer"
            title="Delete / Inactive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(profile);
            }}
            className="text-xs font-bold text-[#00e6a8] hover:text-[#00f5b8] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ================= MEMOIZED STAFF DETAIL MODAL =================
interface StaffDetailModalProps {
  staff: StaffProfile;
  onClose: () => void;
  onSelectTripDate?: (date: string) => void;
  showNotification: (msg: string) => void;
  isInactive?: boolean;
  onDeleteClick?: (staff: StaffProfile) => void;
  onToggleActive?: (staff: StaffProfile) => void;
  paymentRates?: PaymentRates;
  currentManager?: ManagerData;
  managersList?: ManagerData[];
}

const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  staff,
  onClose,
  onSelectTripDate,
  showNotification,
  isInactive = false,
  onDeleteClick,
  onToggleActive,
  paymentRates = DEFAULT_PAYMENT_RATES,
  currentManager,
  managersList = []
}) => {
  // Tabs order: 1. Yearly Overview, 2. Monthly Analysis, 3. All Trips Log, 4. Fleet (Quads & Camels)
  const [detailTab, setDetailTab] = useState<'yearly' | 'monthly' | 'all_trips' | 'fleet'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(8); // Defaults to Month 8 (August)
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);

  // Settlement records & password modal state
  const [settledRecords, setSettledRecords] = useState<Record<string, SettledPaymentRecord>>(() => getStoredSettledPayments());
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{
    periodKey: string;
    periodLabel: string;
    amountDH: number;
    daysCount: number;
    tripsCount: number;
    paxCount: number;
  } | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Direct Payout'>('Cash');
  const [viewVoucher, setViewVoucher] = useState<SettledPaymentRecord | null>(null);

  const refreshSettledState = () => {
    setSettledRecords(getStoredSettledPayments());
  };

  // Real-time synchronization across views when settlements are updated
  useEffect(() => {
    const handleSettlementUpdate = () => {
      refreshSettledState();
    };
    window.addEventListener('agm_settlements_updated', handleSettlementUpdate);
    return () => {
      window.removeEventListener('agm_settlements_updated', handleSettlementUpdate);
    };
  }, []);

  // Initialize selected year and month from profile history
  React.useEffect(() => {
    if (staff.datesWorked.length > 0) {
      const lastDate = staff.datesWorked[staff.datesWorked.length - 1].date;
      const parsed = parseDate(lastDate);
      setSelectedYear(parsed.year);
      setSelectedMonthNum(parsed.month);
    }
  }, [staff]);

  // Fast Deep Analytics Computation
  const staffAnalytics = useMemo(() => {
    const allTrips: (ResultItem & { parsedDate: ReturnType<typeof parseDate> })[] = [];
    
    staff.datesWorked.forEach(dateEntry => {
      dateEntry.trips.forEach(t => {
        allTrips.push({
          ...t,
          parsedDate: parseDate(t.date || dateEntry.date)
        });
      });
    });

    allTrips.sort((a, b) => {
      if (a.parsedDate.year !== b.parsedDate.year) return a.parsedDate.year - b.parsedDate.year;
      if (a.parsedDate.month !== b.parsedDate.month) return a.parsedDate.month - b.parsedDate.month;
      if (a.parsedDate.day !== b.parsedDate.day) return a.parsedDate.day - b.parsedDate.day;
      return (a.time || '').localeCompare(b.time || '');
    });

    const earliestTrip = allTrips[0];
    const latestTrip = allTrips[allTrips.length - 1];
    const careerStartDate = earliestTrip ? earliestTrip.parsedDate.displayDate : 'N/A';

    const yearsSet = new Set<number>();
    allTrips.forEach(t => yearsSet.add(t.parsedDate.year));
    const recordedYears = Array.from(yearsSet).sort((a, b) => b - a);
    if (recordedYears.length === 0) recordedYears.push(new Date().getFullYear());

    const targetYear = selectedYear;
    const yearTrips = allTrips.filter(t => t.parsedDate.year === targetYear);
    
    // Group trips by month
    const tripsByMonth: Record<number, typeof allTrips> = {};
    for (let m = 1; m <= 12; m++) tripsByMonth[m] = [];
    yearTrips.forEach(t => {
      if (tripsByMonth[t.parsedDate.month]) {
        tripsByMonth[t.parsedDate.month].push(t);
      }
    });

    const monthsBreakdown = [];
    const activeMonthsSet = new Set<number>();
    const yearUniqueDaysSet = new Set<string>();

    for (let m = 1; m <= 12; m++) {
      const daysCount = getDaysInMonth(targetYear, m);
      const mTrips = tripsByMonth[m] || [];
      const workedDays = new Set<number>();
      let mPax = 0;
      let mQuads = 0;
      let mCamels = 0;

      mTrips.forEach(t => {
        workedDays.add(t.parsedDate.day);
        yearUniqueDaysSet.add(`${targetYear}-${m}-${t.parsedDate.day}`);
        mPax += parseInt(t.pax) || 0;
        mQuads += parseInt(t.quads) || 0;
        mCamels += parseInt(t.camels) || 0;
      });

      if (workedDays.size > 0) {
        activeMonthsSet.add(m);
      }

      const isAllDays = daysCount > 0 && workedDays.size >= daysCount;
      const attendance = daysCount > 0 ? (workedDays.size / daysCount) * 100 : 0;

      monthsBreakdown.push({
        monthNum: m,
        monthName: MONTH_NAMES[m],
        daysInMonth: daysCount,
        workedDaysSet: workedDays,
        workedDaysCount: workedDays.size,
        trips: mTrips,
        totalPax: mPax,
        totalQuads: mQuads,
        totalCamels: mCamels,
        isAllDaysWorked: isAllDays,
        attendancePercentage: attendance
      });
    }

    const currentMonthData = monthsBreakdown.find(m => m.monthNum === selectedMonthNum) || monthsBreakdown[7];
    const totalDaysInSelectedMonth = currentMonthData.daysInMonth;
    const workedDaysInSelectedMonth = currentMonthData.workedDaysCount;

    // Group trips by day for selected month
    const tripsByDay: Record<number, typeof allTrips> = {};
    for (let d = 1; d <= totalDaysInSelectedMonth; d++) tripsByDay[d] = [];
    currentMonthData.trips.forEach(t => {
      if (tripsByDay[t.parsedDate.day]) {
        tripsByDay[t.parsedDate.day].push(t);
      }
    });

    const daysCalendar = [];
    for (let d = 1; d <= totalDaysInSelectedMonth; d++) {
      const dayTrips = tripsByDay[d] || [];
      const isWorked = dayTrips.length > 0;
      let dayPax = 0;
      let dayQuads = 0;
      let dayCamels = 0;

      dayTrips.forEach(t => {
        dayPax += parseInt(t.pax) || 0;
        dayQuads += parseInt(t.quads) || 0;
        dayCamels += parseInt(t.camels) || 0;
      });

      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(selectedMonthNum).padStart(2, '0');

      daysCalendar.push({
        dayNumber: d,
        dateFormatted: `${dayStr}/${monthStr}/${targetYear}`,
        isWorked,
        trips: dayTrips,
        totalPax: dayPax,
        totalQuads: dayQuads,
        totalCamels: dayCamels
      });
    }

    return {
      allTrips,
      careerStartDate,
      latestTrip,
      recordedYears,
      targetYear,
      yearTripsCount: yearTrips.length,
      yearDaysWorkedCount: yearUniqueDaysSet.size,
      activeMonthsCountInYear: activeMonthsSet.size,
      monthsBreakdown,
      currentMonthData,
      totalDaysInSelectedMonth,
      workedDaysInSelectedMonth,
      daysCalendar
    };
  }, [staff, selectedYear, selectedMonthNum]);

  const initials = useMemo(() => getInitials(staff.name), [staff.name]);

  // Registered Guide lookup for 6-digit ID and Nickname
  const guideInfo = useMemo(() => {
    if (staff.role !== 'guide') return null;
    const guides = getStoredGuides();
    const sUpper = staff.name.toUpperCase();
    return guides.find(g => 
      g.name.toUpperCase() === sUpper || 
      (g.nickname && g.nickname.toUpperCase() === sUpper) ||
      g.id === staff.id
    ) || null;
  }, [staff]);

  return (
    <div className="fixed inset-0 z-50 bg-[#051117] w-full h-full flex flex-col overflow-hidden animate-fadeIn">
      
      {/* ================= TOP EXECUTIVE PROFILE BANNER ================= */}
      <div className="bg-gradient-to-r from-[#061722] via-[#092230] to-[#061620] border-b border-[#14384a] px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 shrink-0 shadow-lg">
        <div className="w-full max-w-[1920px] mx-auto flex items-start justify-between gap-4 flex-wrap">
          
          {/* Left: Avatar + Identity + Starting Date */}
          <div className="flex items-center gap-3 sm:gap-5 flex-grow min-w-0">
            <div className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-xl border-2 border-white/20 shrink-0 ${
              staff.role === 'guide'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-950/60'
                : staff.role === 'big_driver'
                ? 'bg-gradient-to-br from-cyan-600 to-blue-800 text-white shadow-cyan-950/60'
                : 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white shadow-purple-950/60'
            }`}>
              {initials}
            </div>

            <div className="min-w-0 flex-grow">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                  {guideInfo ? guideInfo.name : staff.name}
                </h2>

                {guideInfo?.nickname && (
                  <span className="text-xs font-mono text-teal-300 font-bold bg-[#071d24] border border-[#12424f] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3 text-teal-400" />
                    <span>Nickname: "{guideInfo.nickname}"</span>
                  </span>
                )}

                {guideInfo?.id && (
                  <span className="text-xs font-mono text-[#00e6a8] font-black bg-[#00c896]/15 border border-[#00c896]/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-[#00e6a8]" />
                    <span>Guide ID: {guideInfo.id}</span>
                  </span>
                )}
                
                <span className={`text-xs font-mono uppercase px-3 py-1 rounded-full border font-black flex items-center gap-1.5 shadow-sm ${
                  staff.role === 'guide'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                    : staff.role === 'big_driver'
                    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600'
                    : 'bg-purple-950/90 text-purple-300 border-purple-600'
                }`}>
                  {staff.role === 'guide' && <Compass className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{getRoleLabel(staff.role)}</span>
                </span>

                {isInactive && (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full border border-rose-500 bg-rose-950 text-rose-200 font-black flex items-center gap-1.5 shadow-lg shadow-rose-950/60">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>STATUS: REMOVED</span>
                  </span>
                )}

                {staff.companyName && (
                  <span className="text-xs font-mono text-purple-200 bg-purple-950/80 border border-purple-700/80 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{staff.companyName}</span>
                  </span>
                )}
              </div>

              {/* Career & Shift Badges */}
              <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-300 mt-2 flex-wrap">
                <span className="bg-[#030d12] border border-[#163a4b] text-[#00e6a8] px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-[#00c896]" />
                  <span>Career Start: {staffAnalytics.careerStartDate}</span>
                </span>
                <span className="bg-[#030d12] border border-[#163a4b] text-teal-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Latest Shift: {staff.datesWorked.length > 0 ? staff.datesWorked[staff.datesWorked.length - 1].date : 'Active'}</span>
                </span>
                <span className="bg-[#030d12] border border-[#163a4b] text-zinc-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Affiliation: {staff.companyName || 'AGM Travel'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Modal Controls - Copy Info, Inactive/Delete, & Close X Button */}
          <div className="flex items-center gap-2 shrink-0">
            {isInactive ? (
              onToggleActive && (
                <button
                  type="button"
                  onClick={() => onToggleActive(staff)}
                  className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-zinc-950 font-black text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/60"
                  title="Re-activate this staff member"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Re-activate Staff</span>
                </button>
              )
            ) : (
              onDeleteClick && (
                <button
                  type="button"
                  onClick={() => onDeleteClick(staff)}
                  className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/70 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Mark as Removed by Manager"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark as Removed</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => {
                const summary = `Staff: ${staff.name} (${staff.role})\nStatus: ${isInactive ? 'REMOVED' : 'ACTIVE'}\nDays Worked in Month ${selectedMonthNum}: ${staffAnalytics.workedDaysInSelectedMonth}/${staffAnalytics.totalDaysInSelectedMonth}\nTotal Career Days: ${staff.daysWorked}\nTrips: ${staff.totalTrips}\nPax: ${staff.totalPax}\nQuads: ${staff.totalQuads}\nCamels: ${staff.totalCamels}`;
                navigator.clipboard.writeText(summary);
                showNotification(`Copied summary for ${staff.name}`);
              }}
              className="px-3 py-2 rounded-xl bg-[#0a202c] hover:bg-[#123142] text-zinc-300 hover:text-white border border-[#1b4356] transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 shadow-sm"
              title="Copy Staff Summary"
            >
              <Copy className="w-4 h-4 text-[#00e6a8]" />
              <span className="hidden sm:inline">Copy Info</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0a202c] hover:bg-rose-900/60 text-zinc-400 hover:text-white border border-[#1b4356] hover:border-rose-700 transition-all cursor-pointer"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Manager Removed Alert Notice (if marked removed by manager) */}
        {isInactive && (
          <div className="w-full max-w-[1920px] mx-auto mt-3 bg-gradient-to-r from-rose-950/95 via-[#230911] to-rose-950/95 border-2 border-rose-500/70 rounded-2xl p-3.5 flex items-center justify-between gap-3 font-mono flex-wrap shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  <span>Staff Profile Status: Removed by Manager</span>
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">
                    REMOVED
                  </span>
                </h4>
                <p className="text-[11px] text-rose-200/90 mt-0.5">
                  This {staff.role === 'guide' ? 'guide' : 'driver'} was marked as removed by the manager. <strong>All data details, trip history ({staff.totalTrips} trips), days worked ({staff.daysWorked} days), quads, camels, and performance metrics are 100% safely preserved</strong> in the system.
                </p>
              </div>
            </div>

            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(staff)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-950/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-activate To Staff</span>
              </button>
            )}
          </div>
        )}

        {/* Lifetime KPI Highlights Bar */}
        <div className="w-full max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mt-3 font-mono text-center">
          <div className="bg-[#030e14]/90 border border-[#143242] p-2 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Days Worked</span>
            <span className="text-base sm:text-lg font-black text-[#00e6a8]">{staff.daysWorked} Days</span>
          </div>
          <div className="bg-[#030e14]/90 border border-[#143242] p-2 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Trips Logged</span>
            <span className="text-base sm:text-lg font-black text-white">{staff.totalTrips} Trips</span>
          </div>
          <div className="bg-[#030e14]/90 border border-[#143242] p-2 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Pax</span>
            <span className="text-base sm:text-lg font-black text-purple-300">{staff.totalPax}</span>
          </div>
          <div className="bg-[#030e14]/90 border border-[#143242] p-2 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase block font-bold">Quads Handled</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{staff.totalQuads} Q</span>
          </div>
          <div className="bg-[#030e14]/90 border border-[#143242] p-2 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-400 uppercase block font-bold">Camels Handled</span>
            <span className="text-base sm:text-lg font-black text-[#DFB750]">{staff.totalCamels} C</span>
          </div>
        </div>

        {/* Sub-Navigation Tabs: 1. Yearly Overview, 2. Monthly Analysis, 3. All Trips Log, 4. Fleet */}
        <div className="w-full max-w-[1920px] mx-auto flex items-center gap-2 mt-3 pt-3 border-t border-[#122e3e] overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setDetailTab('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              detailTab === 'yearly'
                ? 'bg-emerald-400 text-zinc-950 font-black shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                : 'bg-[#081b26] text-zinc-300 hover:text-white hover:bg-[#0e2736] border border-[#163b4d]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Yearly Overview ({staffAnalytics.targetYear} - Months & Days)</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              detailTab === 'monthly'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-[0_0_15px_rgba(0,200,150,0.35)]'
                : 'bg-[#081b26] text-zinc-300 hover:text-white hover:bg-[#0e2736] border border-[#163b4d]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Monthly & 31-Day Calendar Analysis (Month {selectedMonthNum})</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('all_trips')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              detailTab === 'all_trips'
                ? 'bg-cyan-400 text-zinc-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                : 'bg-[#081b26] text-zinc-300 hover:text-white hover:bg-[#0e2736] border border-[#163b4d]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>All Trips Log ({staffAnalytics.allTrips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              detailTab === 'fleet'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                : 'bg-[#081b26] text-zinc-300 hover:text-white hover:bg-[#0e2736] border border-[#163b4d]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Fleet (Quads & Camels)</span>
          </button>
        </div>

      </div>

      {/* ================= SCROLLABLE CONTENT BODY (NO SCROLLBAR) ================= */}
      <div className="flex-grow overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="w-full max-w-[1920px] mx-auto space-y-6">
          
          {/* ----------------- TAB 1: YEARLY OVERVIEW (FIRST FROM LEFT) ----------------- */}
          {detailTab === 'yearly' && (
            <div className="space-y-6 font-mono">
              
              {/* Annual Summary Header */}
              <div className="bg-gradient-to-r from-[#07202c] via-[#092736] to-[#071f2a] border-2 border-[#00c896]/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#00e6a8] font-black bg-[#030d12] px-3 py-1 rounded-full border border-[#00c896]/40">
                      Annual Performance Breakdown &bull; {staffAnalytics.targetYear}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                      {staff.name} worked in <span className="text-[#00e6a8]">{staffAnalytics.activeMonthsCountInYear} Months</span> and a total of <span className="text-[#00e6a8]">{staffAnalytics.yearDaysWorkedCount} Days</span> in {staffAnalytics.targetYear}.
                    </h3>
                  </div>

                  {/* Year Selector */}
                  <div className="flex items-center gap-1.5 bg-[#040e14] border border-[#143547] px-3 py-1.5 rounded-xl text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#00c896]" />
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                      className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs font-mono"
                    >
                      {staffAnalytics.recordedYears.map(yr => (
                        <option key={yr} value={yr} className="bg-[#071720] text-white">
                          Year {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Annual Pillars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-[#030d12]/90 border border-[#133242] p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Active Months</span>
                    <span className="text-xl font-black text-[#00e6a8]">{staffAnalytics.activeMonthsCountInYear} / 12 Months</span>
                  </div>
                  <div className="bg-[#030d12]/90 border border-[#133242] p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Days in Year</span>
                    <span className="text-xl font-black text-emerald-400">{staffAnalytics.yearDaysWorkedCount} Days</span>
                  </div>
                  <div className="bg-[#030d12]/90 border border-[#133242] p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Total Annual Trips</span>
                    <span className="text-xl font-black text-white">{staffAnalytics.yearTripsCount} Trips</span>
                  </div>
                  <div className="bg-[#030d12]/90 border border-[#133242] p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Career Start</span>
                    <span className="text-base font-black text-teal-300">{staffAnalytics.careerStartDate}</span>
                  </div>
                </div>
              </div>

              {/* 12 Months Annual Grid (January to December) */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#00e6a8]" />
                  <span>All 12 Months Breakdown for {staffAnalytics.targetYear}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {staffAnalytics.monthsBreakdown.map(m => {
                    const isActive = m.workedDaysCount > 0;

                    return (
                      <div
                        key={m.monthNum}
                        onClick={() => {
                          setSelectedMonthNum(m.monthNum);
                          setDetailTab('monthly');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group ${
                          m.monthNum === 8
                            ? 'bg-[#07241e] border-[#00c896] hover:shadow-[0_0_20px_rgba(0,200,150,0.3)] ring-1 ring-[#00e6a8]/50'
                            : isActive
                            ? 'bg-[#051722] border-[#14394d] hover:border-[#00c896]/70 hover:shadow-lg'
                            : 'bg-[#040e14] border-[#0d222e] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                              Month {m.monthNum}
                            </span>
                            <h5 className="text-base font-black text-white group-hover:text-[#00e6a8] transition-colors">
                              {m.monthName}
                            </h5>
                          </div>

                          {m.monthNum === 8 && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#00c896] text-zinc-950">
                              Month 8
                            </span>
                          )}
                        </div>

                        {/* Days count progress bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-400">Worked:</span>
                            <strong className={isActive ? 'text-[#00e6a8]' : 'text-zinc-500'}>
                              {m.workedDaysCount} / {m.daysInMonth} Days
                            </strong>
                          </div>

                          <div className="w-full h-2 rounded-full bg-[#081f2b] overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                m.isAllDaysWorked 
                                  ? 'bg-emerald-400' 
                                  : isActive 
                                  ? 'bg-gradient-to-r from-teal-500 to-[#00e6a8]' 
                                  : 'bg-zinc-700'
                              }`}
                              style={{ width: `${m.daysInMonth > 0 ? (m.workedDaysCount / m.daysInMonth) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Metrics summary */}
                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-[#030d12] p-1.5 rounded-xl border border-[#0f2836]">
                          <div>
                            <span className="text-zinc-500 block">Trips</span>
                            <strong className="text-white">{m.trips.length}</strong>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Pax</span>
                            <strong className="text-purple-300">{m.totalPax}</strong>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Q / C</span>
                            <strong className="text-amber-300">{m.totalQuads} / {m.totalCamels}</strong>
                          </div>
                        </div>

                        {/* Jump button */}
                        <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-[#00e6a8]">
                          <span>Inspect Calendar</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------- TAB 2: MONTHLY & 31-DAY CALENDAR ANALYSIS ----------------- */}
          {detailTab === 'monthly' && (
            <div className="space-y-6">
              
              {/* Month and Year Quick Switch Bar */}
              <div className="bg-[#05131b] border border-[#133243] p-3.5 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                
                {/* Year Selector */}
                <div className="flex items-center gap-1.5 bg-[#0a202c] border border-[#173a4b] px-3 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#00c896]" />
                  <span className="text-[10px] text-zinc-400 uppercase font-bold font-mono">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value, 10));
                      setSelectedDayFilter(null);
                    }}
                    className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
                  >
                    {staffAnalytics.recordedYears.map(yr => (
                      <option key={yr} value={yr} className="bg-[#071720] text-white">
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 12 Months Quick Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const mData = staffAnalytics.monthsBreakdown.find(item => item.monthNum === m);
                    const isMonthActive = mData && mData.workedDaysCount > 0;
                    const isSelected = selectedMonthNum === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedMonthNum(m);
                          setSelectedDayFilter(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#00c896] text-zinc-950 font-black shadow-[0_0_12px_rgba(0,200,150,0.4)]'
                            : isMonthActive
                            ? 'bg-[#081e2b] text-emerald-300 hover:bg-[#0e2c3e] border border-emerald-700/60'
                            : 'bg-[#07161f] text-zinc-500 hover:text-zinc-300 border border-[#112a38]'
                        }`}
                        title={`${MONTH_NAMES[m]}: ${mData?.workedDaysCount || 0} days worked`}
                      >
                        <span>M{m} - {MONTH_NAMES[m].substring(0, 3)}</span>
                        {isMonthActive && (
                          <span className={`text-[10px] px-1 rounded font-bold ${
                            isSelected ? 'bg-zinc-950 text-[#00e6a8]' : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {mData.workedDaysCount}d
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Month Banner with Work Details & Payment Settlement */}
              {(() => {
                const dailyRate = staff.role === 'guide'
                  ? (paymentRates?.guideDailyRate || 500)
                  : staff.role === 'mini_driver'
                  ? (paymentRates?.miniVanDriverDailyRate || 350)
                  : (paymentRates?.bigVanDriverDailyRate || 500);

                const currentMonthKey = `${String(selectedMonthNum).padStart(2, '0')}-${staffAnalytics.targetYear}`;
                const settlementId = `${staff.role === 'guide' ? 'guide' : 'driver'}_${staff.name.toLowerCase().replace(/\s+/g, '_')}_${currentMonthKey}`;
                const settlement = settledRecords[settlementId] || null;
                const isPaid = !!settlement;
                const totalMonthDH = staffAnalytics.workedDaysInSelectedMonth * dailyRate;

                return (
                  <div className="bg-[#05141d] border-2 border-teal-600/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <span className="text-xs uppercase tracking-widest text-teal-400 font-bold bg-[#030d12] px-3 py-1 rounded-full border border-teal-600/30">
                          Month {selectedMonthNum} &bull; {MONTH_NAMES[selectedMonthNum]} {staffAnalytics.targetYear}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                          {staff.name} worked <span className="text-emerald-400">{staffAnalytics.workedDaysInSelectedMonth}</span> of {staffAnalytics.totalDaysInSelectedMonth} Days in {MONTH_NAMES[selectedMonthNum]}.
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          {staffAnalytics.currentMonthData.trips.length} Total Excursions &bull; {staffAnalytics.currentMonthData.totalPax} Pax &bull; Daily Rate: <strong className="text-emerald-300">{dailyRate} DH/day</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 uppercase block font-bold">Month Payment</span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-400">
                            {totalMonthDH.toLocaleString()} <span className="text-xs font-bold">DH</span>
                          </span>
                        </div>

                        {isPaid ? (
                          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 p-2.5 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs">
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>PAID ✓</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewVoucher(settlement)}
                              className="px-2.5 py-1 rounded-xl bg-[#08202b] hover:bg-[#11384a] text-teal-300 border border-teal-500/50 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                              title="View Official Payment Voucher"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Voucher</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Revoke paid settlement for ${staff.name} (${MONTH_NAMES[selectedMonthNum]} ${staffAnalytics.targetYear})?`)) {
                                  removeSettledPaymentRecord(settlementId);
                                  refreshSettledState();
                                  showNotification(`↩ Revoked payment status for ${staff.name}`);
                                }
                              }}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg cursor-pointer"
                              title="Revoke Payment"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordPrompt({
                                periodKey: currentMonthKey,
                                periodLabel: `${MONTH_NAMES[selectedMonthNum]} ${staffAnalytics.targetYear}`,
                                amountDH: totalMonthDH,
                                daysCount: staffAnalytics.workedDaysInSelectedMonth,
                                tripsCount: staffAnalytics.currentMonthData.trips.length,
                                paxCount: staffAnalytics.currentMonthData.totalPax
                              });
                              setPasswordInput('');
                              setPasswordError(null);
                            }}
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00c896] via-teal-400 to-emerald-400 hover:from-[#00e6a8] hover:to-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,200,150,0.35)] active:scale-95 flex items-center gap-2"
                          >
                            <Wallet className="w-4 h-4" />
                            <span>Payed (Confirm Month)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 31-Day Calendar Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#00e6a8]" />
                    <span>31-Day Detailed Calendar Matrix for {MONTH_NAMES[selectedMonthNum]} {staffAnalytics.targetYear}</span>
                  </h4>
                  <span className="text-xs text-zinc-400">Click any day to filter shifts table</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {staffAnalytics.daysCalendar.map(dayItem => {
                    const isSelectedDay = selectedDayFilter === dayItem.dayNumber;

                    return (
                      <div
                        key={dayItem.dayNumber}
                        onClick={() => {
                          setSelectedDayFilter(isSelectedDay ? null : dayItem.dayNumber);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelectedDay
                            ? 'bg-[#082a20] border-[#00e6a8] ring-2 ring-[#00e6a8] shadow-lg'
                            : dayItem.isWorked
                            ? 'bg-[#071d28] border-emerald-600/50 hover:border-emerald-400'
                            : 'bg-[#040e14] border-[#0e2430] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            dayItem.isWorked 
                              ? 'bg-emerald-500 text-zinc-950 font-black' 
                              : 'bg-[#091b26] text-zinc-400'
                          }`}>
                            Day {String(dayItem.dayNumber).padStart(2, '0')}
                          </span>

                          {dayItem.isWorked ? (
                            <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              <span>{dayItem.trips.length} {dayItem.trips.length === 1 ? 'Trip' : 'Trips'}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-600 font-bold">OFF</span>
                          )}
                        </div>

                        <div className="mt-2">
                          {dayItem.isWorked ? (
                            <div className="space-y-0.5 text-[10px]">
                              <div className="text-zinc-200 font-bold flex items-center justify-between">
                                <span>Pax:</span>
                                <strong className="text-white">{dayItem.totalPax}</strong>
                              </div>
                              {(dayItem.totalQuads > 0 || dayItem.totalCamels > 0) && (
                                <div className="text-[9px] text-amber-300 font-mono flex items-center justify-between">
                                  <span>Fleet:</span>
                                  <span>{dayItem.totalQuads}Q &bull; {dayItem.totalCamels}C</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-600 italic py-1">
                              Rest Day
                            </div>
                          )}
                        </div>

                        {isSelectedDay && (
                          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#00e6a8] border-2 border-zinc-950" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedDayFilter && (
                  <div className="flex items-center justify-between bg-[#081e2b] border border-teal-600/50 p-2.5 rounded-xl text-xs font-mono">
                    <span className="text-teal-300 font-bold">
                      Filtering Day {selectedDayFilter} ({MONTH_NAMES[selectedMonthNum]} {selectedDayFilter}, {staffAnalytics.targetYear})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDayFilter(null)}
                      className="text-zinc-400 hover:text-white underline cursor-pointer font-bold"
                    >
                      Clear Day Filter (Show All {MONTH_NAMES[selectedMonthNum]} Days)
                    </button>
                  </div>
                )}
              </div>

              {/* Detailed Shift & Trips Table */}
              <div className="bg-[#05131b] border border-[#133243] rounded-3xl p-5 sm:p-6 space-y-4 font-mono">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#00e6a8]" />
                      <span>
                        {selectedDayFilter 
                          ? `Day ${selectedDayFilter} Shifts Breakdown`
                          : `All Shifts & Excursions for Month ${selectedMonthNum} (${MONTH_NAMES[selectedMonthNum]} ${staffAnalytics.targetYear})`
                        }
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Complete log of every transport and excursion shift executed by {staff.name}.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[#00e6a8] bg-[#08202d] border border-[#163a4d] px-3 py-1 rounded-xl">
                    {staffAnalytics.currentMonthData.trips.filter(t => !selectedDayFilter || t.parsedDate.day === selectedDayFilter).length} Total Shifts
                  </span>
                </div>

                {(() => {
                  const monthTripsFiltered = staffAnalytics.currentMonthData.trips.filter(t => !selectedDayFilter || t.parsedDate.day === selectedDayFilter);

                  if (monthTripsFiltered.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-zinc-500 font-mono border border-dashed border-[#133040] rounded-2xl">
                        No trips logged for this selection in Month {selectedMonthNum}.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {monthTripsFiltered.map((trip, idx) => (
                        <div
                          key={idx}
                          className="bg-[#040e14] hover:bg-[#071924] border border-[#112a38] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap transition-all group"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="bg-[#00c896]/15 text-[#00e6a8] border border-[#00c896]/40 px-2.5 py-1 rounded-xl font-black text-xs">
                              {trip.parsedDate.displayDate}
                            </span>

                            <span className="bg-[#08222f] text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                              {trip.time || '10:00'}
                            </span>

                            <span className="text-white font-bold text-xs">
                              {trip.van_type || 'Big van'}
                            </span>

                            <span className="text-zinc-400 text-xs">
                              {staff.role === 'guide' ? `Driver: ${trip.driver}` : `Guide: ${trip.guide}`}
                            </span>

                            <span className="text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-purple-400" />
                              <span>{trip.company || 'AGM'}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 text-xs">
                            <span className="bg-[#081e2b] text-teal-300 border border-[#153a4c] px-2.5 py-1 rounded-lg">
                              Pax: <strong className="text-white">{trip.pax}</strong>
                            </span>
                            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                              Quads: <strong>{trip.quads}</strong>
                            </span>
                            <span className="bg-yellow-950/60 text-[#DFB750] border border-yellow-800/60 px-2.5 py-1 rounded-lg">
                              Camels: <strong>{trip.camels}</strong>
                            </span>

                            {onSelectTripDate && (
                              <button
                                type="button"
                                onClick={() => onSelectTripDate(trip.date)}
                                className="p-1.5 rounded-lg bg-[#0a2330] hover:bg-[#00c896] text-zinc-400 hover:text-zinc-950 transition-all cursor-pointer"
                                title="Open this day in main Worksheet"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* ----------------- TAB 3: ALL HISTORICAL TRIPS LOG ----------------- */}
          {detailTab === 'all_trips' && (
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <List className="w-4 h-4 text-[#00e6a8]" />
                  <span>Lifetime Excursions Log ({staffAnalytics.allTrips.length} Total Trips)</span>
                </h4>

                <span className="text-xs text-zinc-400">
                  Chronological history from start date {staffAnalytics.careerStartDate} to present.
                </span>
              </div>

              <div className="space-y-2">
                {staffAnalytics.allTrips.map((trip, idx) => (
                  <div
                    key={idx}
                    className="bg-[#05131b] hover:bg-[#081e2b] border border-[#122e3e] hover:border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap transition-all"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[#00e6a8] font-bold text-xs bg-[#09222e] px-2.5 py-1 rounded-lg">
                        {trip.parsedDate.displayDate}
                      </span>
                      <span className="text-white font-bold text-xs">{trip.time || '10:00'}</span>
                      <span className="text-zinc-300 text-xs">{trip.van_type || 'Big van'}</span>
                      <span className="text-zinc-400 text-xs">
                        {staff.role === 'guide' ? `Driver: ${trip.driver}` : `Guide: ${trip.guide}`}
                      </span>
                      <span className="text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                        {trip.company || 'AGM'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-300">Pax: <strong className="text-white">{trip.pax}</strong></span>
                      <span className="text-amber-400 font-bold">Quads: {trip.quads}</span>
                      <span className="text-[#DFB750] font-bold">Camels: {trip.camels}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------- TAB 4: FLEET (QUADS & CAMELS) ----------------- */}
          {detailTab === 'fleet' && (
            <div className="space-y-6 font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Quads Card */}
                <div className="bg-[#05131b] border-2 border-amber-600/40 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-600 flex items-center justify-center">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white uppercase">Quads Handled</h4>
                        <span className="text-xs text-zinc-400">Total Quads in Career</span>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-amber-400">{staff.totalQuads} Q</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#13303f]">
                    <span className="text-[11px] text-zinc-400 uppercase font-bold block">Quads Excursions</span>
                    {staffAnalytics.allTrips.filter(t => (parseInt(t.quads) || 0) > 0).map((trip, idx) => (
                      <div key={idx} className="bg-[#040e14] p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-white font-bold">{trip.parsedDate.displayDate} &bull; {trip.time}</span>
                        <span className="text-amber-400 font-black">{trip.quads} Quads</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Camels Card */}
                <div className="bg-[#05131b] border-2 border-yellow-600/40 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-950 text-[#DFB750] border border-yellow-600 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white uppercase">Camels Handled</h4>
                        <span className="text-xs text-zinc-400">Total Camels in Career</span>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-[#DFB750]">{staff.totalCamels} C</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#13303f]">
                    <span className="text-[11px] text-zinc-400 uppercase font-bold block">Camels Caravans</span>
                    {staffAnalytics.allTrips.filter(t => (parseInt(t.camels) || 0) > 0).map((trip, idx) => (
                      <div key={idx} className="bg-[#040e14] p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-white font-bold">{trip.parsedDate.displayDate} &bull; {trip.time}</span>
                        <span className="text-[#DFB750] font-black">{trip.camels} Camels</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= FULL PAGE FOOTER ================= */}
      <div className="bg-[#040d12] border-t border-[#143242] px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 flex items-center justify-between shrink-0 font-mono text-xs shadow-md">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3">
          <span className="text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e6a8]" />
            <span>AGM Operations Management &bull; Staff Executive Analytics</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="bg-[#0c222e] hover:bg-[#00c896] text-white hover:text-zinc-950 px-6 py-2 rounded-xl border border-[#194357] transition-all cursor-pointer font-bold flex items-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Staff Directory</span>
          </button>
        </div>
      </div>

      {/* ================= PASSWORD CONFIRMATION DIALOG FOR "PAYED" ================= */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09151a] border-2 border-[#00c896]/50 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_60px_rgba(0,200,150,0.25)] space-y-5 font-mono text-left animate-fadeIn">
            
            <div className="flex items-center gap-3.5 border-b border-[#143240] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/50 text-[#00e6a8] flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Manager Payment Authorization
                </h3>
                <p className="text-xs text-teal-300/80">
                  Confirm payout to {staff.name} for {showPasswordPrompt.periodLabel}
                </p>
              </div>
            </div>

            <div className="bg-[#050f14] border border-[#132d3a] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Staff Member:</span>
                <strong className="text-white font-black uppercase text-sm">{staff.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Period:</span>
                <span className="text-teal-300 font-bold uppercase">{showPasswordPrompt.periodLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Worked Days &amp; Shifts:</span>
                <span className="text-zinc-200 font-bold">
                  {showPasswordPrompt.daysCount} Days &bull; {showPasswordPrompt.tripsCount} Shifts ({showPasswordPrompt.paxCount} Pax)
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#122b37] pt-2">
                <span className="text-zinc-400 font-bold">Total Payment:</span>
                <strong className="text-emerald-400 font-black text-base">
                  {showPasswordPrompt.amountDH.toLocaleString()} DH
                </strong>
              </div>
            </div>

            {passwordError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
                {passwordError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!verifyManagerPassword(passwordInput, managersList)) {
                  setPasswordError('Invalid manager password! Accepted: agm, agmtravelagm, 1234, admin, ismail');
                  return;
                }

                const currentMgrName = currentManager ? `${currentManager.name} ${currentManager.lastname}` : 'Manager Abdelilah';
                const settlementId = `${staff.role === 'guide' ? 'guide' : 'driver'}_${staff.name.toLowerCase().replace(/\s+/g, '_')}_${showPasswordPrompt.periodKey}`;

                const record: SettledPaymentRecord = {
                  id: settlementId,
                  entityType: staff.role === 'guide' ? 'guide' : 'driver',
                  entityId: staff.id,
                  entityName: staff.name,
                  periodType: 'month',
                  periodKey: showPasswordPrompt.periodKey,
                  amountDH: showPasswordPrompt.amountDH,
                  daysCount: showPasswordPrompt.daysCount,
                  tripsCount: showPasswordPrompt.tripsCount,
                  isPaid: true,
                  paidAt: new Date().toISOString(),
                  paidByManager: currentMgrName,
                  paymentMethod: selectedPaymentMethod,
                  notes: `Settled ${showPasswordPrompt.daysCount} worked days for ${showPasswordPrompt.periodLabel}`
                };

                saveSettledPaymentRecord(record);
                refreshSettledState();
                setShowPasswordPrompt(null);
                showNotification(`💰 Payment of ${showPasswordPrompt.amountDH.toLocaleString()} DH settled for ${staff.name}!`);
              }}
              className="space-y-4 text-xs"
            >
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
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(null)}
                  className="flex-1 py-3 rounded-xl bg-[#091a22] hover:bg-[#112d3b] text-zinc-300 font-bold border border-[#173847] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,200,150,0.4)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize &amp; Settle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL PAYMENT VOUCHER MODAL ================= */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08151c] border-2 border-teal-500/50 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 font-mono text-left animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-[#143240] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">AGM Travel Official Payment Voucher</h3>
                  <p className="text-[10px] text-teal-400 font-mono">VOUCHER ID: {viewVoucher.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewVoucher(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#040c10] border border-[#122834] rounded-2xl p-5 space-y-3 text-xs leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Beneficiary:</span>
                <strong className="text-white uppercase font-black">{viewVoucher.entityName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Category &bull; Period:</span>
                <span className="text-teal-300 font-bold uppercase">{viewVoucher.entityType} &bull; {viewVoucher.periodKey}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Days / Shifts:</span>
                <span className="text-zinc-200 font-bold">{viewVoucher.daysCount || 0} Days &bull; {viewVoucher.tripsCount || 0} Shifts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Payment Method:</span>
                <span className="text-white font-bold">{viewVoucher.paymentMethod || 'Cash'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Authorized By:</span>
                <span className="text-[#00e6a8] font-bold">{viewVoucher.paidByManager || 'Manager'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Timestamp:</span>
                <span className="text-zinc-300">{viewVoucher.paidAt ? new Date(viewVoucher.paidAt).toLocaleString() : 'Confirmed'}</span>
              </div>
              <div className="border-t border-[#122834] pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-300">Total Settled Amount:</span>
                <strong className="text-xl font-black text-emerald-400">
                  {viewVoucher.amountDH.toLocaleString()} DH
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
                onClick={() => setViewVoucher(null)}
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

// Month Names array list for dropdown
const MONTH_NAMES_LIST = [
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

// ================= PRIMARY EXPORTED STAFF & ACCOUNTS VIEW COMPONENT =================
export const StaffProfilesView: React.FC<StaffProfilesViewProps> = ({
  isOpen,
  onClose,
  results,
  staffProfiles,
  registeredGuides = [],
  registeredDrivers = [],
  managersList = [],
  paymentRates = DEFAULT_PAYMENT_RATES,
  currentManager,
  onSelectTripDate,
  showNotification,
  initialTab = 'profiles'
}) => {
  // Top Hub Tab: Staff Profiles vs Accounts Ledger vs Company Transports vs Paid & Settlements
  const [hubTab, setHubTab] = useState<'profiles' | 'accounts' | 'companies' | 'settlements'>(initialTab);

  const [activeTab, setActiveTab] = useState<
    'all' | 'guides' | 'big_drivers' | 'mini_drivers' | 'inactive'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [inactiveMap, setInactiveMap] = useState<Record<string, StaffStatusInfo>>(() => getInactiveStaffMap());
  const [staffToDelete, setStaffToDelete] = useState<StaffProfile | null>(null);
  const [showCleanInactiveModal, setShowCleanInactiveModal] = useState<boolean>(false);

  // Extract recorded years from trip results
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

  // Sync inactive map on open
  React.useEffect(() => {
    if (isOpen) {
      setInactiveMap(getInactiveStaffMap());
    }
  }, [isOpen]);

  const handleDeleteStaff = (profile: StaffProfile) => {
    setStaffToDelete(profile);
  };

  const handleConfirmDelete = () => {
    if (!staffToDelete) return;
    const isCurrentlyInactive = isStaffInactive(staffToDelete.name, inactiveMap) || (staffToDelete.id ? isStaffInactive(staffToDelete.id, inactiveMap) : false);
    
    if (isCurrentlyInactive) {
      // If already inactive, let's allow re-activating or removing
      markStaffInactiveStatus(staffToDelete.name, false);
      if (staffToDelete.id) {
        markStaffInactiveStatus(staffToDelete.id, false);
      }
      setInactiveMap(getInactiveStaffMap());
      showNotification(`Re-activated [${staffToDelete.name}] back to active staff roster`);
    } else {
      markStaffInactiveStatus(staffToDelete.name, true, 'Removed by Manager');
      if (staffToDelete.id) {
        markStaffInactiveStatus(staffToDelete.id, true, 'Removed by Manager');
      }
      setInactiveMap(getInactiveStaffMap());
      showNotification(`Removed profile for ${staffToDelete.name}. Past trips and fleet records remain preserved`);
    }
    setStaffToDelete(null);
  };

  const handleToggleReactivate = (profile: StaffProfile) => {
    markStaffInactiveStatus(profile.name, false);
    if (profile.id) {
      markStaffInactiveStatus(profile.id, false);
    }
    setInactiveMap(getInactiveStaffMap());
    showNotification(`Re-activated [${profile.name}] back to active staff`);
  };

  const handleCleanAllInactive = () => {
    clearAllInactiveStaff();
    setInactiveMap({});
    showNotification('Cleaned and removed all inactive staff records');
    setShowCleanInactiveModal(false);
    setActiveTab('all');
  };

  // Performance Guard: if !isOpen, do not run heavy calculations
  const systemMetrics = useMemo(() => {
    if (!isOpen) {
      return {
        totalStaff: 0,
        activeStaffCount: 0,
        inactiveCount: 0,
        guidesCount: 0,
        bigDriversCount: 0,
        miniDriversCount: 0,
        totalDrivers: 0,
        totalQuads: 0,
        totalCamels: 0,
        totalPax: 0,
        totalQuadsExtras: 0,
        totalCamelsExtras: 0,
        totalExtras: 0,
        quadTripsCount: 0,
        camelTripsCount: 0,
        totalDays: 0,
        totalTrips: 0
      };
    }

    let totalQuads = 0;
    let totalCamels = 0;
    let totalPax = 0;
    let totalQuadsExtras = 0;
    let totalCamelsExtras = 0;
    let quadTripsCount = 0;
    let camelTripsCount = 0;
    const uniqueDates = new Set<string>();

    results.forEach(r => {
      const q = parseInt(r.quads) || 0;
      const c = parseInt(r.camels) || 0;
      const p = parseInt(r.pax) || 0;

      totalQuads += q;
      totalCamels += c;
      totalPax += p;

      if (r.quad_extra && r.quad_extra !== 'None' && r.quad_extra !== '0') {
        const num = parseInt(r.quad_extra.replace(/[^0-9]/g, ''), 10);
        totalQuadsExtras += isNaN(num) ? 1 : num;
      }
      if (r.camel_extra && r.camel_extra !== 'None' && r.camel_extra !== '0') {
        const num = parseInt(r.camel_extra.replace(/[^0-9]/g, ''), 10);
        totalCamelsExtras += isNaN(num) ? 1 : num;
      }

      if (q > 0) quadTripsCount++;
      if (c > 0) camelTripsCount++;
      if (r.date) uniqueDates.add(r.date.trim());
    });

    let inactiveCount = 0;
    let activeGuidesCount = 0;
    let activeBigDriversCount = 0;
    let activeMiniDriversCount = 0;

    staffProfiles.forEach(p => {
      const inact = isStaffInactive(p.name, inactiveMap) || (p.id ? isStaffInactive(p.id, inactiveMap) : false);
      if (inact) {
        inactiveCount++;
      } else {
        if (p.role === 'guide') activeGuidesCount++;
        else if (p.role === 'big_driver') activeBigDriversCount++;
        else if (p.role === 'mini_driver') activeMiniDriversCount++;
      }
    });

    const activeStaffCount = staffProfiles.length - inactiveCount;

    return {
      totalStaff: staffProfiles.length,
      activeStaffCount,
      inactiveCount,
      guidesCount: activeGuidesCount,
      bigDriversCount: activeBigDriversCount,
      miniDriversCount: activeMiniDriversCount,
      totalDrivers: activeBigDriversCount + activeMiniDriversCount,
      totalQuads,
      totalCamels,
      totalPax,
      totalQuadsExtras,
      totalCamelsExtras,
      totalExtras: totalQuadsExtras + totalCamelsExtras,
      quadTripsCount,
      camelTripsCount,
      totalDays: uniqueDates.size,
      totalTrips: results.length
    };
  }, [isOpen, results, staffProfiles, inactiveMap]);

  // Fast Filtered Staff Profiles
  const filteredProfiles = useMemo(() => {
    if (!isOpen) return [];

    const q = searchQuery.toLowerCase().trim();

    return staffProfiles.filter(p => {
      const isInactiveProfile = isStaffInactive(p.name, inactiveMap) || (p.id ? isStaffInactive(p.id, inactiveMap) : false);

      // Tab filtering
      if (activeTab === 'inactive') {
        if (!isInactiveProfile) return false;
      } else {
        // If not searching, other tabs filter out inactive profiles unless user is searching
        if (!q && isInactiveProfile) return false;
        
        if (activeTab === 'guides' && p.role !== 'guide') return false;
        if (activeTab === 'big_drivers' && p.role !== 'big_driver') return false;
        if (activeTab === 'mini_drivers' && p.role !== 'mini_driver') return false;
      }

      // Search query filtering
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const roleMatch = p.role.toLowerCase().includes(q);
        const companyMatch = (p.companyName || '').toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !companyMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [isOpen, staffProfiles, activeTab, searchQuery, inactiveMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#03090d] text-white flex flex-col overflow-hidden font-sans select-none animate-fadeIn">
      
      {/* ================= 1. TOP EXECUTIVE HEADER ================= */}
      <header className="w-full bg-[#07131a]/95 border-b border-[#142e3b] px-4 sm:px-6 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-4 z-20 shrink-0 backdrop-blur-md">
        
        {/* Left: Square Back Button & Title */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Square Return Back Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#081822] hover:bg-[#00c896] text-zinc-300 hover:text-zinc-950 border border-[#163848] hover:border-[#00c896] flex items-center justify-center transition-all cursor-pointer shadow-sm group shrink-0"
              title="Return to Workstation"
            >
              <ArrowLeft className="w-4 h-4 text-[#00e6a8] group-hover:text-zinc-950 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00c896]/20 to-[#00e6a8]/10 border border-[#00c896]/40 flex items-center justify-center text-[#00e6a8] shrink-0 font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                  Staff &amp; Accounts
                </h1>
                <span className="bg-[#00c896]/15 text-[#00e6a8] border border-[#00c896]/40 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e6a8] animate-pulse" />
                  <span>{systemMetrics.totalStaff} Team Profiles</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">
                Operations roster, accounts ledger, fleet management &amp; settlements
              </p>
            </div>
          </div>
        </div>

        {/* Right Tools: Universal Search Bar (in front of the title) & Square View Mode Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap ml-auto">
          {/* Universal Search Bar */}
          <div className="relative w-44 sm:w-64 md:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                hubTab === 'profiles' 
                  ? 'Search staff, role...' 
                  : hubTab === 'companies'
                  ? 'Search transport company...'
                  : hubTab === 'settlements'
                  ? 'Search voucher, beneficiary...'
                  : 'Search staff, partner, voucher...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#081822] border border-[#163848] hover:border-[#22556b] focus:border-[#00e6a8] rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Square Grid / List View Toggle */}
          {hubTab === 'profiles' && (
            <div className="flex items-center gap-1 bg-[#06141c] border border-[#143343] p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-[#00c896] text-zinc-950 shadow-sm font-bold' 
                    : 'text-zinc-400 hover:text-white hover:bg-[#0a1e28]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-[#00c896] text-zinc-950 shadow-sm font-bold' 
                    : 'text-zinc-400 hover:text-white hover:bg-[#0a1e28]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= 2. SUB-HEADER HUB NAVIGATION BAR (UNDER HEADER) ================= */}
      <div className="w-full bg-[#051117] border-b border-[#122b37] px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5 shrink-0 backdrop-blur-md">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          
          {/* 4 Professional Hub Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#081923] border border-[#163848] p-1 rounded-2xl shadow-inner flex-wrap font-mono text-xs max-w-full">
            <button
              type="button"
              onClick={() => setHubTab('profiles')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-2 whitespace-nowrap ${
                hubTab === 'profiles'
                  ? 'bg-gradient-to-r from-[#00c896] to-[#00e6a8] text-zinc-950 font-black shadow-[0_0_15px_rgba(0,200,150,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c232f]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Profiles ({systemMetrics.totalStaff})</span>
            </button>

            <button
              type="button"
              onClick={() => setHubTab('accounts')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-2 whitespace-nowrap ${
                hubTab === 'accounts'
                  ? 'bg-gradient-to-r from-[#00c896] to-[#00e6a8] text-zinc-950 font-black shadow-[0_0_15px_rgba(0,200,150,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c232f]'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Accounts &amp; Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setHubTab('companies')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-2 whitespace-nowrap ${
                hubTab === 'companies'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
              }`}
            >
              <Bus className="w-4 h-4 text-purple-400" />
              <span>Company Transports</span>
            </button>

            <button
              type="button"
              onClick={() => setHubTab('settlements')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-2 whitespace-nowrap ${
                hubTab === 'settlements'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-black shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                  : 'text-teal-300 hover:text-white hover:bg-teal-950/40'
              }`}
            >
              <Wallet className="w-4 h-4 text-teal-400" />
              <span>Paid &amp; Settlements</span>
            </button>
          </div>

          {/* Right: Year and Month Filter (In front of Staff Profiles & Accounts Ledger tabs) */}
          <div className="flex items-center gap-2.5 font-mono text-xs ml-auto">
            {/* Year Dropdown */}
            <div className="flex items-center bg-[#081923] border border-[#163848] rounded-xl px-2.5 py-1 text-zinc-300 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-[#00c896] mr-1.5" />
              <span className="text-[10px] text-zinc-400 uppercase mr-1 font-bold">Year:</span>
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

            {/* Month Dropdown */}
            <div className="flex items-center bg-[#081923] border border-[#163848] rounded-xl px-2.5 py-1 text-zinc-300 shadow-inner">
              <CalendarDays className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
              <span className="text-[10px] text-zinc-400 uppercase mr-1 font-bold">Month:</span>
              <select
                value={selectedMonthNum}
                onChange={(e) => setSelectedMonthNum(parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              >
                {MONTH_NAMES_LIST.map((name, idx) => (
                  <option key={idx} value={idx} className="bg-[#071720] text-white">
                    {idx === 0 ? 'All Months (Full Year)' : `M${idx} - ${name}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. BODY CONTENT (CONDITIONAL ON HUB TAB) ================= */}
      {hubTab !== 'profiles' ? (
        <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
          <AccountsView
            embeddedMode={true}
            results={results}
            staffProfiles={staffProfiles}
            registeredGuides={registeredGuides}
            registeredDrivers={registeredDrivers}
            managersList={managersList}
            paymentRates={paymentRates}
            currentManager={currentManager}
            showNotification={showNotification}
            onSelectTripDate={onSelectTripDate}
            initialCategory={hubTab === 'companies' ? 'companies' : hubTab === 'settlements' ? 'settlements' : 'all'}
            externalYear={selectedYear}
            onYearChange={setSelectedYear}
            externalMonthNum={selectedMonthNum}
            onMonthChange={setSelectedMonthNum}
            externalSearchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      ) : (
        <>
          {/* ================= 4. NAVIGATION CATEGORY FILTER BAR (STAFF CATEGORIES) ================= */}
          <div className="bg-[#07151c] border-b border-[#132c38] px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5 shrink-0">
            <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-6 flex-wrap">
              
              {/* Left: Staff Categories Tabs (All Active, Tour Guides, Big Drivers, Mini Drivers, Inactive / Departed) */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tab: All Active Staff */}
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-[#00c896] text-zinc-950 font-black shadow-[0_0_12px_rgba(0,200,150,0.4)]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Active ({systemMetrics.activeStaffCount})</span>
                </button>

                {/* Tab: Tour Guides */}
                <button
                  type="button"
                  onClick={() => setActiveTab('guides')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'guides'
                      ? 'bg-emerald-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Tour Guides ({systemMetrics.guidesCount})</span>
                </button>

                {/* Tab: Big Van Drivers */}
                <button
                  type="button"
                  onClick={() => setActiveTab('big_drivers')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'big_drivers'
                      ? 'bg-cyan-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                  }`}
                >
                  <span>Big Van Drivers ({systemMetrics.bigDriversCount})</span>
                </button>

                {/* Tab: Mini Van Drivers */}
                <button
                  type="button"
                  onClick={() => setActiveTab('mini_drivers')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'mini_drivers'
                      ? 'bg-purple-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(192,132,252,0.4)]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#0c222e]'
                  }`}
                >
                  <span>Mini Van Drivers ({systemMetrics.miniDriversCount})</span>
                </button>

                {/* Tab: Removed / Inactive Staff */}
                <button
                  type="button"
                  onClick={() => setActiveTab('inactive')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'inactive'
                      ? 'bg-rose-500 text-white font-black shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : systemMetrics.inactiveCount > 0
                      ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#0c222e]'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Removed / Inactive ({systemMetrics.inactiveCount})</span>
                </button>
              </div>

              {/* Clean Inactive Button if there are inactive staff */}
              {systemMetrics.inactiveCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCleanInactiveModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black font-mono bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/70 hover:border-rose-500 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-md active:scale-95 uppercase tracking-wider ml-auto"
                  title="Clean all Removed / Departed marks from roster"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clean Inactive ({systemMetrics.inactiveCount})</span>
                </button>
              )}

            </div>
          </div>

      {/* ================= 4. MAIN STAFF CARDS GRID & CONTENT (NO SCROLLBAR) ================= */}
      <main className="flex-grow overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4">
        <div className="w-full max-w-[1920px] mx-auto space-y-4">

          {/* Inactive Tab Notice & Clean Banner */}
          {activeTab === 'inactive' && systemMetrics.inactiveCount > 0 && (
            <div className="bg-[#140a0e]/95 border border-rose-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg font-mono">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-600/50 flex items-center justify-center text-rose-400 font-bold shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Removed / Inactive Staff Roster</span>
                    <span className="bg-rose-950 text-rose-300 border border-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {systemMetrics.inactiveCount} Members
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Staff marked as removed by the manager. <strong>All data details, trip histories, days worked, and performance metrics are preserved.</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCleanInactiveModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clean All Inactive Marks</span>
              </button>
            </div>
          )}

          {filteredProfiles.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#091b24] border border-[#163a4b] text-zinc-500 flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No staff profiles found</h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {searchQuery ? `No results matching "${searchQuery}"` : 'No staff profiles recorded under this category yet.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-mono bg-[#0e2733] hover:bg-[#143545] text-[#00e6a8] border border-[#1a475d] px-4 py-2 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            
            /* ================= 4-COLUMN RESPONSIVE FAST GRID ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredProfiles.map((profile) => {
                const inact = isStaffInactive(profile.name, inactiveMap) || (profile.id ? isStaffInactive(profile.id, inactiveMap) : false);
                return (
                  <StaffCard
                    key={profile.id}
                    profile={profile}
                    onOpen={setSelectedStaff}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                    showNotification={showNotification}
                    isInactive={inact}
                    onDeleteClick={handleDeleteStaff}
                    onToggleActive={handleToggleReactivate}
                  />
                );
              })}
            </div>
          ) : (
            
            /* ================= TABULAR / LIST VIEW ================= */
            <div className="bg-[#081821] border border-[#143444] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#051117] text-zinc-400 uppercase text-[10px] border-b border-[#143444]">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Latest Shift</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4 text-center">Days Worked</th>
                      <th className="py-3 px-4 text-center">Trips</th>
                      <th className="py-3 px-4 text-center">Quads Handled</th>
                      <th className="py-3 px-4 text-center">Camels Handled</th>
                      <th className="py-3 px-4 text-center">Total Pax</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102936]">
                    {filteredProfiles.map((profile) => {
                      const inact = isStaffInactive(profile.name, inactiveMap) || (profile.id ? isStaffInactive(profile.id, inactiveMap) : false);
                      return (
                        <StaffRow
                          key={profile.id}
                          profile={profile}
                          onOpen={setSelectedStaff}
                          isInactive={inact}
                          onDeleteClick={handleDeleteStaff}
                          onToggleActive={handleToggleReactivate}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
      </>
      )}

      {/* ================= 5. FULL-PAGE COMPREHENSIVE STAFF PROFILE DETAILS MODAL ================= */}
      {selectedStaff && (
        <StaffDetailModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onSelectTripDate={onSelectTripDate}
          showNotification={showNotification}
          isInactive={isStaffInactive(selectedStaff.name, inactiveMap) || (selectedStaff.id ? isStaffInactive(selectedStaff.id, inactiveMap) : false)}
          onDeleteClick={handleDeleteStaff}
          onToggleActive={handleToggleReactivate}
          paymentRates={paymentRates}
          currentManager={currentManager}
          managersList={managersList}
        />
      )}

      {/* ================= 6. DEDICATED DELETE / INACTIVE CONFIRMATION MODAL ("ARE YOU SURE") ================= */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#08151c] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-left animate-fadeIn">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Manager: Remove Staff Profile
                </h3>
                <p className="text-xs text-rose-300">
                  {isStaffInactive(staffToDelete.name, inactiveMap) || (staffToDelete.id ? isStaffInactive(staffToDelete.id, inactiveMap) : false)
                    ? 'Re-activate staff member back to active roster'
                    : `Remove ${staffToDelete.name}'s profile from active roster?`}
                </p>
              </div>
            </div>

            <div className="bg-[#040a0d] border border-[#142631] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Staff Name:</span>
                <strong className="text-white font-black text-sm uppercase">{staffToDelete.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Role:</span>
                <span className="bg-[#06141c] border border-[#16394a] text-zinc-300 text-xs font-bold px-2 py-0.5 rounded uppercase">
                  {getRoleLabel(staffToDelete.role)}
                </span>
              </div>
              
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-[11px] leading-tight space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Profile Removal &bull; Full Data Preserved</span>
                </p>
                <p className="text-[10px] text-zinc-300">
                  Only this staff member's profile card is removed from the active roster. <strong>All historical trip data, Excel table records, Camels & Quads fleet activity, and logged names remain 100% in the database.</strong>
                </p>
              </div>

              {/* Data Safety Protection Guarantee */}
              <div className="p-2.5 bg-[#05141d] border border-cyan-500/40 rounded-xl flex items-center gap-2 text-cyan-300 text-[11px] leading-tight">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Data Protection Guarantee:</strong> Trip records in Daily Logged, Excel sheets, and Camel/Quad fleet counts are <u>NOT</u> deleted. Data is only removed if deleted directly from Daily Logged.
                </span>
              </div>

              <p className="text-[10px] text-zinc-400 pt-1 border-t border-[#142631] flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Complete statistics, excursion logs, and days worked remain 100% safely accessible.</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2.5 bg-[#0d222b] hover:bg-[#153442] text-zinc-300 text-xs font-bold rounded-xl border border-[#1b3a4a] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isStaffInactive(staffToDelete.name, inactiveMap) || (staffToDelete.id ? isStaffInactive(staffToDelete.id, inactiveMap) : false)
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 text-zinc-950 font-black'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/50'
                }`}
              >
                {isStaffInactive(staffToDelete.name, inactiveMap) || (staffToDelete.id ? isStaffInactive(staffToDelete.id, inactiveMap) : false) ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-activate Staff</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Remove Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. CLEAN INACTIVE / DEPARTED CONFIRMATION MODAL ================= */}
      {showCleanInactiveModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c141a] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-left animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Clean Inactive / Departed
                </h3>
                <p className="text-xs text-rose-300">
                  Remove all {systemMetrics.inactiveCount} departed staff marks
                </p>
              </div>
            </div>

            <div className="bg-[#040a0d] border border-[#142631] rounded-2xl p-4 space-y-2.5 text-xs text-zinc-300">
              <p className="text-zinc-200 font-bold">
                Are you sure you want to clean the Inactive / Departed staff list?
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                This will clear all {systemMetrics.inactiveCount} inactive/departed status records and clean your staff roster back to normal active status.
              </p>
              <div className="p-2.5 bg-[#05141d] border border-cyan-500/40 rounded-xl flex items-center gap-2 text-cyan-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Historical trip logs, past earnings, and stats remain 100% safe.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanInactiveModal(false)}
                className="px-4 py-2.5 bg-[#0d222b] hover:bg-[#153442] text-zinc-300 text-xs font-bold rounded-xl border border-[#1b3a4a] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanAllInactive}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Clean Inactive List</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
