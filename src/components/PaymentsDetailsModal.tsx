import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Coins,
  Building2,
  Users,
  Bus,
  Car,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
  Briefcase,
  Bike
} from 'lucide-react';

export interface CustomCompanyRate {
  id: string;
  companyName: string;
  bigVanRate: number; // e.g. 700 DH
  miniVanRate: number; // e.g. 500 DH
  notes?: string;
}

export interface PaymentRates {
  guideDailyRate: number; // default 100 DH
  bigVanDriverDailyRate: number; // default 100 DH
  miniVanDriverDailyRate: number; // default 75 DH
  defaultCompanyBigVanRate: number; // default 700 DH
  defaultCompanyMiniVanRate: number; // default 500 DH
  quadUnitRate: number; // default 150 DH / quad
  camelUnitRate: number; // default 100 DH / camel
  customCompanyRates: CustomCompanyRate[];
}

export const DEFAULT_PAYMENT_RATES: PaymentRates = {
  guideDailyRate: 100,
  bigVanDriverDailyRate: 100,
  miniVanDriverDailyRate: 75,
  defaultCompanyBigVanRate: 700,
  defaultCompanyMiniVanRate: 500,
  quadUnitRate: 150,
  camelUnitRate: 100,
  customCompanyRates: [
    {
      id: 'default-agm',
      companyName: 'AGM',
      bigVanRate: 700,
      miniVanRate: 500,
      notes: 'Standard official AGM fleet tariff per day'
    }
  ]
};

export const getStoredPaymentRates = (): PaymentRates => {
  try {
    const saved = localStorage.getItem('agm_payment_rates');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        guideDailyRate: typeof parsed.guideDailyRate === 'number' ? parsed.guideDailyRate : DEFAULT_PAYMENT_RATES.guideDailyRate,
        bigVanDriverDailyRate: typeof parsed.bigVanDriverDailyRate === 'number' ? parsed.bigVanDriverDailyRate : DEFAULT_PAYMENT_RATES.bigVanDriverDailyRate,
        miniVanDriverDailyRate: typeof parsed.miniVanDriverDailyRate === 'number' ? parsed.miniVanDriverDailyRate : DEFAULT_PAYMENT_RATES.miniVanDriverDailyRate,
        defaultCompanyBigVanRate: typeof parsed.defaultCompanyBigVanRate === 'number' ? parsed.defaultCompanyBigVanRate : DEFAULT_PAYMENT_RATES.defaultCompanyBigVanRate,
        defaultCompanyMiniVanRate: typeof parsed.defaultCompanyMiniVanRate === 'number' ? parsed.defaultCompanyMiniVanRate : DEFAULT_PAYMENT_RATES.defaultCompanyMiniVanRate,
        quadUnitRate: typeof parsed.quadUnitRate === 'number' ? parsed.quadUnitRate : DEFAULT_PAYMENT_RATES.quadUnitRate,
        camelUnitRate: typeof parsed.camelUnitRate === 'number' ? parsed.camelUnitRate : DEFAULT_PAYMENT_RATES.camelUnitRate,
        customCompanyRates: Array.isArray(parsed.customCompanyRates) && parsed.customCompanyRates.length > 0 ? parsed.customCompanyRates : DEFAULT_PAYMENT_RATES.customCompanyRates,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PAYMENT_RATES;
};

export const savePaymentRatesToStorage = (rates: PaymentRates) => {
  try {
    localStorage.setItem('agm_payment_rates', JSON.stringify(rates));
  } catch (err) {
    console.error('Failed to save payment rates:', err);
  }
};

export interface PaymentsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: PaymentRates;
  onSaveRates: (newRates: PaymentRates) => void;
}

export const PaymentsDetailsModal: React.FC<PaymentsDetailsModalProps> = ({
  isOpen,
  onClose,
  rates,
  onSaveRates
}) => {
  const [guideRate, setGuideRate] = useState<number>(rates.guideDailyRate);
  const [bigDriverRate, setBigDriverRate] = useState<number>(rates.bigVanDriverDailyRate);
  const [miniDriverRate, setMiniDriverRate] = useState<number>(rates.miniVanDriverDailyRate);
  const [defaultCompanyBigRate, setDefaultCompanyBigRate] = useState<number>(rates.defaultCompanyBigVanRate);
  const [defaultCompanyMiniRate, setDefaultCompanyMiniRate] = useState<number>(rates.defaultCompanyMiniVanRate);
  const [quadRate, setQuadRate] = useState<number>(rates.quadUnitRate ?? DEFAULT_PAYMENT_RATES.quadUnitRate);
  const [camelRate, setCamelRate] = useState<number>(rates.camelUnitRate ?? DEFAULT_PAYMENT_RATES.camelUnitRate);
  const [companyRatesList, setCompanyRatesList] = useState<CustomCompanyRate[]>(rates.customCompanyRates || []);

  // New / Editing custom company rate square state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState<boolean>(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState<string>('');
  const [companyBigRateInput, setCompanyBigRateInput] = useState<number>(700);
  const [companyMiniRateInput, setCompanyMiniRateInput] = useState<number>(500);
  const [companyNotesInput, setCompanyNotesInput] = useState<string>('');

  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSaveAll = () => {
    const updated: PaymentRates = {
      guideDailyRate: guideRate >= 0 ? guideRate : 100,
      bigVanDriverDailyRate: bigDriverRate >= 0 ? bigDriverRate : 100,
      miniVanDriverDailyRate: miniDriverRate >= 0 ? miniDriverRate : 75,
      defaultCompanyBigVanRate: defaultCompanyBigRate >= 0 ? defaultCompanyBigRate : 700,
      defaultCompanyMiniVanRate: defaultCompanyMiniRate >= 0 ? defaultCompanyMiniRate : 500,
      quadUnitRate: quadRate >= 0 ? quadRate : 150,
      camelUnitRate: camelRate >= 0 ? camelRate : 100,
      customCompanyRates: companyRatesList,
    };
    savePaymentRatesToStorage(updated);
    onSaveRates(updated);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleResetDefaults = () => {
    setGuideRate(DEFAULT_PAYMENT_RATES.guideDailyRate);
    setBigDriverRate(DEFAULT_PAYMENT_RATES.bigVanDriverDailyRate);
    setMiniDriverRate(DEFAULT_PAYMENT_RATES.miniVanDriverDailyRate);
    setDefaultCompanyBigRate(DEFAULT_PAYMENT_RATES.defaultCompanyBigVanRate);
    setDefaultCompanyMiniRate(DEFAULT_PAYMENT_RATES.defaultCompanyMiniVanRate);
    setQuadRate(DEFAULT_PAYMENT_RATES.quadUnitRate);
    setCamelRate(DEFAULT_PAYMENT_RATES.camelUnitRate);
    setCompanyRatesList(DEFAULT_PAYMENT_RATES.customCompanyRates);
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

  const handleDeleteCompanySquare = (id: string) => {
    setCompanyRatesList(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveCompanySquare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyNameInput.trim()) return;

    if (editingCompanyId) {
      setCompanyRatesList(prev =>
        prev.map(c =>
          c.id === editingCompanyId
            ? {
                ...c,
                companyName: companyNameInput.trim().toUpperCase(),
                bigVanRate: companyBigRateInput >= 0 ? companyBigRateInput : 700,
                miniVanRate: companyMiniRateInput >= 0 ? companyMiniRateInput : 500,
                notes: companyNotesInput.trim(),
              }
            : c
        )
      );
    } else {
      const newSquare: CustomCompanyRate = {
        id: `comp-rate-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyName: companyNameInput.trim().toUpperCase(),
        bigVanRate: companyBigRateInput >= 0 ? companyBigRateInput : 700,
        miniVanRate: companyMiniRateInput >= 0 ? companyMiniRateInput : 500,
        notes: companyNotesInput.trim(),
      };
      setCompanyRatesList(prev => [...prev, newSquare]);
    }

    setShowAddCompanyModal(false);
    setEditingCompanyId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#09151a] border border-[#1e3b44] rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl relative text-left space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar font-mono"
      >
        {/* Header Toolbar */}
        <div className="flex items-center justify-between border-b border-[#1e3b44] pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00c896]/30 to-[#008f6b]/20 border border-[#00e6a8] text-[#00e6a8] flex items-center justify-center font-black text-lg shadow-[0_0_20px_rgba(0,200,150,0.25)] shrink-0">
              <Coins className="w-6 h-6 text-[#00e6a8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Payments Details & Tariffs
                </h2>
                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Daily Rates
                </span>
              </div>
              <p className="text-xs text-teal-300/80 mt-0.5">
                Configure manager daily rates for guides, drivers, and transport company vehicles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="bg-[#11232e] hover:bg-[#183242] text-zinc-300 hover:text-white border border-[#1c3948] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Reset to original defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-[#12242a] p-2 rounded-xl border border-[#1e3b44] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {savedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center gap-2 text-emerald-300 text-xs font-bold"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Payments details & daily rates successfully updated and saved!</span>
          </motion.div>
        )}

        {/* SECTION 1: EMPLOYEES DAILY PAY (GUIDE, BIG DRIVER, MINI DRIVER) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00e6a8]" />
              <span>1. Employee Staff Daily Payout</span>
            </h3>
            <span className="text-[10px] text-teal-300/70">Calculated per day worked</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Guide Daily Pay */}
            <div className="bg-[#0c1a20] border border-[#19333e] rounded-2xl p-4 space-y-2 shadow-md hover:border-[#00e6a8]/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Guide Daily Pay
                </span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                  {guideRate} DH / Day
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Amount paid to excursion guide for 1 full working day.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={guideRate}
                    onChange={(e) => setGuideRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#050e12] border border-[#193543] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-[#00e6a8]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH</span>
                </div>
              </div>
            </div>

            {/* Big Van Driver Daily Pay */}
            <div className="bg-[#0c1a20] border border-[#19333e] rounded-2xl p-4 space-y-2 shadow-md hover:border-amber-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5" />
                  Big Van Drivers
                </span>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                  {bigDriverRate} DH / Day
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Daily driver compensation for operating large Big Vans.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={bigDriverRate}
                    onChange={(e) => setBigDriverRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#050e12] border border-[#193543] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH</span>
                </div>
              </div>
            </div>

            {/* Mini Van Driver Daily Pay */}
            <div className="bg-[#0c1a20] border border-[#19333e] rounded-2xl p-4 space-y-2 shadow-md hover:border-cyan-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  Mini Van Drivers
                </span>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                  {miniDriverRate} DH / Day
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Daily driver compensation for operating Mini Vans (H1).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={miniDriverRate}
                    onChange={(e) => setMiniDriverRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#050e12] border border-[#193543] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DEFAULT COMPANY TRANSPORTS (BIG VAN & MINI VAN) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>2. Default Transport Companies Vehicle Rates</span>
            </h3>
            <span className="text-[10px] text-zinc-400">Standard Vehicle Cost in a Day</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Default Big Van Rate */}
            <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5" />
                  Company Big Vans Daily Rate
                </span>
                <span className="text-xs font-black text-amber-400 bg-amber-950/90 border border-amber-500/40 px-2 py-0.5 rounded">
                  {defaultCompanyBigRate} DH / Day
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Standard daily vehicle rate for Big Van transport (e.g. 700 DH in a day).
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={defaultCompanyBigRate}
                  onChange={(e) => setDefaultCompanyBigRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-[#00e6a8]"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Day</span>
              </div>
            </div>

            {/* Default Mini Van Rate */}
            <div className="bg-[#0b1b22] border border-[#193643] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  Company Mini Vans Daily Rate
                </span>
                <span className="text-xs font-black text-cyan-400 bg-cyan-950/90 border border-cyan-500/40 px-2 py-0.5 rounded">
                  {defaultCompanyMiniRate} DH / Day
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Standard daily vehicle rate for Mini Van transport (e.g. 500 DH in a day).
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={defaultCompanyMiniRate}
                  onChange={(e) => setDefaultCompanyMiniRate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-[#050e12] border border-[#1a3847] rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-bold">DH / Day</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: QUADS & CAMELS ACTIVITY TARIFFS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bike className="w-4 h-4 text-amber-400" />
              <span>3. Quads & Camels Activities Tariffs</span>
            </h3>
            <span className="text-[10px] text-amber-300/70">Per Unit Excursion Rate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                Base money rate per quad bike excursion session (e.g. 150 DH).
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
                Base money rate per camel ride excursion session (e.g. 100 DH).
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

        {/* SECTION 4: CUSTOM COMPANY TRANSPORT SQUARES (DIFFERENT COMPANIES WITH DIFFERENT MONEY) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00e6a8]" />
                <span>4. Custom Company Transport Squares ({companyRatesList.length})</span>
              </h3>
              <p className="text-[10px] text-teal-300/70 mt-0.5">
                Add special squares for companies with different daily payout rates
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCompany}
              className="bg-gradient-to-r from-[#00c896] to-teal-400 hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Company Square</span>
            </button>
          </div>

          {companyRatesList.length === 0 ? (
            <div className="bg-[#0a1820] border border-[#183644] rounded-2xl p-6 text-center space-y-2">
              <Building2 className="w-8 h-8 text-teal-500/50 mx-auto" />
              <p className="text-xs font-bold text-zinc-300">No custom company transport squares configured</p>
              <p className="text-[11px] text-zinc-500">
                All transport companies will use the default rates (Big Van: {defaultCompanyBigRate} DH, Mini Van: {defaultCompanyMiniRate} DH).
              </p>
              <button
                type="button"
                onClick={handleOpenAddCompany}
                className="mt-2 bg-[#122832] hover:bg-[#1a3846] text-[#00e6a8] border border-[#1e4759] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Company Square</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {companyRatesList.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-[#0b1c24] border border-[#1b3e4f] rounded-2xl p-4 space-y-3 shadow-lg relative group hover:border-[#00e6a8]/60 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center font-black text-xs">
                        {comp.companyName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wide">
                          {comp.companyName}
                        </h4>
                        <span className="text-[10px] text-zinc-400 block">
                          {comp.notes || 'Custom transport rates'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCompany(comp)}
                        className="p-1.5 rounded-lg bg-[#0e242e] hover:bg-[#153443] text-teal-300 border border-[#1b4356] transition-colors"
                        title="Edit Company Rate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompanySquare(comp.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors"
                        title="Delete Company Square"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Company Rate Square Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#071319] border border-[#173543] p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-amber-300 font-bold block">Big Van Rate</span>
                      <span className="text-sm font-black text-white">{comp.bigVanRate} DH</span>
                      <span className="text-[9px] text-zinc-500 block">per day</span>
                    </div>

                    <div className="bg-[#071319] border border-[#173543] p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-cyan-300 font-bold block">Mini Van Rate</span>
                      <span className="text-sm font-black text-white">{comp.miniVanRate} DH</span>
                      <span className="text-[9px] text-zinc-500 block">per day</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#1e3b44] pt-4 flex-wrap gap-3">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Rates apply automatically to all money calculations & summaries.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#12242a] hover:bg-[#1a333b] text-zinc-300 hover:text-white border border-[#1e3b44] text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,200,150,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Payments Details</span>
            </button>
          </div>
        </div>

        {/* SUB-MODAL: ADD / EDIT COMPANY TRANSPORT SQUARE */}
        <AnimatePresence>
          {showAddCompanyModal && (
            <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a1820] border border-[#1f4354] rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#1b3e4f] pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#00e6a8]" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {editingCompanyId ? 'Edit Company Square' : 'Add Company Transport Square'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCompanyModal(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveCompanySquare} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase mb-1">
                      Transport Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ATLAS TOURS, MARRAKECH VANS, AGM VIP"
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      required
                      className="w-full bg-[#061117] border border-[#1b3e4f] rounded-xl px-3 py-2 text-white font-bold uppercase placeholder-zinc-500 focus:outline-none focus:border-[#00e6a8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 uppercase mb-1">
                        Big Van Rate (DH/Day)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="25"
                        value={companyBigRateInput}
                        onChange={(e) => setCompanyBigRateInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        required
                        className="w-full bg-[#061117] border border-[#1b3e4f] rounded-xl px-3 py-2 text-white font-black focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-cyan-300 uppercase mb-1">
                        Mini Van Rate (DH/Day)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="25"
                        value={companyMiniRateInput}
                        onChange={(e) => setCompanyMiniRateInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        required
                        className="w-full bg-[#061117] border border-[#1b3e4f] rounded-xl px-3 py-2 text-white font-black focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                      Notes / Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Subcontractor contract, VIP weekend fleet..."
                      value={companyNotesInput}
                      onChange={(e) => setCompanyNotesInput(e.target.value)}
                      className="w-full bg-[#061117] border border-[#1b3e4f] rounded-xl px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b3e4f]">
                    <button
                      type="button"
                      onClick={() => setShowAddCompanyModal(false)}
                      className="px-3.5 py-2 rounded-xl bg-[#12242a] text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{editingCompanyId ? 'Update Square' : 'Add Square'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
