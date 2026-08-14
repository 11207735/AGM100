import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Users,
  Coins,
  Shield,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  ClipboardList,
  Bike,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  Edit2,
  Save,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  Building2,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  Sparkles,
  Info,
  HelpCircle,
  Eye,
  EyeOff,
  Bus,
  Car,
  Plus,
  Trash2,
  Check,
  FolderUp,
  FolderSync,
  Download,
  HardDrive,
  QrCode,
  DollarSign,
  Wallet
} from 'lucide-react';
import { ManagerData } from './AutoPyneIntro';
import { PaymentRates, CustomCompanyRate, DEFAULT_PAYMENT_RATES, savePaymentRatesToStorage } from './PaymentsDetailsModal';

interface ManagerStats {
  daysWorked: number;
  totalTrips: number;
  totalPax: number;
  totalQuads: number;
  totalCamels: number;
  uniqueDates: string[];
  datesMap: Record<string, { count: number; pax: number; quads: number; camels: number }>;
}

interface ManagerProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentManager: ManagerData | null;
  managersList: ManagerData[];
  paymentRates: PaymentRates;
  managerStats: ManagerStats;
  onSaveManager: (updated: ManagerData) => void;
  onSelectManager: (mgr: ManagerData) => void;
  onOpenPaymentsDetails: () => void;
  onSaveRates?: (newRates: PaymentRates) => void;
  onOpenStaffModal: () => void;
  onOpenAdminLogin: () => void;
  onOpenAddManager: () => void;
  onOpenIdManager?: () => void;
  onOpenDragFolder?: () => void;
  onOpenAccounts?: () => void;
  showNotification: (msg: string) => void;
}

export const ManagerProfileView: React.FC<ManagerProfileViewProps> = ({
  isOpen,
  onClose,
  currentManager,
  managersList,
  paymentRates,
  managerStats,
  onSaveManager,
  onSelectManager,
  onOpenPaymentsDetails,
  onSaveRates,
  onOpenStaffModal,
  onOpenAdminLogin,
  onOpenAddManager,
  onOpenIdManager,
  onOpenDragFolder,
  onOpenAccounts,
  showNotification
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manage_payments' | 'days_history' | 'all_managers'>('overview');
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(currentManager?.name || 'Abdelilah');
  const [editLastname, setEditLastname] = useState<string>(currentManager?.lastname || 'Amzil');
  const [editSchoolLevel, setEditSchoolLevel] = useState<string>(currentManager?.schoolLevel || 'Master Software Engineering & Higher Education');
  const [editSkill, setEditSkill] = useState<string>(currentManager?.skill || 'Software Developer & Lead Operations Manager');
  const [editStartedFrom, setEditStartedFrom] = useState<string>(currentManager?.startedFrom || currentManager?.startDate || '15-03-2022');
  const [editEmail, setEditEmail] = useState<string>(currentManager?.email || 'abdelilahojana5@gmail.com');
  const [editPhone, setEditPhone] = useState<string>(currentManager?.phone || '+212 600-000000');
  const [editLocation, setEditLocation] = useState<string>(currentManager?.location || 'Marrakech Operations Center & AGM Central Desk');
  const [editEmployeeId, setEditEmployeeId] = useState<string>(currentManager?.employeeId || 'AGM-MGR-001');
  const [editShift, setEditShift] = useState<string>(currentManager?.shift || 'Morning & Day Operations (07:00 - 19:00)');
  const [editStatus, setEditStatus] = useState<string>(currentManager?.status || 'Active Lead Manager');

  // Direct Daily Rates & Tariffs Editing State
  const [guideRate, setGuideRate] = useState<number>(paymentRates.guideDailyRate);
  const [bigDriverRate, setBigDriverRate] = useState<number>(paymentRates.bigVanDriverDailyRate);
  const [miniDriverRate, setMiniDriverRate] = useState<number>(paymentRates.miniVanDriverDailyRate);
  const [companyBigRate, setCompanyBigRate] = useState<number>(paymentRates.defaultCompanyBigVanRate);
  const [companyMiniRate, setCompanyMiniRate] = useState<number>(paymentRates.defaultCompanyMiniVanRate);
  const [quadRate, setQuadRate] = useState<number>(paymentRates.quadUnitRate ?? DEFAULT_PAYMENT_RATES.quadUnitRate);
  const [camelRate, setCamelRate] = useState<number>(paymentRates.camelUnitRate ?? DEFAULT_PAYMENT_RATES.camelUnitRate);
  const [companyRatesList, setCompanyRatesList] = useState<CustomCompanyRate[]>(paymentRates.customCompanyRates || []);

  // Custom Company Square Management Modal
  const [showAddCompanyModal, setShowAddCompanyModal] = useState<boolean>(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState<string>('');
  const [companyBigRateInput, setCompanyBigRateInput] = useState<number>(700);
  const [companyMiniRateInput, setCompanyMiniRateInput] = useState<number>(500);
  const [companyNotesInput, setCompanyNotesInput] = useState<string>('');

  // Password / PIN Gate for Payments Management
  const [isPaymentUnlocked, setIsPaymentUnlocked] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [customPin, setCustomPin] = useState<string>(() => {
    return currentManager?.paymentPin || localStorage.getItem('agm_manager_payment_pin') || '1234';
  });

  // Handle Saving Daily Rates and Tariffs Directly on the Page
  const handleSaveDailyRates = () => {
    const updatedRates: PaymentRates = {
      guideDailyRate: Number(guideRate) || 100,
      bigVanDriverDailyRate: Number(bigDriverRate) || 100,
      miniVanDriverDailyRate: Number(miniDriverRate) || 75,
      defaultCompanyBigVanRate: Number(companyBigRate) || 700,
      defaultCompanyMiniVanRate: Number(companyMiniRate) || 500,
      quadUnitRate: Number(quadRate) || 150,
      camelUnitRate: Number(camelRate) || 100,
      customCompanyRates: companyRatesList
    };

    savePaymentRatesToStorage(updatedRates);
    if (onSaveRates) {
      onSaveRates(updatedRates);
    }
    showNotification('Daily rates and tariffs saved successfully');
  };

  const handleResetDailyRates = () => {
    setGuideRate(DEFAULT_PAYMENT_RATES.guideDailyRate);
    setBigDriverRate(DEFAULT_PAYMENT_RATES.bigVanDriverDailyRate);
    setMiniDriverRate(DEFAULT_PAYMENT_RATES.miniVanDriverDailyRate);
    setCompanyBigRate(DEFAULT_PAYMENT_RATES.defaultCompanyBigVanRate);
    setCompanyMiniRate(DEFAULT_PAYMENT_RATES.defaultCompanyMiniVanRate);
    setQuadRate(DEFAULT_PAYMENT_RATES.quadUnitRate);
    setCamelRate(DEFAULT_PAYMENT_RATES.camelUnitRate);
    setCompanyRatesList(DEFAULT_PAYMENT_RATES.customCompanyRates);

    const resetRates = { ...DEFAULT_PAYMENT_RATES };
    savePaymentRatesToStorage(resetRates);
    if (onSaveRates) {
      onSaveRates(resetRates);
    }
    showNotification('Reset to standard default rates');
  };

  const handleOpenAddCompany = () => {
    setEditingCompanyId(null);
    setCompanyNameInput('');
    setCompanyBigRateInput(700);
    setCompanyMiniRateInput(500);
    setCompanyNotesInput('');
    setShowAddCompanyModal(true);
  };

  const handleOpenEditCompany = (c: CustomCompanyRate) => {
    setEditingCompanyId(c.id);
    setCompanyNameInput(c.companyName);
    setCompanyBigRateInput(c.bigVanRate);
    setCompanyMiniRateInput(c.miniVanRate);
    setCompanyNotesInput(c.notes || '');
    setShowAddCompanyModal(true);
  };

  const handleSaveCompanySquare = () => {
    if (!companyNameInput.trim()) {
      showNotification('Please enter a company name');
      return;
    }

    if (editingCompanyId) {
      setCompanyRatesList(prev =>
        prev.map(item =>
          item.id === editingCompanyId
            ? {
                ...item,
                companyName: companyNameInput.trim().toUpperCase(),
                bigVanRate: Number(companyBigRateInput) || 700,
                miniVanRate: Number(companyMiniRateInput) || 500,
                notes: companyNotesInput.trim()
              }
            : item
        )
      );
      showNotification(`Updated ${companyNameInput.trim().toUpperCase()} square`);
    } else {
      const newEntry: CustomCompanyRate = {
        id: `comp_${Date.now()}`,
        companyName: companyNameInput.trim().toUpperCase(),
        bigVanRate: Number(companyBigRateInput) || 700,
        miniVanRate: Number(companyMiniRateInput) || 500,
        notes: companyNotesInput.trim()
      };
      setCompanyRatesList(prev => [...prev, newEntry]);
      showNotification(`Added custom transport company ${companyNameInput.trim().toUpperCase()}`);
    }

    setShowAddCompanyModal(false);
  };

  const handleDeleteCompanySquare = (id: string, name: string) => {
    setCompanyRatesList(prev => prev.filter(c => c.id !== id));
    showNotification(`Removed ${name} custom square`);
  };

  // Calculate work tenure from started date
  const calculatedTenure = useMemo(() => {
    const raw = currentManager?.startedFrom || currentManager?.startDate || '15-03-2022';
    try {
      const parts = raw.split(/[-/]/);
      let year = 2022;
      let month = 3;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
        } else {
          year = parseInt(parts[2], 10);
          month = parseInt(parts[1], 10);
        }
      }
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const totalMonths = (currentYear - year) * 12 + (currentMonth - month);
      const years = Math.floor(totalMonths / 12);
      const remMonths = totalMonths % 12;
      if (years > 0) {
        return `${years} Year${years > 1 ? 's' : ''} ${remMonths > 0 ? `${remMonths} Mo` : ''} of Service`;
      }
      return `${totalMonths} Month${totalMonths > 1 ? 's' : ''} of Service`;
    } catch {
      return '4+ Years of Service';
    }
  }, [currentManager]);

  const handleOpenEdit = () => {
    setEditName(currentManager?.name || 'Abdelilah');
    setEditLastname(currentManager?.lastname || 'Amzil');
    setEditSchoolLevel(currentManager?.schoolLevel || 'Master Software Engineering & Higher Education');
    setEditSkill(currentManager?.skill || 'Software Developer & Lead Operations Manager');
    setEditStartedFrom(currentManager?.startedFrom || currentManager?.startDate || '15-03-2022');
    setEditEmail(currentManager?.email || 'abdelilahojana5@gmail.com');
    setEditPhone(currentManager?.phone || '+212 600-000000');
    setEditLocation(currentManager?.location || 'Marrakech Operations Center & AGM Central Desk');
    setEditEmployeeId(currentManager?.employeeId || 'AGM-MGR-001');
    setEditShift(currentManager?.shift || 'Morning & Day Operations (07:00 - 19:00)');
    setEditStatus(currentManager?.status || 'Active Lead Manager');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showNotification('Manager Name is required');
      return;
    }

    const updated: ManagerData = {
      id: currentManager?.id || `mgr_${Date.now()}`,
      name: editName.trim(),
      lastname: editLastname.trim(),
      schoolLevel: editSchoolLevel.trim(),
      skill: editSkill.trim(),
      startedFrom: editStartedFrom.trim(),
      startDate: editStartedFrom.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      location: editLocation.trim(),
      employeeId: editEmployeeId.trim(),
      shift: editShift.trim(),
      status: editStatus.trim(),
      paymentPin: customPin,
      createdAt: currentManager?.createdAt || new Date().toISOString()
    };

    onSaveManager(updated);
    setIsEditingProfile(false);
    showNotification(`Manager Profile updated for ${updated.name} ${updated.lastname}`);
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = enteredPassword.trim();
    
    // Check against custom pin, default pin (1234), or admin password (agmtravelagm)
    if (
      clean === customPin ||
      clean === '1234' ||
      clean === 'agmtravelagm' ||
      clean === 'agm2026' ||
      clean.toLowerCase() === 'ismail'
    ) {
      setIsPaymentUnlocked(true);
      setShowPasswordModal(false);
      setPasswordError(null);
      setEnteredPassword('');
      setActiveTab('manage_payments');
      showNotification('Payments Management Unlocked Successfully');
    } else {
      setPasswordError('Invalid password! Default PIN: 1234 or Admin: agmtravelagm');
    }
  };

  const managerInitials = currentManager
    ? `${currentManager.name.charAt(0)}${currentManager.lastname ? currentManager.lastname.charAt(0) : ''}`
    : 'AA';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#081015] flex flex-col text-zinc-100 overflow-hidden font-mono">
      {/* ================= 1. EXECUTIVE FULL-SCREEN HEADER ================= */}
      <div className="bg-[#0a141a] border-b border-[#152733] shrink-0 p-4 sm:p-5">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between flex-wrap gap-4">
          
          {/* Left Section: Manager Info */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Manager Avatar & Details */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00c896]/30 via-teal-500/20 to-[#008f6b]/30 border-2 border-[#00e6a8] text-[#00e6a8] flex items-center justify-center font-black text-xl shadow-[0_0_25px_rgba(0,200,150,0.3)] shrink-0 uppercase">
                {managerInitials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                    {currentManager ? `${currentManager.name} ${currentManager.lastname}` : 'Abdelilah Amzil'}
                  </h1>
                  <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Workstation Lead Manager
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {calculatedTenure}
                  </span>
                </div>
                <p className="text-xs text-teal-300/80 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{currentManager?.skill || 'Software Developer & Lead Operations Manager'}</span>
                  <span>&bull;</span>
                  <span className="text-zinc-400">ID: {currentManager?.employeeId || 'AGM-MGR-001'}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-bold">Started: {currentManager?.startedFrom || currentManager?.startDate || '15-03-2022'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Section: Edit Profile, Staff Directory, Admin Ismail & Close Button X */}
          <div className="flex items-center gap-2.5 ml-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="bg-[#12242e] hover:bg-[#1a3848] text-teal-200 border border-[#1e3b44] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#00e6a8]" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={onOpenStaffModal}
              className="bg-[#12242e] hover:bg-[#1a3848] text-zinc-300 hover:text-white border border-[#1e3b44] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Open Staff Directory"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Staff Directory</span>
            </button>

            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="bg-[#17323b] hover:bg-[#204450] text-[#00e6a8] border border-[#275362] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Admin Ismail Access"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Ismail</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-[#0e1c22] hover:bg-[#18313c] text-zinc-400 hover:text-white p-2 rounded-xl border border-[#1c3a47] transition-all cursor-pointer active:scale-95 shadow-sm ml-1"
              title="Close Profile Page"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. TAB NAVIGATION BAR ================= */}
      <div className="bg-[#050b0e] border-b border-[#152733] shrink-0 p-3 sm:px-6">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-[#0a141a] border border-[#182e3b] p-1 rounded-2xl text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Manager Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isPaymentUnlocked) {
                  setActiveTab('manage_payments');
                } else {
                  setShowPasswordModal(true);
                }
              }}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'manage_payments'
                  ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                  : 'text-amber-300 hover:text-amber-200'
              }`}
            >
              {isPaymentUnlocked ? (
                <Unlock className="w-3.5 h-3.5 text-zinc-950" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Manage Payments & Tariffs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('days_history')}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'days_history'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Days Worked History ({managerStats.uniqueDates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all_managers')}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'all_managers'
                  ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manager Profiles ({managersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenDragFolder) onOpenDragFolder();
              }}
              className="px-4 py-1.5 rounded-xl font-black flex items-center gap-2 transition-all cursor-pointer bg-emerald-500/20 hover:bg-emerald-400 text-emerald-300 hover:text-zinc-950 border border-emerald-500/40"
              title="Drag AGM-WorkSpace folder from Desktop/Documents"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Drag Folder Hub</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenIdManager) onOpenIdManager();
              }}
              className="px-4 py-1.5 rounded-xl font-black flex items-center gap-2 transition-all cursor-pointer bg-[#00c896]/15 hover:bg-[#00c896] text-[#00e6a8] hover:text-zinc-950 border border-[#00c896]/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ID Manager (Guides &amp; Drivers)</span>
            </button>
          </div>

          {/* Quick Rates Indicator */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="hidden md:inline">
              Daily Rates: Guide <strong className="text-emerald-400">{paymentRates.guideDailyRate} DH</strong> &bull; Big Driver <strong className="text-amber-300">{paymentRates.bigVanDriverDailyRate} DH</strong> &bull; Mini Driver <strong className="text-cyan-300">{paymentRates.miniVanDriverDailyRate} DH</strong>
            </span>
            <button
              type="button"
              onClick={onOpenPaymentsDetails}
              className="bg-[#0e212b] hover:bg-[#153443] text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Adjust Rates</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. MAIN FULL-PAGE BODY CONTENT ================= */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1920px] mx-auto space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Card & Info Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User Info Main Identity Card */}
                <div className="lg:col-span-2 bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#00c896]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-[#183645] pb-6">
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#00c896]/30 via-teal-500/20 to-[#008f6b]/30 border-2 border-[#00e6a8] text-[#00e6a8] flex items-center justify-center font-black text-3xl uppercase shadow-[0_0_30px_rgba(0,200,150,0.35)]">
                          {managerInitials}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00e6a8] border-2 border-[#09151a] shadow-sm animate-pulse" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                            {currentManager ? `${currentManager.name} ${currentManager.lastname}` : 'Abdelilah Amzil'}
                          </h2>
                          <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 text-xs font-black px-3 py-1 rounded-full uppercase">
                            {currentManager?.status || 'Active Lead Manager'}
                          </span>
                        </div>
                        <p className="text-sm text-teal-300 flex items-center gap-2 font-bold">
                          <Briefcase className="w-4 h-4 text-teal-400 shrink-0" />
                          <span>{currentManager?.skill || 'Software Developer & Lead Operations Manager'}</span>
                        </p>
                        <p className="text-xs text-zinc-400 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>{currentManager?.schoolLevel || 'Master Software Engineering & Higher Education'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="bg-[#122730] hover:bg-[#1a3845] text-[#00e6a8] border border-[#214a59] px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit User Details</span>
                    </button>
                  </div>

                  {/* Employment Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#00e6a8]" />
                        Work Started From
                      </span>
                      <p className="text-sm font-black text-emerald-400">
                        {currentManager?.startedFrom || currentManager?.startDate || '15-03-2022'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">{calculatedTenure}</span>
                    </div>

                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-300" />
                        Working Shift
                      </span>
                      <p className="text-sm font-black text-white">
                        {currentManager?.shift || 'Morning & Day Operations'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">07:00 - 19:00 (Daily Operations)</span>
                    </div>

                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                        Employee Badge ID
                      </span>
                      <p className="text-sm font-black text-cyan-300">
                        {currentManager?.employeeId || 'AGM-MGR-001'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">Marrakech Operations</span>
                    </div>

                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-300" />
                        Work Email
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {currentManager?.email || 'abdelilahojana5@gmail.com'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">Authorized Work Account</span>
                    </div>

                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-300" />
                        Work Contact
                      </span>
                      <p className="text-xs font-bold text-white">
                        {currentManager?.phone || '+212 600-000000'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">Direct Emergency Dispatch</span>
                    </div>

                    <div className="bg-[#0c1c24] border border-[#1a3a47] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                        Station Location
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {currentManager?.location || 'Marrakech Excursions Office'}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">AGM Operations Hub</span>
                    </div>
                  </div>
                </div>

                {/* Manage Payments & Security PIN Gate Card */}
                <div className="bg-gradient-to-b from-[#0e212b] to-[#08151c] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                        <Coins className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isPaymentUnlocked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isPaymentUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {isPaymentUnlocked ? 'Access Granted' : 'PIN Protected'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wide">
                        Manage Payments & Tariffs
                      </h3>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        Control daily payout tariffs for guides, big van drivers, mini van drivers, and transport companies.
                      </p>
                    </div>

                    <div className="bg-[#071319] border border-[#163543] rounded-2xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Guide Daily Payout:</span>
                        <strong className="text-emerald-400">{paymentRates.guideDailyRate} DH</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Big Van Driver:</span>
                        <strong className="text-amber-300">{paymentRates.bigVanDriverDailyRate} DH</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Mini Van Driver:</span>
                        <strong className="text-cyan-300">{paymentRates.miniVanDriverDailyRate} DH</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Company Fleet:</span>
                        <strong className="text-teal-300">{paymentRates.defaultCompanyBigVanRate} DH / {paymentRates.defaultCompanyMiniVanRate} DH</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPaymentUnlocked) {
                          setActiveTab('manage_payments');
                        } else {
                          setShowPasswordModal(true);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-zinc-950 font-black text-xs py-3.5 rounded-2xl uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(251,191,36,0.3)] cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isPaymentUnlocked ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Open Payments Management</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Enter Password to Manage</span>
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-zinc-400 font-mono">
                      {isPaymentUnlocked ? 'Authenticated session active' : 'Password / PIN required: 1234 or agmtravelagm'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Counters Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0c1a20] border border-[#19333e] rounded-3xl p-5 space-y-1 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-1.5 text-[#00e6a8]">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Days Worked</span>
                  </div>
                  <p className="text-3xl font-black text-white">{managerStats.daysWorked}</p>
                  <span className="text-[11px] text-teal-300/80 block">Active Work Days</span>
                </div>

                <div className="bg-[#0c1a20] border border-[#19333e] rounded-3xl p-5 space-y-1 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-1.5 text-teal-300">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Trips Managed</span>
                  </div>
                  <p className="text-3xl font-black text-white">{managerStats.totalTrips}</p>
                  <span className="text-[11px] text-teal-300/80 block">Excursion Records</span>
                </div>

                <div className="bg-[#0c1a20] border border-[#19333e] rounded-3xl p-5 space-y-1 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Pax</span>
                  </div>
                  <p className="text-3xl font-black text-white">{managerStats.totalPax}</p>
                  <span className="text-[11px] text-emerald-400/80 block">Passengers Logged</span>
                </div>

                <div className="bg-[#0c1a20] border border-[#19333e] rounded-3xl p-5 space-y-1 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400">
                    <Bike className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quads & Camels</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white">{managerStats.totalQuads} Q / {managerStats.totalCamels} C</p>
                  <span className="text-[11px] text-amber-400/80 block">Activities Coordinated</span>
                </div>
              </div>

              {/* Executive Management Tools Section: ID Manager, Drag Folder, Manage Payments */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#00e6a8]" />
                    <span>Executive Manager Operations Hub</span>
                  </h3>
                  <span className="text-[10px] text-teal-400/80 font-mono">Centralized Profile Tools</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 font-mono">
                  {/* 1. ID Manager Card */}
                  <div className="bg-[#09151a] hover:bg-[#0c1d24] border border-[#1a3845] hover:border-[#00c896]/60 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group">
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#00c896]/15 border border-[#00c896]/30 text-[#00e6a8] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          ID Manager
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Manage Guide & Driver identity IDs, barcode numbers, badge issuance, and toggle driver ID system mode.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenIdManager) onOpenIdManager();
                      }}
                      className="w-full bg-[#122730] hover:bg-[#00c896] text-[#00e6a8] hover:text-zinc-950 border border-[#214b5a] hover:border-transparent text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Open ID Manager</span>
                    </button>
                  </div>

                  {/* 2. Drag Folder Hub Card */}
                  <div className="bg-[#09151a] hover:bg-[#0c1d24] border border-[#1a3845] hover:border-emerald-500/60 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group">
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <FolderUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Drag Folder Hub
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          AGM-WorkSpace folder synchronization, desktop drag-and-drop workspace importer, and standalone local server file bridge.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenDragFolder) onOpenDragFolder();
                      }}
                      className="w-full bg-[#122730] hover:bg-emerald-400 text-emerald-300 hover:text-zinc-950 border border-[#214b5a] hover:border-transparent text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                    >
                      <FolderSync className="w-4 h-4" />
                      <span>Open Drag Folder</span>
                    </button>
                  </div>

                  {/* 3. Manage Payments & Tariffs Card */}
                  <div className="bg-[#09151a] hover:bg-[#0c1d24] border border-[#1a3845] hover:border-amber-500/60 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group">
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Manage Payments
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Configure guide daily tariffs, big & mini van driver payouts, and custom transportation partner contract prices.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isPaymentUnlocked) {
                          setActiveTab('manage_payments');
                        } else {
                          setShowPasswordModal(true);
                        }
                      }}
                      className="w-full bg-[#122730] hover:bg-amber-400 text-amber-300 hover:text-zinc-950 border border-[#214b5a] hover:border-transparent text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Manage Payments</span>
                    </button>
                  </div>

                  {/* 4. Accounts Ledger Card */}
                  <div className="bg-[#09151a] hover:bg-[#0c1d24] border border-[#1a3845] hover:border-teal-500/60 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group">
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-[#00e6a8] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Accounts Ledger
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          View days and months worked for all employees, guides, drivers, and transportation partner companies.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenAccounts) onOpenAccounts();
                      }}
                      className="w-full bg-[#122730] hover:bg-[#00c896] text-[#00e6a8] hover:text-zinc-950 border border-[#214b5a] hover:border-transparent text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Open Accounts</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE PAYMENTS & TARIFFS (PASSWORD PROTECTED) */}
          {activeTab === 'manage_payments' && (
            <div className="space-y-6">
              {!isPaymentUnlocked ? (
                <div className="bg-[#09151a] border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wide">
                      Manage Payments Access Locked
                    </h2>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Please enter your manager security password or PIN to unlock daily rates and tariffs management.
                    </p>
                  </div>

                  {/* Guidance on How to Enter Password */}
                  <div className="bg-[#0d1f27] border border-[#1c3945] rounded-2xl p-4 text-xs text-left space-y-2 text-zinc-300">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>How to Enter Password to Manage Payments:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                      <li>Default Manager Security PIN: <strong className="text-white">1234</strong></li>
                      <li>Admin Master Password: <strong className="text-white">agmtravelagm</strong></li>
                      <li>Or enter your custom configured manager PIN.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 font-black text-xs py-3.5 rounded-2xl uppercase tracking-wider shadow-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enter Security Password</span>
                  </button>
                </div>
              ) : (
                /* Unlocked Full Payments Configuration - DIRECT ON-PAGE EDITING */
                <div className="space-y-6">
                  <div className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between border-b border-[#183645] pb-5 flex-wrap gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                          <Unlock className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-white uppercase tracking-wider">
                              Daily Rates & Tariffs Configuration
                            </h2>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                              Direct Editable
                            </span>
                          </div>
                          <p className="text-xs text-teal-300/80 mt-0.5">
                            Edit daily payouts for guides, drivers, vehicles, and excursion activities directly on this page
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSaveDailyRates}
                          className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,230,168,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Daily Rates</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetDailyRates}
                          className="bg-[#12242e] hover:bg-[#1a3848] text-zinc-400 hover:text-white border border-[#1e3b44] text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          title="Reset to default 100 DH / 100 DH / 75 DH / 700 DH / 500 DH"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPaymentUnlocked(false);
                            showNotification('Payments session locked');
                          }}
                          className="bg-[#0e1b22] hover:bg-[#162f3c] text-zinc-400 hover:text-rose-300 border border-[#1e3b44] text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer"
                        >
                          Lock Session
                        </button>
                      </div>
                    </div>

                    {/* SECTION 1: GUIDES & DRIVERS DAILY RATES */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>1. Staff Daily Excursion Tariffs (DH / Day)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Guide Rate */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-emerald-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              Guide Daily Rate
                            </span>
                            <span className="text-xs font-black text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded">
                              {guideRate} DH / Day
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Base daily pay per active excursion guide.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={guideRate}
                              onChange={(e) => setGuideRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-emerald-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Day</span>
                          </div>
                        </div>

                        {/* Big Van Driver */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-amber-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <Bus className="w-3.5 h-3.5" />
                              Big Van Driver
                            </span>
                            <span className="text-xs font-black text-amber-300 bg-amber-950/90 border border-amber-500/40 px-2 py-0.5 rounded">
                              {bigDriverRate} DH / Day
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Base driver daily allowance for Big Van.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={bigDriverRate}
                              onChange={(e) => setBigDriverRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-amber-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Day</span>
                          </div>
                        </div>

                        {/* Mini Van Driver */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-cyan-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5" />
                              Mini Van Driver
                            </span>
                            <span className="text-xs font-black text-cyan-300 bg-cyan-950/90 border border-cyan-500/40 px-2 py-0.5 rounded">
                              {miniDriverRate} DH / Day
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Base driver daily allowance for Mini Van.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={miniDriverRate}
                              onChange={(e) => setMiniDriverRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-cyan-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Day</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: STANDARD COMPANY TRANSPORT FLEET RATES */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-teal-400" />
                        <span>2. Standard Transport Fleet Tariffs (AGM & Base Fleet)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Company Big Van */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-teal-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                              <Bus className="w-3.5 h-3.5" />
                              Company Big Van Fleet Tariff
                            </span>
                            <span className="text-xs font-black text-teal-300 bg-teal-950/90 border border-teal-500/40 px-2 py-0.5 rounded">
                              {companyBigRate} DH / Van
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Default company cost per Big Van per excursion day.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={companyBigRate}
                              onChange={(e) => setCompanyBigRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-teal-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Van</span>
                          </div>
                        </div>

                        {/* Company Mini Van */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-teal-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5" />
                              Company Mini Van Fleet Tariff
                            </span>
                            <span className="text-xs font-black text-teal-300 bg-teal-950/90 border border-teal-500/40 px-2 py-0.5 rounded">
                              {companyMiniRate} DH / Van
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Default company cost per Mini Van per excursion day.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={companyMiniRate}
                              onChange={(e) => setCompanyMiniRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-teal-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Van</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: QUADS & CAMELS ACTIVITIES TARIFFS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Bike className="w-4 h-4 text-amber-400" />
                          <span>3. Quads & Camels Activities Tariffs</span>
                        </h3>
                        <span className="text-[10px] text-amber-300/70">Per Unit Excursion Rate</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Quad Unit Rate */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-amber-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <Bike className="w-3.5 h-3.5" />
                              Quad Bike Unit Tariff
                            </span>
                            <span className="text-xs font-black text-amber-400 bg-amber-950/90 border border-amber-500/40 px-2 py-0.5 rounded">
                              {quadRate} DH / Quad
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Base money rate per quad bike excursion session.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={quadRate}
                              onChange={(e) => setQuadRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-amber-400"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Quad</span>
                          </div>
                        </div>

                        {/* Camel Unit Rate */}
                        <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2 hover:border-teal-500/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#00e6a8] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Camel Ride Unit Tariff
                            </span>
                            <span className="text-xs font-black text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded">
                              {camelRate} DH / Camel
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Base money rate per camel ride excursion session.
                          </p>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={camelRate}
                              onChange={(e) => setCamelRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-[#00e6a8]"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Camel</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: CUSTOM COMPANY TRANSPORT SQUARES */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#00e6a8]" />
                            <span>4. Custom Company Transport Squares ({companyRatesList.length})</span>
                          </h3>
                          <p className="text-[10px] text-teal-300/70 mt-0.5">
                            Special squares for external transport companies with custom payout rates
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAddCompany}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Company Square</span>
                        </button>
                      </div>

                      {companyRatesList.length === 0 ? (
                        <div className="bg-[#0b1b22] border border-[#183645] rounded-2xl p-6 text-center text-xs text-zinc-400">
                          No custom transport companies configured yet. Click &quot;Add Company Square&quot; above to create one.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {companyRatesList.map((comp) => (
                            <div
                              key={comp.id}
                              className="bg-[#0b1b22] border border-[#1a3b4a] hover:border-[#00e6a8]/50 rounded-2xl p-4 space-y-2 transition-all shadow-md"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-[#00e6a8] tracking-wide uppercase">
                                  {comp.companyName}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCompany(comp)}
                                    className="p-1.5 rounded-lg bg-[#142d38] hover:bg-[#1c3f4e] text-teal-300 hover:text-white cursor-pointer"
                                    title="Edit square"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCompanySquare(comp.id, comp.companyName)}
                                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                                    title="Delete square"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div className="bg-[#050e12] border border-[#163543] rounded-lg p-2">
                                  <span className="text-[10px] text-zinc-400 font-bold block">Big Van:</span>
                                  <span className="font-black text-amber-300">{comp.bigVanRate} DH</span>
                                </div>
                                <div className="bg-[#050e12] border border-[#163543] rounded-lg p-2">
                                  <span className="text-[10px] text-zinc-400 font-bold block">Mini Van:</span>
                                  <span className="font-black text-cyan-300">{comp.miniVanRate} DH</span>
                                </div>
                              </div>

                              {comp.notes && (
                                <p className="text-[10px] text-zinc-400 italic bg-[#050e12] px-2 py-1 rounded border border-[#142c38]">
                                  {comp.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Save Action Bar */}
                    <div className="pt-4 border-t border-[#183645] flex items-center justify-between flex-wrap gap-3">
                      <p className="text-xs text-zinc-400">
                        Changes take effect immediately in the live Money Counter and Master Ledger calculations.
                      </p>
                      <button
                        type="button"
                        onClick={handleSaveDailyRates}
                        className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(0,230,168,0.35)] cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Daily Rates &amp; Tariffs</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAYS WORKED HISTORY */}
          {activeTab === 'days_history' && (
            <div className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#183645] pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider">
                      Days Worked & Activity Logs
                    </h2>
                    <p className="text-xs text-teal-300/80">
                      Historical log of all excursion days coordinated by active manager
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-teal-300">
                  Total Active Days: <strong className="text-white">{managerStats.uniqueDates.length}</strong>
                </span>
              </div>

              {managerStats.uniqueDates.length === 0 ? (
                <div className="bg-[#0c181f] border border-[#172e38] rounded-2xl p-8 text-center text-xs text-zinc-400">
                  No excursion trips logged yet in this workstation session.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {managerStats.uniqueDates.map(dStr => {
                    const data = managerStats.datesMap[dStr];
                    return (
                      <div
                        key={dStr}
                        className="bg-[#0c1c24] border border-[#1a3a47] hover:border-[#00e6a8]/50 p-4 rounded-2xl space-y-2 transition-all shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#00e6a8]" />
                            {dStr}
                          </span>
                          <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded text-[10px] font-bold">
                            {data.count} trip{data.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 space-y-0.5 pt-1 border-t border-[#152e39]">
                          <div className="flex justify-between">
                            <span>Passengers:</span>
                            <strong className="text-emerald-400">{data.pax} Pax</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Activities:</span>
                            <strong className="text-amber-300">{data.quads} Q / {data.camels} C</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ALL REGISTERED MANAGERS */}
          {activeTab === 'all_managers' && (
            <div className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#183645] pb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wider">
                    Workstation Manager Profiles
                  </h2>
                  <p className="text-xs text-teal-300/80">
                    Switch between registered manager accounts or register a new manager profile
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenDragFolder) onOpenDragFolder();
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
                    title="Drag AGM-WorkSpace folder to restore all profiles & trips"
                  >
                    <FolderUp className="w-4 h-4 text-zinc-950" />
                    <span>Drag Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAddManager}
                    className="bg-gradient-to-r from-[#00c896] to-teal-400 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Manager Profile</span>
                  </button>
                </div>
              </div>

              {/* AGM-WorkSpace Restore Banner */}
              <div className="bg-[#0b1b22] border border-[#1b3e4d] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center shrink-0">
                    <FolderSync className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">AGM-WorkSpace Standalone Storage Hub</p>
                    <p className="text-zinc-400 text-[11px]">If the app is deleted or data cleared, drag the folder to restore all trips, guides, and drivers.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenDragFolder) onOpenDragFolder();
                  }}
                  className="bg-[#122b34] hover:bg-[#1a3d4a] text-[#00e6a8] border border-[#214f5f] px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer shrink-0 transition-all"
                >
                  Open Drag Hub &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {managersList.map(mgr => {
                  const isActive = currentManager?.id === mgr.id;
                  return (
                    <div
                      key={mgr.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isActive
                          ? 'bg-[#0f2a24] border-[#00c896] shadow-[0_0_25px_rgba(0,200,150,0.2)]'
                          : 'bg-[#0c1c23] border-[#1e3b44] hover:border-teal-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center font-black text-lg uppercase shrink-0">
                          {mgr.name.charAt(0)}{mgr.lastname ? mgr.lastname.charAt(0) : ''}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white">
                              {mgr.name} {mgr.lastname}
                            </h3>
                            {isActive && (
                              <span className="bg-[#00c896] text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-teal-300/80">{mgr.skill}</p>
                          <p className="text-[11px] text-zinc-400">{mgr.schoolLevel}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#163543] text-xs">
                        <span className="text-zinc-400 text-[10px]">
                          Started: {mgr.startedFrom || mgr.startDate || '15-03-2022'}
                        </span>
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectManager(mgr);
                              showNotification(`Switched active manager to ${mgr.name} ${mgr.lastname}`);
                            }}
                            className="bg-[#142d36] hover:bg-[#1d404d] text-[#00e6a8] border border-[#234c5b] text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Select Profile
                          </button>
                        ) : (
                          <span className="text-[#00e6a8] font-bold text-[11px]">Currently Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 4. PASSWORD / PIN PROMPT MODAL ================= */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09151a] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(251,191,36,0.25)] relative text-left space-y-5 font-mono"
            >
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-[#12242a] p-2 rounded-full border border-[#1e3b44] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto shadow-inner">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Enter Password to Manage Payments
                </h3>
                <p className="text-xs text-zinc-400">
                  Authenticate to unlock manager daily rates and tariff configuration
                </p>
              </div>

              {/* Clear Explanation / Guidance */}
              <div className="bg-[#07141b] border border-[#183645] rounded-2xl p-3.5 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>How to Enter Password:</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Type your security password below or use the default Manager PIN <strong className="text-white">1234</strong> or Admin <strong className="text-white">agmtravelagm</strong>.
                </p>
              </div>

              {passwordError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Security Password / PIN
                  </label>
                  <div className="relative rounded-xl border border-[#1c3943] bg-[#0d1f25] focus-within:border-amber-400 transition-all flex items-center px-3.5 py-2.5">
                    <Lock className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      placeholder="Enter PIN (e.g. 1234)"
                      autoFocus
                      required
                      className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="text-zinc-400 hover:text-white cursor-pointer ml-1"
                    >
                      {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick PIN Keypad buttons for easy 1-click entry */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['1', '2', '3', '4'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setEnteredPassword(prev => prev + k)}
                      className="bg-[#0d1e26] hover:bg-[#163543] text-white border border-[#1a3845] py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-zinc-950 font-black text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Authenticate & Unlock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-3.5 rounded-xl bg-[#12242a] text-zinc-400 font-bold hover:text-white border border-[#1e3b44] text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 5. EDIT MANAGER PROFILE MODAL ================= */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative text-left space-y-5 font-mono max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-[#12242a] p-2 rounded-full border border-[#1e3b44] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Edit Manager Profile Details
                </h3>
                <p className="text-xs text-teal-300/80">
                  Update manager employment information, start date, and workstation role
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={editLastname}
                      onChange={(e) => setEditLastname(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      Work Started From (Start Date) *
                    </label>
                    <input
                      type="text"
                      value={editStartedFrom}
                      onChange={(e) => setEditStartedFrom(e.target.value)}
                      placeholder="e.g. 15-03-2022"
                      required
                      className="w-full rounded-xl border border-emerald-500/40 bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
                      Employee Badge ID
                    </label>
                    <input
                      type="text"
                      value={editEmployeeId}
                      onChange={(e) => setEditEmployeeId(e.target.value)}
                      placeholder="e.g. AGM-MGR-001"
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Role & Skills
                  </label>
                  <input
                    type="text"
                    value={editSkill}
                    onChange={(e) => setEditSkill(e.target.value)}
                    placeholder="e.g. Software Developer & Lead Operations Manager"
                    className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    School & Education Level
                  </label>
                  <input
                    type="text"
                    value={editSchoolLevel}
                    onChange={(e) => setEditSchoolLevel(e.target.value)}
                    placeholder="e.g. Master Software Engineering & Higher Education"
                    className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="e.g. abdelilahojana5@gmail.com"
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +212 600-000000"
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Station / Office Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Marrakech Operations Center & AGM Central Desk"
                    className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#163543]">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#1e3b44] text-zinc-400 font-bold hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ================= 6. ADD / EDIT CUSTOM COMPANY TRANSPORT SQUARE MODAL ================= */}
      <AnimatePresence>
        {showAddCompanyModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-left space-y-5 font-mono"
            >
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-[#12242a] p-2 rounded-full border border-[#1e3b44] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {editingCompanyId ? 'Edit Custom Transport Square' : 'Add Custom Transport Square'}
                  </h3>
                  <p className="text-xs text-teal-300/80">
                    Set specific Big Van &amp; Mini Van rates for external transport companies
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyNameInput}
                    onChange={(e) => setCompanyNameInput(e.target.value)}
                    placeholder="e.g. ATLAS VOYAGES, TOUBKAL TRANSPORT"
                    className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 font-bold uppercase focus:border-[#00e6a8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                      Big Van Rate (DH) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={companyBigRateInput}
                      onChange={(e) => setCompanyBigRateInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-xl border border-amber-500/40 bg-[#0d1f25] text-white p-3 font-black focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
                      Mini Van Rate (DH) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={companyMiniRateInput}
                      onChange={(e) => setCompanyMiniRateInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-xl border border-cyan-500/40 bg-[#0d1f25] text-white p-3 font-black focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Notes / Description
                  </label>
                  <input
                    type="text"
                    value={companyNotesInput}
                    onChange={(e) => setCompanyNotesInput(e.target.value)}
                    placeholder="e.g. VIP client partner, weekly invoice tariff"
                    className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-3 focus:border-[#00e6a8] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#163543]">
                  <button
                    type="button"
                    onClick={() => setShowAddCompanyModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#1e3b44] text-zinc-400 font-bold hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCompanySquare}
                    className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingCompanyId ? 'Update Square' : 'Save Square'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
