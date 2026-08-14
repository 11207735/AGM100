import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  UserCheck,
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Copy,
  QrCode,
  Globe2,
  MapPin,
  Phone,
  Briefcase,
  Bus,
  Car,
  Printer,
  Sparkles,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Building2,
  RotateCcw,
  BadgeAlert,
  IdCard,
  Languages,
  Eye,
  Flame,
  Award,
  AlertTriangle
} from 'lucide-react';
import { markStaffInactiveStatus } from '../utils/staffStatus';

export interface RegisteredGuide {
  id: string; // 6-digit ID, e.g. "100001", "683920"
  name: string; // Full Name, e.g. "Hassan El Amrani"
  nickname?: string; // e.g. "Simo"
  useNicknameInLogs?: boolean; // if true, uses nickname in daily logged trips
  originCity?: string; // e.g. "Marrakech", "Ourika", "Imlil" (optional)
  languages?: string[]; // e.g. ["English", "French", "Arabic"] (optional)
  phone?: string; // optional
  status?: 'Active' | 'On-Call' | 'Inactive';
  joinedDate?: string;
  notes?: string;
  badgeColor?: string;
}

export interface RegisteredDriver {
  id?: string; // optional driver ID, e.g. "DR-01"
  name: string; // e.g. "Youssef"
  vanType: 'Big van' | 'Mini van';
  companyName: string; // e.g. "AGM"
  originCity?: string; // optional
  phone?: string; // optional
  status?: 'Active' | 'Inactive';
  notes?: string;
}

export const DEFAULT_GUIDES: RegisteredGuide[] = [];

export const DEFAULT_DRIVERS: RegisteredDriver[] = [];

export function getStoredGuides(): RegisteredGuide[] {
  try {
    const isCleaned = localStorage.getItem('agm_guides_cleaned_v2');
    if (!isCleaned) {
      // Clean out legacy sample/default mock guides from storage
      localStorage.removeItem('agm_registered_guides');
      localStorage.setItem('agm_guides_cleaned_v2', 'true');
      return [];
    }

    const saved = localStorage.getItem('agm_registered_guides');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading guides from localStorage:', e);
  }
  return DEFAULT_GUIDES;
}

export function saveGuidesToStorage(guides: RegisteredGuide[]) {
  try {
    localStorage.setItem('agm_registered_guides', JSON.stringify(guides));
  } catch (e) {
    console.error('Error saving guides to localStorage:', e);
  }
}

export function getStoredDrivers(): RegisteredDriver[] {
  try {
    const isCleaned = localStorage.getItem('agm_drivers_cleaned_v2');
    if (!isCleaned) {
      // Clean out legacy sample drivers
      localStorage.removeItem('agm_registered_drivers');
      localStorage.setItem('agm_drivers_cleaned_v2', 'true');
      return [];
    }

    const saved = localStorage.getItem('agm_registered_drivers');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading drivers from localStorage:', e);
  }
  return DEFAULT_DRIVERS;
}

export function saveDriversToStorage(drivers: RegisteredDriver[]) {
  try {
    localStorage.setItem('agm_registered_drivers', JSON.stringify(drivers));
  } catch (e) {
    console.error('Error saving drivers to localStorage:', e);
  }
}

const COMMON_LANGUAGES = [
  'English',
  'French',
  'Arabic',
  'Berber',
  'Spanish',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Dutch'
];

const COMMON_CITIES = [
  'Marrakech',
  'Ourika',
  'Imlil',
  'Taroudant',
  'Ouarzazate',
  'Zagora',
  'Essaouira',
  'Agadir',
  'Casablanca',
  'Tahannaout',
  'Asni'
];

interface IdManagerViewProps {
  isOpen: boolean;
  onClose: () => void;
  guides: RegisteredGuide[];
  drivers: RegisteredDriver[];
  onUpdateGuides: (guides: RegisteredGuide[]) => void;
  onUpdateDrivers: (drivers: RegisteredDriver[]) => void;
  showNotification?: (msg: string) => void;
  onSelectGuideForTrip?: (guide: RegisteredGuide) => void;
  onSelectDriverForTrip?: (driver: RegisteredDriver) => void;
  driverIdMode?: 'id' | 'name';
  onDriverIdModeChange?: (mode: 'id' | 'name') => void;
  onToggleDriverIdMode?: (mode: 'id' | 'name') => void;
}

export const IdManagerView: React.FC<IdManagerViewProps> = ({
  isOpen,
  onClose,
  guides,
  drivers,
  onUpdateGuides,
  onUpdateDrivers,
  showNotification,
  onSelectGuideForTrip,
  onSelectDriverForTrip,
  driverIdMode = 'name',
  onDriverIdModeChange
}) => {
  const [activeTab, setActiveTab] = useState<'guides' | 'drivers' | 'verifier' | 'badges'>('guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterVanType, setFilterVanType] = useState<'ALL' | 'Big van' | 'Mini van'>('ALL');
  const [viewStyle, setViewStyle] = useState<'cards' | 'table'>('cards');

  // Safe notification trigger
  const notify = (msg: string) => {
    if (typeof showNotification === 'function') {
      showNotification(msg);
    }
  };

  // Driver ID Mode (Default: 'name' / without ID until manager selects 'id' / work with ID)
  const [localDriverIdMode, setLocalDriverIdMode] = useState<'id' | 'name'>(() => {
    if (driverIdMode) return driverIdMode;
    try {
      const saved = localStorage.getItem('agm_driver_id_mode');
      if (saved === 'id' || saved === 'name') return saved;
    } catch {}
    return 'name';
  });

  useEffect(() => {
    if (driverIdMode) {
      setLocalDriverIdMode(driverIdMode);
    }
  }, [driverIdMode]);

  const handleToggleDriverIdMode = (mode: 'id' | 'name') => {
    setLocalDriverIdMode(mode);
    try {
      localStorage.setItem('agm_driver_id_mode', mode);
    } catch {}
    if (onDriverIdModeChange) {
      onDriverIdModeChange(mode);
    }
    notify(
      mode === 'id'
        ? 'Drivers Mode: "Work With ID" enabled. 6-Digit Driver IDs will be used in Trip Logger.'
        : 'Drivers Mode: "Work Without ID" enabled (Default). Drivers can be logged by name without requiring IDs.'
    );
  };

  // Add / Edit Guide Modal State
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [editingGuideOriginalId, setEditingGuideOriginalId] = useState<string | null>(null);
  const [guideNameInput, setGuideNameInput] = useState('');
  const [guideNicknameInput, setGuideNicknameInput] = useState('');
  const [guideUseNicknameInLogs, setGuideUseNicknameInLogs] = useState(false);
  const [guideIdInput, setGuideIdInput] = useState('');
  const [idGenerationMode, setIdGenerationMode] = useState<'auto' | 'custom'>('auto');
  const [guideCityInput, setGuideCityInput] = useState('');
  const [guideLanguagesInput, setGuideLanguagesInput] = useState<string[]>(['English', 'French', 'Arabic']);
  const [guidePhoneInput, setGuidePhoneInput] = useState('');
  const [guideNotesInput, setGuideNotesInput] = useState('');
  const [guideStatusInput, setGuideStatusInput] = useState<'Active' | 'On-Call' | 'Inactive'>('Active');

  // Add / Edit Driver Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriverOriginalIndex, setEditingDriverOriginalIndex] = useState<number | null>(null);
  const [driverNameInput, setDriverNameInput] = useState('');
  const [driverIdInput, setDriverIdInput] = useState('');
  const [driverVanTypeInput, setDriverVanTypeInput] = useState<'Big van' | 'Mini van'>('Big van');
  const [driverCompanyInput, setDriverCompanyInput] = useState('AGM');
  const [driverCityInput, setDriverCityInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [driverNotesInput, setDriverNotesInput] = useState('');

  // Live Verifier Tester State
  const [verifyInput, setVerifyInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Badge Preview Modal
  const [badgePreviewGuide, setBadgePreviewGuide] = useState<RegisteredGuide | null>(null);

  // Dedicated Delete Confirmation Modal Target State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'guide' | 'driver';
    id?: string;
    name: string;
    index?: number;
  } | null>(null);
  const [alsoRemoveFromStaff, setAlsoRemoveFromStaff] = useState<boolean>(true);

  // Auto calculate next sequential 6-Digit Guide ID (e.g. 100001, 100002, etc.)
  const generateNextGuideId = () => {
    let maxNum = 100000;
    guides.forEach(g => {
      const digitsOnly = g.id.replace(/\D/g, '');
      if (digitsOnly.length >= 1) {
        const num = parseInt(digitsOnly, 10);
        if (num >= 100000 && num > maxNum) maxNum = num;
        else if (num < 100000 && (100000 + num) > maxNum) maxNum = 100000 + num;
      }
    });
    return String(maxNum + 1);
  };

  const generateRandom6DigitId = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  // Auto calculate next sequential 6-Digit Driver ID (e.g. 200001, 200002, etc.)
  const generateNextDriverId = () => {
    let maxNum = 200000;
    drivers.forEach(d => {
      if (d.id) {
        const digitsOnly = d.id.replace(/\D/g, '');
        if (digitsOnly.length >= 1) {
          const num = parseInt(digitsOnly, 10);
          if (num >= 200000 && num > maxNum) maxNum = num;
          else if (num < 200000 && (200000 + num) > maxNum) maxNum = 200000 + num;
        }
      }
    });
    return String(maxNum + 1);
  };

  const handleOpenAddGuide = () => {
    setEditingGuideOriginalId(null);
    setGuideNameInput('');
    setGuideNicknameInput('');
    setGuideUseNicknameInLogs(false);
    const autoId = generateNextGuideId();
    setGuideIdInput(autoId);
    setIdGenerationMode('auto');
    setGuideCityInput('');
    setGuideLanguagesInput(['English', 'French', 'Arabic']);
    setGuidePhoneInput('');
    setGuideNotesInput('');
    setGuideStatusInput('Active');
    setShowGuideModal(true);
  };

  const handleOpenEditGuide = (guide: RegisteredGuide) => {
    setEditingGuideOriginalId(guide.id);
    setGuideNameInput(guide.name);
    setGuideNicknameInput(guide.nickname || '');
    setGuideUseNicknameInLogs(Boolean(guide.useNicknameInLogs));
    setGuideIdInput(guide.id);
    setIdGenerationMode('custom');
    setGuideCityInput(guide.originCity || '');
    setGuideLanguagesInput(guide.languages || []);
    setGuidePhoneInput(guide.phone || '');
    setGuideNotesInput(guide.notes || '');
    setGuideStatusInput(guide.status || 'Active');
    setShowGuideModal(true);
  };

  const toggleGuideLanguage = (lang: string) => {
    setGuideLanguagesInput(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSaveGuide = () => {
    if (!guideNameInput.trim()) {
      notify('Guide Full Name is required!');
      return;
    }

    const numericOnly = guideIdInput.replace(/\D/g, '');
    let finalId = numericOnly || generateNextGuideId();
    if (finalId.length < 6) {
      finalId = finalId.padStart(6, '0');
    }

    // Check duplicate ID if new or changing ID
    const isDuplicate = guides.some(
      g => g.id.replace(/\D/g, '') === finalId.replace(/\D/g, '') && (!editingGuideOriginalId || g.id !== editingGuideOriginalId)
    );

    if (isDuplicate) {
      notify(`Guide ID "${finalId}" is already assigned to another guide! Choose a unique 6-digit ID.`);
      return;
    }

    const newGuide: RegisteredGuide = {
      id: finalId,
      name: guideNameInput.trim(),
      nickname: guideNicknameInput.trim() || undefined,
      useNicknameInLogs: Boolean(guideNicknameInput.trim() && guideUseNicknameInLogs),
      originCity: guideCityInput.trim() || undefined,
      languages: guideLanguagesInput.length > 0 ? guideLanguagesInput : undefined,
      phone: guidePhoneInput.trim() || undefined,
      status: guideStatusInput,
      joinedDate: editingGuideOriginalId
        ? (guides.find(g => g.id === editingGuideOriginalId)?.joinedDate || new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
      notes: guideNotesInput.trim() || undefined
    };

    let updatedList: RegisteredGuide[];
    if (editingGuideOriginalId) {
      updatedList = guides.map(g => (g.id === editingGuideOriginalId ? newGuide : g));
      notify(`Updated Guide [${finalId}] ${newGuide.name}`);
    } else {
      updatedList = [...guides, newGuide];
      notify(`Created New Guide [${finalId}] ${newGuide.name}! Ready to use.`);
    }

    onUpdateGuides(updatedList);
    saveGuidesToStorage(updatedList);
    setShowGuideModal(false);
  };

  const handleDeleteGuide = (id: string, name: string) => {
    setAlsoRemoveFromStaff(true);
    setDeleteConfirmTarget({
      type: 'guide',
      id,
      name
    });
  };

  // Driver handlers
  const handleOpenAddDriver = (preselectedVanType: 'Big van' | 'Mini van' = 'Big van') => {
    setEditingDriverOriginalIndex(null);
    setDriverNameInput('');
    setDriverIdInput(generateNextDriverId());
    setDriverVanTypeInput(preselectedVanType);
    setDriverCompanyInput('AGM');
    setDriverCityInput('');
    setDriverPhoneInput('');
    setDriverNotesInput('');
    setShowDriverModal(true);
  };

  const handleOpenEditDriver = (driver: RegisteredDriver, index: number) => {
    setEditingDriverOriginalIndex(index);
    setDriverNameInput(driver.name);
    setDriverIdInput(driver.id || generateNextDriverId());
    setDriverVanTypeInput(driver.vanType);
    setDriverCompanyInput(driver.companyName || 'AGM');
    setDriverCityInput(driver.originCity || '');
    setDriverPhoneInput(driver.phone || '');
    setDriverNotesInput(driver.notes || '');
    setShowDriverModal(true);
  };

  const handleSaveDriver = () => {
    if (!driverNameInput.trim()) {
      notify('Driver Full Name is required!');
      return;
    }

    const numericOnly = driverIdInput.replace(/\D/g, '').trim();
    let finalDriverId = numericOnly;
    if (finalDriverId && finalDriverId.length < 6) {
      finalDriverId = finalDriverId.padStart(6, '0');
    }

    const newDriver: RegisteredDriver = {
      id: finalDriverId || undefined,
      name: driverNameInput.trim(),
      vanType: driverVanTypeInput,
      companyName: driverCompanyInput.trim().toUpperCase() || 'AGM',
      originCity: driverCityInput.trim() || undefined,
      phone: driverPhoneInput.trim() || undefined,
      status: 'Active',
      notes: driverNotesInput.trim() || undefined
    };

    let updatedList: RegisteredDriver[];
    if (editingDriverOriginalIndex !== null) {
      updatedList = drivers.map((d, i) => (i === editingDriverOriginalIndex ? newDriver : d));
      notify(`Updated Driver ${newDriver.name}`);
    } else {
      updatedList = [...drivers, newDriver];
      notify(`Added New Driver ${newDriver.name} (${newDriver.vanType})`);
    }

    onUpdateDrivers(updatedList);
    saveDriversToStorage(updatedList);
    setShowDriverModal(false);
  };

  const handleDeleteDriver = (index: number, name: string) => {
    const d = drivers[index];
    setDeleteConfirmTarget({
      type: 'driver',
      index,
      name,
      id: d?.id
    });
  };

  const handleExecuteDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'guide') {
      const updated = guides.filter(g => g.id !== deleteConfirmTarget.id);
      onUpdateGuides(updated);
      saveGuidesToStorage(updated);
      
      if (alsoRemoveFromStaff) {
        markStaffInactiveStatus(deleteConfirmTarget.name, true, 'Removed from ID Manager');
        if (deleteConfirmTarget.id) {
          markStaffInactiveStatus(deleteConfirmTarget.id, true, 'Removed from ID Manager');
        }
      }
      
      notify(`Removed Guide profile [${deleteConfirmTarget.id}] ${deleteConfirmTarget.name}. All past trip data, Excel table records & Fleet activities remain 100% intact.`);
    } else if (deleteConfirmTarget.type === 'driver' && deleteConfirmTarget.index !== undefined) {
      const updated = drivers.filter((_, i) => i !== deleteConfirmTarget.index);
      onUpdateDrivers(updated);
      saveDriversToStorage(updated);

      if (alsoRemoveFromStaff) {
        markStaffInactiveStatus(deleteConfirmTarget.name, true, 'Removed from ID Manager');
        if (deleteConfirmTarget.id) {
          markStaffInactiveStatus(deleteConfirmTarget.id, true, 'Removed from ID Manager');
        }
      }

      notify(`Removed Driver profile ${deleteConfirmTarget.name}. All past trip data, Excel table records & Fleet activities remain 100% intact.`);
    }
    setDeleteConfirmTarget(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    notify(`Copied ID "${text}" to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Guides
  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        g.id.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        (g.originCity && g.originCity.toLowerCase().includes(q)) ||
        (g.languages && g.languages.some(l => l.toLowerCase().includes(q)));

      const matchCity = filterCity === 'ALL' || (g.originCity && g.originCity.toUpperCase() === filterCity.toUpperCase());
      const matchLang = filterLanguage === 'ALL' || (g.languages && g.languages.includes(filterLanguage));

      return matchSearch && matchCity && matchLang;
    });
  }, [guides, searchQuery, filterCity, filterLanguage]);

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        d.name.toLowerCase().includes(q) ||
        (d.companyName && d.companyName.toLowerCase().includes(q)) ||
        (d.originCity && d.originCity.toLowerCase().includes(q));

      const matchVan = filterVanType === 'ALL' || d.vanType === filterVanType;
      return matchSearch && matchVan;
    });
  }, [drivers, searchQuery, filterVanType]);

  const miniDriversList = useMemo(() => {
    return filteredDrivers.filter(d => d.vanType === 'Mini van');
  }, [filteredDrivers]);

  const bigDriversList = useMemo(() => {
    return filteredDrivers.filter(d => d.vanType === 'Big van');
  }, [filteredDrivers]);

  const totalMiniCount = useMemo(() => {
    return drivers.filter(d => d.vanType === 'Mini van').length;
  }, [drivers]);

  const totalBigCount = useMemo(() => {
    return drivers.filter(d => d.vanType === 'Big van').length;
  }, [drivers]);

  // Real-time Verifier Query Resolution
  const verifierResult = useMemo(() => {
    const raw = verifyInput.trim().toUpperCase();
    if (!raw) return null;

    // Check exact Guide ID match
    const guideById = guides.find(g => g.id.toUpperCase() === raw);
    if (guideById) {
      return { type: 'guide' as const, data: guideById, exact: true };
    }

    // Check partial Guide ID or Name
    const guideByName = guides.find(g => g.name.toUpperCase().includes(raw) || g.id.toUpperCase().includes(raw));
    if (guideByName) {
      return { type: 'guide' as const, data: guideByName, exact: false };
    }

    // Check Driver ID or Name
    const driverMatch = drivers.find(d => (d.id && d.id.toUpperCase() === raw) || d.name.toUpperCase().includes(raw));
    if (driverMatch) {
      return { type: 'driver' as const, data: driverMatch, exact: Boolean(driverMatch.id && driverMatch.id.toUpperCase() === raw) };
    }

    return { type: 'not_found' as const, query: raw };
  }, [verifyInput, guides, drivers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#060e12] text-zinc-100 flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      {/* ================= 1. TOP HEADER BAR ================= */}
      <div className="bg-[#081318] border-b border-[#162934] p-3.5 sm:px-6 shrink-0 flex items-center justify-between flex-wrap gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#0e212b] hover:bg-[#153443] border border-[#1e3b4a] text-teal-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Return to Main Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00c896] to-teal-500 text-zinc-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(0,200,150,0.4)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  STAFF ID REGISTRY &amp; IDENTITY MANAGEMENT
                </h1>
                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 text-[10px] font-black px-2 py-0.5 rounded-full uppercase font-mono">
                  Manager Portal
                </span>
              </div>
              <p className="text-[11px] text-teal-300/80 font-mono">
                Assign unique IDs to Guides &amp; Drivers &bull; Prevents duplicate names &bull; Real-time ID auto-matching
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddGuide}
            className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,230,168,0.3)] cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Guide (ID)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddDriver()}
            className="bg-[#0f2430] hover:bg-[#16384a] text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Driver</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-[#0b1b22] hover:bg-[#132c37] text-zinc-400 hover:text-white border border-[#183645] p-2 rounded-xl cursor-pointer"
            title="Close ID Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ================= 2. SECONDARY TABS & STATS BAR ================= */}
      <div className="bg-[#050b0e] border-b border-[#142631] px-4 sm:px-6 py-2.5 shrink-0 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[#09151a] border border-[#162e3a] p-1 rounded-2xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'guides'
                ? 'bg-[#00c896] text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Guides Registry ({guides.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Drivers Roster ({drivers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifier')}
            className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'verifier'
                ? 'bg-cyan-400 text-zinc-950 shadow-md font-black'
                : 'text-cyan-300 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Live ID Verifier &amp; Test</span>
          </button>
        </div>

        {/* Quick Registry Metrics */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
          <div className="bg-[#0a1820] border border-[#173342] px-3 py-1 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Guides: <strong className="text-white font-bold">{guides.length} IDs</strong></span>
          </div>
          <div className="bg-[#0a1820] border border-[#173342] px-3 py-1 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Drivers: <strong className="text-white font-bold">{drivers.length} Rostered</strong></span>
          </div>
        </div>
      </div>

      {/* ================= 3. MAIN WORKSPACE BODY ================= */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ================= TAB 1: GUIDES REGISTRY ================= */}
        {activeTab === 'guides' && (
          <div className="space-y-6 max-w-[1920px] mx-auto">
            
            {/* Filter and Search Bar */}
            <div className="bg-[#09151a] border border-[#193643] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Guide ID (e.g. GD-01), Name, City..."
                  className="w-full bg-[#050e12] border border-[#1b3a4a] focus:border-[#00e6a8] rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-zinc-500 outline-none shadow-inner"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="bg-[#050e12] border border-[#1b3a4a] text-xs text-zinc-300 rounded-xl px-3 py-2 font-mono outline-none cursor-pointer"
                >
                  <option value="ALL">All Cities ({guides.length})</option>
                  {COMMON_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="bg-[#050e12] border border-[#1b3a4a] text-xs text-zinc-300 rounded-xl px-3 py-2 font-mono outline-none cursor-pointer"
                >
                  <option value="ALL">All Languages</option>
                  {COMMON_LANGUAGES.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-[#050e12] p-1 rounded-xl border border-[#1b3a4a]">
                  <button
                    type="button"
                    onClick={() => setViewStyle('cards')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewStyle === 'cards' ? 'bg-[#00c896] text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Cards Grid View"
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewStyle('table')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewStyle === 'table' ? 'bg-[#00c896] text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="List Table View"
                  >
                    Table
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddGuide}
                  className="bg-gradient-to-r from-[#00c896] to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md uppercase transition-all active:scale-95 ml-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Guide</span>
                </button>
              </div>
            </div>

            {/* Guides Cards / Table View */}
            {filteredGuides.length === 0 ? (
              <div className="bg-[#08151c] border border-[#183645] rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-3xl bg-[#00c896]/15 border border-[#00c896]/30 text-[#00e6a8] flex items-center justify-center font-bold mx-auto shadow-lg">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                    {searchQuery || filterCity !== 'ALL' || filterLanguage !== 'ALL' ? 'No Matching Guides Found' : 'No Registered Guides Yet'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {searchQuery || filterCity !== 'ALL' || filterLanguage !== 'ALL'
                      ? 'Try adjusting your search query or filters.'
                      : 'Register your official excursion guides to assign unique IDs (e.g. GD-01) and prevent name conflicts.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddGuide}
                  className="bg-gradient-to-r from-[#00c896] to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,200,150,0.3)] cursor-pointer inline-flex items-center gap-2 active:scale-95 font-mono"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Guide (ID)</span>
                </button>
              </div>
            ) : viewStyle === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredGuides.map(guide => (
                  <div
                    key={guide.id}
                    className="bg-[#08151c] border border-[#183645] hover:border-[#00e6a8]/70 rounded-2xl p-3.5 shadow-md space-y-2.5 relative overflow-hidden group transition-all font-mono"
                  >
                    {/* 1. TOP: Name + Nickname + Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-white uppercase tracking-wide truncate group-hover:text-[#00e6a8] transition-colors">
                            {guide.name}
                          </h3>
                          {guide.nickname && (
                            <span className="text-[10px] text-teal-300 font-bold bg-[#0b222a] border border-[#174857] px-1.5 py-0.2 rounded shrink-0">
                              "{guide.nickname}"
                            </span>
                          )}
                        </div>
                        {guide.useNicknameInLogs && guide.nickname && (
                          <span className="text-[9px] text-[#00e6a8] font-bold block mt-0.5">
                            Logs as nickname: {guide.nickname}
                          </span>
                        )}
                      </div>

                      {/* Actions (Copy, Edit, Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(guide.id)}
                          className="p-1 rounded-lg bg-[#0e222b] hover:bg-[#163746] text-teal-300 hover:text-white border border-[#1b3a4a] cursor-pointer"
                          title="Copy Guide 6-Digit ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditGuide(guide)}
                          className="p-1 rounded-lg bg-[#0e222b] hover:bg-[#163746] text-amber-300 hover:text-white border border-[#1b3a4a] cursor-pointer"
                          title="Edit Guide"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGuide(guide.id, guide.name)}
                          className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                          title="Delete Guide"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* 2. RECTANGULAR MIDDLE: 6-Digit ID Badge + Status Pill + City/Phone */}
                    <div className="flex items-center justify-between gap-2 bg-[#050e12] px-2.5 py-1.5 rounded-xl border border-[#142833]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-[#00e6a8] bg-[#00c896]/15 border border-[#00c896]/30 px-2 py-0.5 rounded-md tracking-wider">
                          ID: {guide.id}
                        </span>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
                          {guide.status || 'Active'}
                        </span>
                      </div>
                      {guide.originCity && (
                        <span className="text-[10px] text-zinc-300 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{guide.originCity}</span>
                        </span>
                      )}
                    </div>

                    {/* 3. BOTTOM: Quick Select in Trip Input Form */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectGuideForTrip) {
                            onSelectGuideForTrip(guide);
                            onClose();
                          } else {
                            copyToClipboard(guide.id);
                          }
                        }}
                        className="flex-1 bg-[#0e242f] hover:bg-[#00c896] hover:text-zinc-950 text-[#00e6a8] border border-[#00c896]/30 text-[11px] font-mono font-bold py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Select ID [{guide.id}]</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBadgePreviewGuide(guide)}
                        className="p-1.5 rounded-xl bg-[#0e222b] hover:bg-[#163746] text-zinc-300 hover:text-white border border-[#1b3a4a] cursor-pointer"
                        title="View Official Badge Card"
                      >
                        <IdCard className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="bg-[#08151c] border border-[#183645] rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#050e12] border-b border-[#183645] text-zinc-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Guide ID (6-Digits)</th>
                        <th className="py-3.5 px-4 font-bold">Full Name</th>
                        <th className="py-3.5 px-4 font-bold">Nickname</th>
                        <th className="py-3.5 px-4 font-bold">Origin / City</th>
                        <th className="py-3.5 px-4 font-bold">Languages</th>
                        <th className="py-3.5 px-4 font-bold">Phone</th>
                        <th className="py-3.5 px-4 font-bold text-center">Status</th>
                        <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#142833]">
                      {filteredGuides.map(guide => (
                        <tr key={guide.id} className="hover:bg-[#0b1e28] transition-colors">
                          <td className="py-3 px-4">
                            <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded font-black text-xs">
                              {guide.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-white uppercase">{guide.name}</td>
                          <td className="py-3 px-4 text-teal-300 font-bold">
                            {guide.nickname ? (
                              <span className="bg-[#0b222a] border border-[#174857] px-2 py-0.5 rounded">
                                {guide.nickname}
                                {guide.useNicknameInLogs && <span className="text-[9px] text-[#00e6a8] ml-1">(Logs)</span>}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">{guide.originCity || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(guide.languages || []).map(l => (
                                <span key={l} className="bg-[#050e12] text-teal-300 border border-[#163543] px-1.5 py-0.2 rounded text-[10px]">
                                  {l}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{guide.phone || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {guide.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectGuideForTrip) {
                                    onSelectGuideForTrip(guide);
                                    onClose();
                                  } else {
                                    copyToClipboard(guide.id);
                                  }
                                }}
                                className="px-2 py-1 bg-[#00c896]/20 hover:bg-[#00c896] hover:text-zinc-950 text-[#00e6a8] rounded-lg border border-[#00c896]/40 text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Select
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditGuide(guide)}
                                className="p-1.5 rounded-lg bg-[#0e222b] hover:bg-[#163746] text-amber-300 hover:text-white border border-[#1b3a4a] cursor-pointer"
                                title="Edit Guide"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGuide(guide.id, guide.name)}
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                                title="Delete Guide"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: DRIVERS ROSTER (TWO PARTS: MINI & BIG VANS) ================= */}
        {activeTab === 'drivers' && (
          <div className="space-y-6 max-w-[1920px] mx-auto">
            {/* 1. MANAGER DRIVER ID LOGGING MODE BANNER */}
            <div className="bg-[#08151c] border border-[#1b3a4a] rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                  localDriverIdMode === 'id'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-[#00c896]/20 text-[#00e6a8] border-[#00c896]/50 shadow-[0_0_15px_rgba(0,200,150,0.2)]'
                }`}>
                  {localDriverIdMode === 'id' ? <QrCode className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Driver Logging Mode:
                    </h3>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                      localDriverIdMode === 'id'
                        ? 'bg-amber-500/25 text-amber-300 border-amber-400'
                        : 'bg-[#00c896]/25 text-[#00e6a8] border-[#00c896]'
                    }`}>
                      {localDriverIdMode === 'id' ? 'Work With ID Active' : 'Work Without ID (Default)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-2xl">
                    {localDriverIdMode === 'id'
                      ? 'Trip Logger is configured to auto-match drivers using 6-digit numeric IDs. Drivers must enter an ID in trip form.'
                      : 'By default, drivers work without IDs. In Trip Logger, drivers are selected freely by name without requiring an ID number.'}
                  </p>
                </div>
              </div>

              {/* Toggle Buttons */}
              <div className="flex items-center gap-1.5 bg-[#050e12] p-1.5 rounded-2xl border border-[#162f3c] shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleToggleDriverIdMode('name')}
                  className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localDriverIdMode === 'name'
                      ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-[#0d1f25]'
                  }`}
                  title="Default Mode: Allow logging drivers without IDs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Work Without ID (Default)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleDriverIdMode('id')}
                  className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    localDriverIdMode === 'id'
                      ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                      : 'text-amber-300 hover:text-white hover:bg-[#0d1f25]'
                  }`}
                  title="Manager ID Mode: Require 6-digit driver IDs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Work With ID</span>
                </button>
              </div>
            </div>

            {/* 2. FLEET OVERVIEW & TWO PARTS NAVIGATION CONTROL BAR */}
            <div className="bg-[#09151a] border border-[#193643] rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg font-mono">
              {/* Fleet Sub-Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterVanType('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterVanType === 'ALL'
                      ? 'bg-white text-zinc-950 font-black shadow-md'
                      : 'bg-[#050e12] text-zinc-400 hover:text-white border border-[#183645]'
                  }`}
                >
                  <span>All Drivers ({drivers.length})</span>
                  <span className="text-[10px] opacity-75">• Two Parts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterVanType('Mini van')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterVanType === 'Mini van'
                      ? 'bg-teal-400 text-zinc-950 font-black shadow-md'
                      : 'bg-[#050e12] text-teal-300 hover:text-white border border-teal-900/60'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Part 1: Mini Vans ({totalMiniCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterVanType('Big van')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterVanType === 'Big van'
                      ? 'bg-amber-400 text-zinc-950 font-black shadow-md'
                      : 'bg-[#050e12] text-amber-300 hover:text-white border border-amber-900/60'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  <span>Part 2: Big Vans ({totalBigCount})</span>
                </button>
              </div>

              {/* Search & Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
                <div className="relative flex-1 sm:w-64 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Driver / ID / Company..."
                    className="w-full bg-[#050e12] border border-[#1b3a4a] focus:border-amber-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none shadow-inner"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenAddDriver('Mini van')}
                    className="bg-teal-500/20 hover:bg-teal-400 hover:text-zinc-950 text-teal-300 border border-teal-500/40 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95"
                    title="Add a Mini Van Driver (1-8 Pax)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Mini Driver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddDriver('Big van')}
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95"
                    title="Add a Big Van Driver (9-18+ Pax)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Big Driver</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. ROSTER CONTENT: TWO DISTINCT PARTS (MINI VANS & BIG VANS) */}
            {filteredDrivers.length === 0 ? (
              <div className="bg-[#08151c] border border-[#183645] rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-2xl font-mono">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold mx-auto shadow-lg">
                  <Bus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {searchQuery || filterVanType !== 'ALL' ? 'No Matching Drivers Found' : 'No Drivers in Roster Yet'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {searchQuery || filterVanType !== 'ALL'
                      ? 'Try adjusting your search query or clear the filter.'
                      : 'Add Mini Van or Big Van drivers to your roster for fleet management and fast trip logging.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddDriver('Mini van')}
                    className="bg-teal-400 hover:bg-teal-300 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Mini Driver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAddDriver('Big van')}
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Big Driver</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 font-mono">
                {/* ================= PART 1: MINI VAN DRIVERS ================= */}
                {(filterVanType === 'ALL' || filterVanType === 'Mini van') && (
                  <div className="space-y-4 bg-[#071319]/80 border border-teal-900/50 rounded-3xl p-5 sm:p-6 shadow-xl">
                    {/* Section Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-teal-900/40 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold shadow-[0_0_12px_rgba(20,184,166,0.25)]">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-md">
                              PART 1
                            </span>
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                              Mini Van Drivers ({miniDriversList.length})
                            </h3>
                          </div>
                          <p className="text-xs text-teal-300/80 mt-0.5">
                            Compact fleet &bull; Capacity 1-8 Pax &bull; Private excursions and small group transfers
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddDriver('Mini van')}
                        className="bg-teal-400 hover:bg-teal-300 text-zinc-950 text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md uppercase transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Mini Driver</span>
                      </button>
                    </div>

                    {/* Mini Driver Cards Grid */}
                    {miniDriversList.length === 0 ? (
                      <div className="bg-[#050e12] border border-[#142d3b] rounded-2xl p-6 text-center text-zinc-400 text-xs">
                        No Mini Van drivers match current search. Click "+ Add Mini Driver" to register one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {miniDriversList.map((driver) => {
                          const originalIndex = drivers.findIndex(
                            (d) => d.name === driver.name && d.vanType === driver.vanType && d.id === driver.id
                          );
                          return (
                            <div
                              key={driver.name + (driver.id || '') + 'mini'}
                              className="bg-[#08151c] border border-teal-800/50 hover:border-teal-400 rounded-3xl p-5 shadow-xl space-y-3 relative group transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-black text-sm shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                                    <Car className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-black uppercase text-teal-300 bg-teal-950/80 border border-teal-700/60 px-2 py-0.5 rounded">
                                        Mini Van
                                      </span>
                                      {driver.id ? (
                                        <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                          ID: {driver.id}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-zinc-400 bg-[#050e12] px-1.5 py-0.2 rounded border border-[#152a36]">
                                          Without ID
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wide mt-1">
                                      {driver.name}
                                    </h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDriver(driver, originalIndex)}
                                    className="p-1.5 rounded-lg bg-[#0e222b] hover:bg-[#163746] text-teal-300 cursor-pointer"
                                    title="Edit Driver"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDriver(originalIndex, driver.name)}
                                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                                    title="Delete Driver"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs bg-[#050e12] p-2.5 rounded-2xl border border-[#142833]">
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-400 text-[10px]">Company:</span>
                                  <strong className="text-[#00e6a8] font-black uppercase">{driver.companyName || 'AGM'}</strong>
                                </div>
                                {driver.originCity && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Origin:</span>
                                    <span className="text-zinc-200">{driver.originCity}</span>
                                  </div>
                                )}
                                {driver.phone && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Phone:</span>
                                    <span className="text-zinc-300">{driver.phone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Quick Select for Trip Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectDriverForTrip) {
                                    onSelectDriverForTrip(driver);
                                    onClose();
                                  } else if (driver.id) {
                                    copyToClipboard(driver.id);
                                  }
                                }}
                                className="w-full py-2 bg-teal-500/15 hover:bg-teal-400 hover:text-zinc-950 text-teal-300 rounded-xl border border-teal-500/40 hover:border-teal-400 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                              >
                                <Check className="w-3 h-3" />
                                <span>Select for Trip Input</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= PART 2: BIG VAN DRIVERS ================= */}
                {(filterVanType === 'ALL' || filterVanType === 'Big van') && (
                  <div className="space-y-4 bg-[#071319]/80 border border-amber-900/50 rounded-3xl p-5 sm:p-6 shadow-xl">
                    {/* Section Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-amber-900/40 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-md">
                              PART 2
                            </span>
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                              Big Van Drivers ({bigDriversList.length})
                            </h3>
                          </div>
                          <p className="text-xs text-amber-300/80 mt-0.5">
                            Standard fleet &bull; Capacity 9-18+ Pax &bull; Full group transport and primary transfers
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddDriver('Big van')}
                        className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md uppercase transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Big Driver</span>
                      </button>
                    </div>

                    {/* Big Driver Cards Grid */}
                    {bigDriversList.length === 0 ? (
                      <div className="bg-[#050e12] border border-[#142d3b] rounded-2xl p-6 text-center text-zinc-400 text-xs">
                        No Big Van drivers match current search. Click "+ Add Big Driver" to register one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {bigDriversList.map((driver) => {
                          const originalIndex = drivers.findIndex(
                            (d) => d.name === driver.name && d.vanType === driver.vanType && d.id === driver.id
                          );
                          return (
                            <div
                              key={driver.name + (driver.id || '') + 'big'}
                              className="bg-[#08151c] border border-amber-800/50 hover:border-amber-400 rounded-3xl p-5 shadow-xl space-y-3 relative group transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black text-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    <Bus className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 rounded">
                                        Big Van
                                      </span>
                                      {driver.id ? (
                                        <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                          ID: {driver.id}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-zinc-400 bg-[#050e12] px-1.5 py-0.2 rounded border border-[#152a36]">
                                          Without ID
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wide mt-1">
                                      {driver.name}
                                    </h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDriver(driver, originalIndex)}
                                    className="p-1.5 rounded-lg bg-[#0e222b] hover:bg-[#163746] text-amber-300 cursor-pointer"
                                    title="Edit Driver"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDriver(originalIndex, driver.name)}
                                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                                    title="Delete Driver"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs bg-[#050e12] p-2.5 rounded-2xl border border-[#142833]">
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-400 text-[10px]">Company:</span>
                                  <strong className="text-[#00e6a8] font-black uppercase">{driver.companyName || 'AGM'}</strong>
                                </div>
                                {driver.originCity && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Origin:</span>
                                    <span className="text-zinc-200">{driver.originCity}</span>
                                  </div>
                                )}
                                {driver.phone && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Phone:</span>
                                    <span className="text-zinc-300">{driver.phone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Quick Select for Trip Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectDriverForTrip) {
                                    onSelectDriverForTrip(driver);
                                    onClose();
                                  } else if (driver.id) {
                                    copyToClipboard(driver.id);
                                  }
                                }}
                                className="w-full py-2 bg-amber-400/15 hover:bg-amber-400 hover:text-zinc-950 text-amber-300 rounded-xl border border-amber-500/40 hover:border-amber-400 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                              >
                                <Check className="w-3 h-3" />
                                <span>Select for Trip Input</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LIVE ID VERIFIER & TESTER ================= */}
        {activeTab === 'verifier' && (
          <div className="max-w-3xl mx-auto space-y-6 font-mono">
            <div className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-[#183645] pb-5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Instant Guide ID Verification
                  </h3>
                  <p className="text-xs text-teal-300/80">
                    Type any Guide ID given by staff to immediately verify identity and display profile details
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Enter 6-Digit ID (or Name) to Test &amp; Verify (e.g. 100001, 200001)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Type 6-Digit ID (numbers) or Name..."
                    className="w-full bg-[#050e12] border-2 border-[#1a3a49] focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-base text-white font-black uppercase placeholder-zinc-500 outline-none shadow-inner tracking-wider"
                    autoFocus
                  />
                  {verifyInput && (
                    <button
                      type="button"
                      onClick={() => setVerifyInput('')}
                      className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Quick test badges */}
                {guides.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] text-zinc-400">Quick Test IDs:</span>
                    {guides.slice(0, 6).map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setVerifyInput(g.id)}
                        className="bg-[#0e222b] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {g.id} ({g.name.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pt-1 text-[10px] text-zinc-400 flex items-center gap-2">
                    <span>No registered guide IDs yet.</span>
                    <button
                      type="button"
                      onClick={handleOpenAddGuide}
                      className="text-[#00e6a8] hover:underline font-bold"
                    >
                      + Register your first guide ID
                    </button>
                  </div>
                )}
              </div>

              {/* Verification Result Card */}
              {verifierResult && (
                <div className="space-y-4 pt-2">
                  {verifierResult.type === 'guide' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#0c242e] to-[#08151c] border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center font-black text-lg">
                            <Check className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              VERIFIED GUIDE IDENTITY MATCH
                            </span>
                            <h2 className="text-xl font-black text-white uppercase tracking-wide">
                              {verifierResult.data.name}
                            </h2>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-[#00e6a8] bg-[#00c896]/20 border border-[#00c896]/50 px-3 py-1 rounded-xl">
                            {verifierResult.data.id}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-[#050e12] p-3 rounded-xl border border-[#163543]">
                          <span className="text-[10px] text-zinc-400 block font-bold">Origin City:</span>
                          <span className="text-white font-bold">{verifierResult.data.originCity || 'Marrakech'}</span>
                        </div>
                        <div className="bg-[#050e12] p-3 rounded-xl border border-[#163543]">
                          <span className="text-[10px] text-zinc-400 block font-bold">Spoken Languages:</span>
                          <span className="text-teal-300 font-bold">{(verifierResult.data.languages || []).join(', ')}</span>
                        </div>
                        <div className="bg-[#050e12] p-3 rounded-xl border border-[#163543]">
                          <span className="text-[10px] text-zinc-400 block font-bold">Official Status:</span>
                          <span className="text-emerald-400 font-bold">{verifierResult.data.status || 'Active Guide'}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <p className="text-xs text-emerald-300/80">
                          This ID is 100% verified. You can safely select this guide for excursion bookings.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectGuideForTrip) {
                              onSelectGuideForTrip(verifierResult.data);
                              onClose();
                            }
                          }}
                          className="bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
                        >
                          Use in Trip Logger
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {verifierResult.type === 'not_found' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-950/30 border border-rose-500/40 rounded-3xl p-6 text-center space-y-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold mx-auto">
                        <BadgeAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-rose-300 uppercase">
                          No Guide Found with ID &ldquo;{verifierResult.query}&rdquo;
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1">
                          The ID does not match any existing guide in the system. Would you like to create and register this new guide?
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddGuide();
                          setGuideIdInput(verifierResult.query);
                          setIdGenerationMode('custom');
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer uppercase shadow-lg inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register New Guide with ID &ldquo;{verifierResult.query}&rdquo;</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. ADD / EDIT GUIDE MODAL (SPACIOUS WIDE VIEW WITHOUT SCROLL) ================= */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className="bg-[#08151c] border border-[#1e4453] rounded-3xl p-5 sm:p-7 max-w-5xl w-full shadow-2xl relative text-left font-mono my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-[#0e222b] hover:bg-[#163645] p-2 rounded-2xl border border-[#1e3b44] cursor-pointer transition-all shadow-md z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#162f3c] pr-12">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00c896]/25 to-teal-500/20 border border-[#00c896]/50 text-[#00e6a8] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,200,150,0.3)]">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                        {editingGuideOriginalId ? 'Edit Guide Profile & ID' : 'Register New Excursion Guide'}
                      </h3>
                      <span className="text-[10px] font-black uppercase text-[#00e6a8] bg-[#00c896]/15 border border-[#00c896]/40 px-2 py-0.5 rounded-full">
                        6-Digit Security
                      </span>
                    </div>
                    <p className="text-xs text-teal-300/80 mt-0.5">
                      Assign unique identification code to eliminate duplicate guide names and power instant trip log matching
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Grid - Two Spacious Columns Without Scroll */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 pt-4 text-xs">
                {/* ================= LEFT COLUMN: IDENTITY & ID CODE ================= */}
                <div className="space-y-3.5 flex flex-col justify-between">
                  {/* Card 1: Names & Nickname */}
                  <div className="bg-[#050e12] border border-[#152e3b] p-3.5 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Guide Full Name *
                        </label>
                        <input
                          type="text"
                          value={guideNameInput}
                          onChange={(e) => setGuideNameInput(e.target.value)}
                          placeholder="e.g. Hassan El Amrani"
                          className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 font-bold uppercase focus:border-[#00e6a8] focus:outline-none shadow-inner"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Nickname</span>
                          <span className="text-zinc-500 text-[10px]">Optional</span>
                        </label>
                        <input
                          type="text"
                          value={guideNicknameInput}
                          onChange={(e) => setGuideNicknameInput(e.target.value)}
                          placeholder="e.g. Simo, Alex"
                          className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Nickname Log Option */}
                    {guideNicknameInput.trim() && (
                      <div className="bg-[#081820] border border-teal-900/60 p-2.5 rounded-xl flex items-center justify-between gap-3">
                        <div className="text-[10px]">
                          <span className="font-bold text-[#00e6a8] block">
                            Use nickname "{guideNicknameInput.trim()}" in daily trip logs?
                          </span>
                          <span className="text-zinc-400 block text-[9px]">
                            Daily logs and summaries will display this nickname.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={guideUseNicknameInLogs}
                            onChange={(e) => setGuideUseNicknameInLogs(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00c896]"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Card 2: 6-Digit ID Code Generator */}
                  <div className="bg-[#050e12] border border-[#162f3c] p-3.5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#00e6a8]" />
                        <span>Guide 6-Digit ID Code *</span>
                      </label>
                      <div className="flex items-center gap-1 bg-[#0b1b22] p-0.5 rounded-lg border border-[#183645]">
                        <button
                          type="button"
                          onClick={() => {
                            setIdGenerationMode('auto');
                            setGuideIdInput(generateNextGuideId());
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            idGenerationMode === 'auto'
                              ? 'bg-[#00c896] text-zinc-950 font-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Next ID
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdGenerationMode('auto');
                            setGuideIdInput(generateRandom6DigitId());
                          }}
                          className="text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors bg-[#112933] text-teal-300 hover:text-white"
                          title="Generate Random 6-Digit ID"
                        >
                          Random
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdGenerationMode('custom')}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            idGenerationMode === 'custom'
                              ? 'bg-amber-400 text-zinc-950 font-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={guideIdInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setGuideIdInput(val);
                        }}
                        placeholder="e.g. 100001"
                        className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-[#00e6a8] px-3 py-2.5 font-black text-sm sm:text-base focus:border-[#00e6a8] focus:outline-none tracking-[0.2em] shadow-inner"
                      />
                      <span className={`absolute right-3 top-2.5 text-[10px] font-bold px-2 py-0.5 rounded ${
                        guideIdInput.length === 6
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                      }`}>
                        {guideIdInput.length === 6 ? '6 Digits Valid' : `${guideIdInput.length}/6 digits`}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      This 6-digit code is typed into Trip Input Details for instant guide selection.
                    </p>
                  </div>

                  {/* Card 3: Contact & Status */}
                  <div className="bg-[#050e12] border border-[#152e3b] p-3.5 rounded-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Phone / WhatsApp</span>
                          <span className="text-zinc-500 text-[10px]">Optional</span>
                        </label>
                        <input
                          type="text"
                          value={guidePhoneInput}
                          onChange={(e) => setGuidePhoneInput(e.target.value)}
                          placeholder="+212 600-000000"
                          className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Status
                        </label>
                        <select
                          value={guideStatusInput}
                          onChange={(e) => setGuideStatusInput(e.target.value as any)}
                          className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none font-bold cursor-pointer"
                        >
                          <option value="Active">Active Guide</option>
                          <option value="On-Call">On-Call Backup</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================= RIGHT COLUMN: ORIGIN, LANGUAGES & SPECIALTIES ================= */}
                <div className="space-y-3.5 flex flex-col justify-between">
                  {/* Card 1: Where he is from / Origin City */}
                  <div className="bg-[#050e12] border border-[#152e3b] p-3.5 rounded-2xl space-y-2">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Where he is from / Origin City</span>
                      <span className="text-zinc-500 text-[10px]">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={guideCityInput}
                      onChange={(e) => setGuideCityInput(e.target.value)}
                      placeholder="e.g. Marrakech, Ourika, Imlil..."
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none shadow-inner"
                    />
                    {/* Quick City Suggestion Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {COMMON_CITIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setGuideCityInput(c)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            guideCityInput.toLowerCase() === c.toLowerCase()
                              ? 'bg-[#00c896]/25 text-[#00e6a8] border-[#00c896] font-black shadow-sm'
                              : 'bg-[#0a1820] text-zinc-400 border-[#162d3a] hover:text-white hover:border-zinc-500'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Languages Speaking */}
                  <div className="bg-[#050e12] border border-[#152e3b] p-3.5 rounded-2xl space-y-2">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Languages Speaking ({guideLanguagesInput.length} selected)</span>
                      <span className="text-teal-400 text-[10px]">Multi-Select</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#08151c] rounded-xl border border-[#142834]">
                      {COMMON_LANGUAGES.map(lang => {
                        const isSelected = guideLanguagesInput.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleGuideLanguage(lang)}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#00c896]/25 text-[#00e6a8] border-[#00c896]/70 shadow-sm'
                                : 'bg-[#0a1820] text-zinc-400 border-[#17303d] hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#00e6a8]" />}
                            <span>{lang}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 3: Specialties & Notes */}
                  <div className="bg-[#050e12] border border-[#152e3b] p-3.5 rounded-2xl space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Specialties / Operational Notes</span>
                      <span className="text-zinc-500 text-[10px]">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={guideNotesInput}
                      onChange={(e) => setGuideNotesInput(e.target.value)}
                      placeholder="e.g. VIP specialist, Agafay sunset expert, Atlas trekking"
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-[#00e6a8] focus:outline-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer / Action Bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-4 mt-4 border-t border-[#162f3c]">
                <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                  <span className="text-teal-300 font-bold">Preview:</span>
                  <span className="text-white font-bold">{guideNameInput.trim() || 'Unnamed Guide'}</span>
                  {guideIdInput && (
                    <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                      ID: {guideIdInput}
                    </span>
                  )}
                  {guideCityInput && (
                    <span className="text-zinc-400 text-[10px]">• {guideCityInput}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#1e3b44] text-zinc-400 font-bold hover:text-white cursor-pointer transition-colors text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGuide}
                    className="bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,200,150,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingGuideOriginalId ? 'Save Guide Changes' : 'Create & Save Guide ID'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 5. ADD / EDIT DRIVER MODAL (SPACIOUS WIDE VIEW) ================= */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className="bg-[#08151c] border border-[#1e4453] rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl relative text-left font-mono my-auto"
            >
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-[#0e222b] hover:bg-[#163645] p-2 rounded-2xl border border-[#1e3b44] cursor-pointer transition-all shadow-md z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 pb-4 border-b border-[#162f3c] pr-12">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <Bus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    {editingDriverOriginalIndex !== null ? 'Edit Driver Profile' : 'Add New Driver to Roster'}
                  </h3>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Register Big Van or Mini Van drivers for roster assignment and vehicle grouping
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
                {/* Left: Driver Name, Company & Vehicle Type */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Driver Full Name *
                    </label>
                    <input
                      type="text"
                      value={driverNameInput}
                      onChange={(e) => setDriverNameInput(e.target.value)}
                      placeholder="e.g. Youssef, Khalid"
                      className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 font-bold uppercase focus:border-amber-400 focus:outline-none shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Vehicle Type Selection - Two Parts: Mini vs Big */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                      Vehicle Category / Fleet Part *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDriverVanTypeInput('Mini van')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          driverVanTypeInput === 'Mini van'
                            ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                            : 'bg-[#0d1f25] border-[#1c3943] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          driverVanTypeInput === 'Mini van' ? 'bg-teal-400 text-zinc-950' : 'bg-[#050e12] text-teal-300'
                        }`}>
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-xs uppercase text-white">Part 1: Mini</div>
                          <div className="text-[9px] text-teal-300/80">1 - 8 Pax</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDriverVanTypeInput('Big van')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          driverVanTypeInput === 'Big van'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-[#0d1f25] border-[#1c3943] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          driverVanTypeInput === 'Big van' ? 'bg-amber-400 text-zinc-950' : 'bg-[#050e12] text-amber-300'
                        }`}>
                          <Bus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-xs uppercase text-white">Part 2: Big</div>
                          <div className="text-[9px] text-amber-300/80">9 - 18+ Pax</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#00e6a8] uppercase tracking-wider mb-1">
                      Transport Company *
                    </label>
                    <input
                      type="text"
                      value={driverCompanyInput}
                      onChange={(e) => setDriverCompanyInput(e.target.value.toUpperCase())}
                      placeholder="AGM"
                      className="w-full rounded-xl border border-[#00c896]/40 bg-[#0d1f25] text-[#00e6a8] p-2.5 font-black uppercase focus:border-[#00e6a8] focus:outline-none shadow-inner"
                    />
                  </div>
                </div>

                {/* Right: Driver ID Code, City & Phone */}
                <div className="space-y-3">
                  <div className="space-y-2 bg-[#050e12] p-3 rounded-2xl border border-[#162f3c]">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                        Driver ID (Optional)
                      </label>
                      <div className="flex items-center gap-1 bg-[#0b1b22] p-0.5 rounded-lg border border-[#183645]">
                        <button
                          type="button"
                          onClick={() => setDriverIdInput(generateNextDriverId())}
                          className="text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors bg-amber-400 text-zinc-950"
                        >
                          Next ID
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverIdInput(String(Math.floor(200000 + Math.random() * 800000)))}
                          className="text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors bg-[#112933] text-amber-300 hover:text-white"
                        >
                          Random
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverIdInput('')}
                          className="text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors text-zinc-400 hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={driverIdInput}
                        onChange={(e) => setDriverIdInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="e.g. 200001 (Optional)"
                        className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-amber-300 px-3 py-2.5 font-black text-sm focus:border-amber-400 focus:outline-none tracking-widest shadow-inner"
                      />
                      {driverIdInput && (
                        <span className="absolute right-3 top-2.5 text-[10px] text-amber-400 font-bold">
                          {driverIdInput.length === 6 ? '6 Digits' : `${driverIdInput.length}/6 digits`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Origin City
                      </label>
                      <input
                        type="text"
                        value={driverCityInput}
                        onChange={(e) => setDriverCityInput(e.target.value)}
                        placeholder="e.g. Marrakech"
                        className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-amber-400 focus:outline-none shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={driverPhoneInput}
                        onChange={(e) => setDriverPhoneInput(e.target.value)}
                        placeholder="+212 600-000000"
                        className="w-full rounded-xl border border-[#1c3943] bg-[#0d1f25] text-white p-2.5 focus:border-amber-400 focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#162f3c]">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1e3b44] text-zinc-400 font-bold hover:text-white cursor-pointer text-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDriver}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDriverOriginalIndex !== null ? 'Update Driver' : 'Save Driver'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 6. GUIDE OFFICIAL BADGE PREVIEW MODAL ================= */}
      <AnimatePresence>
        {badgePreviewGuide && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#09151a] border-2 border-[#00e6a8]/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center space-y-5 font-mono"
            >
              <button
                type="button"
                onClick={() => setBadgePreviewGuide(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-[#12242a] p-2 rounded-full border border-[#1e3b44] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#00c896] to-teal-500 text-zinc-950 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(0,200,150,0.5)]">
                  {badgePreviewGuide.name.charAt(0)}
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wider pt-2">
                  {badgePreviewGuide.name}
                </h3>
                <span className="inline-block bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  GUIDE ID: {badgePreviewGuide.id}
                </span>
              </div>

              <div className="bg-[#050e12] p-3.5 rounded-2xl border border-[#183645] space-y-2 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Station:</span>
                  <span className="text-white font-bold">{badgePreviewGuide.originCity || 'Marrakech'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Languages:</span>
                  <span className="text-teal-300 font-bold">{(badgePreviewGuide.languages || []).join(', ')}</span>
                </div>
                {badgePreviewGuide.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Phone:</span>
                    <span className="text-zinc-200">{badgePreviewGuide.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Status:</span>
                  <span className="text-emerald-400 font-bold">Authorized Active</span>
                </div>
              </div>

              <div className="p-3 bg-white text-zinc-950 rounded-2xl flex items-center justify-center gap-2">
                <QrCode className="w-8 h-8 text-zinc-950" />
                <div className="text-left font-mono">
                  <p className="text-[10px] font-black uppercase">AGM AGAFAY EXCURSIONS</p>
                  <p className="text-[9px] text-zinc-700">VERIFIED ID: {badgePreviewGuide.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  copyToClipboard(badgePreviewGuide.id);
                  setBadgePreviewGuide(null);
                }}
                className="w-full bg-gradient-to-r from-[#00c896] to-teal-400 text-zinc-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Copy Guide ID &amp; Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 7. DEDICATED DELETE CONFIRMATION MODAL ("ARE YOU SURE") ================= */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#08151c] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Confirm Deletion
                  </h3>
                  <p className="text-xs text-rose-300">
                    Are you sure you want to delete this {deleteConfirmTarget.type === 'guide' ? 'Guide ID' : 'Driver'}?
                  </p>
                </div>
              </div>

              <div className="bg-[#040a0d] border border-[#142631] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Target Name:</span>
                  <strong className="text-white font-black text-sm uppercase">{deleteConfirmTarget.name}</strong>
                </div>
                {deleteConfirmTarget.id && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">ID Number:</span>
                    <span className="bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] text-xs font-black px-2 py-0.5 rounded">
                      {deleteConfirmTarget.id}
                    </span>
                  </div>
                )}

                {/* Option: Remove Profile from Active Staff Roster */}
                <div className="pt-2 border-t border-[#142631] space-y-2">
                  <label className="flex items-start gap-2.5 p-2 bg-[#091b24] border border-[#173a4b] rounded-xl cursor-pointer hover:border-[#00c896]/60 transition-all">
                    <input
                      type="checkbox"
                      checked={alsoRemoveFromStaff}
                      onChange={(e) => setAlsoRemoveFromStaff(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#00e6a8] accent-[#00e6a8] cursor-pointer"
                    />
                    <div className="text-left leading-tight">
                      <span className="text-xs font-bold text-white block">
                        Remove Profile from Active Staff Roster
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Removes this {deleteConfirmTarget.type === 'guide' ? 'guide' : 'driver'}'s profile from active staff cards.
                      </span>
                    </div>
                  </label>

                  {/* Complete Data Preservation Guarantee Note */}
                  <div className="p-2.5 bg-[#05141d] border border-cyan-500/30 rounded-xl flex items-center gap-2 text-cyan-300 text-[11px] leading-tight">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      <strong>Data Protection Guarantee:</strong> All past trips in Daily Logged, Excel Table, Camel & Quad fleet activities, and logged names remain 100% intact in the database. Trips are only removed if deleted directly from Daily Logged.
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 pt-1 border-t border-[#142631]">
                  Trip histories, statistics, and work details remain preserved in the system.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2.5 bg-[#0d222b] hover:bg-[#153442] text-zinc-300 text-xs font-bold rounded-xl border border-[#1b3a4a] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Remove ID</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
