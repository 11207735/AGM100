import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Laptop, ChevronRight, UserPlus, Zap, ArrowLeft } from 'lucide-react';

export interface ManagerData {
  id: string;
  name: string;
  lastname: string;
  schoolLevel: string;
  skill: string;
  createdAt?: string;
  startDate?: string;
  startedFrom?: string;
  email?: string;
  phone?: string;
  location?: string;
  employeeId?: string;
  shift?: string;
  status?: string;
  paymentPin?: string;
}

interface AutoPyneIntroProps {
  onStartWork: () => void;
  currentManager: ManagerData | null;
  onOpenAddManager: () => void;
}

export const AutoPyneLogo: React.FC<{ className?: string; animate?: boolean }> = ({ 
  className = "w-36 h-36", 
  animate = true 
}) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 400 370" 
        className="w-full h-full drop-shadow-[0_0_35px_rgba(0,230,168,0.35)]" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="200" cy="180" r="140" fill="url(#logoGlow)" opacity="0.3" />

        <defs>
          <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00e6a8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#008b68" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#030c10" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="legGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#00e6a8" />
          </linearGradient>
        </defs>

        {/* Left diagonal leg of 'A' */}
        <motion.path
          d="M 68 250 L 210 25"
          stroke="url(#legGradient)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />

        {/* Right diagonal leg of 'A' */}
        <motion.path
          d="M 210 25 L 285 272"
          stroke="url(#legGradient)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        />

        {/* Middle sharp crease crossbar extending far out to the right */}
        <motion.path
          d="M 128 195 L 144 212 L 365 105"
          stroke="#00e6a8"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        />

        {/* AutoPyne Text */}
        <motion.text
          x="200"
          y="348"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="56"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2"
          initial={animate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          AutoPyne
        </motion.text>
      </svg>
    </div>
  );
};

export const AgmWorkspaceLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Triangle AutoPyne Icon Mark */}
        <div className="w-10 h-10 sm:w-14 sm:h-14 relative shrink-0">
          <svg viewBox="0 0 400 370" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,230,168,0.5)]" fill="none">
            <path d="M 68 250 L 210 25" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 210 25 L 285 272" stroke="#00e6a8" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 128 195 L 144 212 L 365 105" stroke="#00e6a8" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            <text x="200" y="348" textAnchor="middle" fill="#FFFFFF" fontSize="62" fontWeight="800" fontFamily="sans-serif">AutoPyne</text>
          </svg>
        </div>

        {/* AgmWorkSpace. Typography Logo matching company banner */}
        <div className="text-2xl sm:text-4xl md:text-5xl font-sans tracking-tight flex items-baseline">
          <span className="font-light text-zinc-200">Agm</span>
          <span className="font-extrabold text-white">WorkSpace</span>
          <span className="font-extrabold text-[#00e6a8] drop-shadow-[0_0_12px_#00e6a8]">.</span>
        </div>
      </div>

      {/* Decorative separator line & Amzil Groups Morocco subtitle */}
      <div className="w-full max-w-md sm:max-w-lg mt-2 flex items-center justify-between gap-3 px-1">
        <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#00c896]/60 to-transparent"></div>
        <span className="text-[11px] sm:text-xs font-mono tracking-widest text-[#00e6a8] font-bold uppercase whitespace-nowrap drop-shadow-[0_0_8px_rgba(0,230,168,0.4)]">
          Amzil Groups Morocco &bull; Agafay Workstation
        </span>
        <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#00c896]/60 to-transparent"></div>
      </div>
    </div>
  );
};

export const AutoPyneIntro: React.FC<AutoPyneIntroProps> = ({ 
  onStartWork, 
  currentManager,
  onOpenAddManager
}) => {
  // Phase 1: Pure AutoPyne drawing logo intro animation
  // Automatically advances to Phase 2 after drawing, or immediately upon click/keypress
  const [logoPhaseOnly, setLogoPhaseOnly] = useState<boolean>(true);

  // Auto-transition to Phase 2 after logo animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoPhaseOnly(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation: Space / Enter advances phase to Start Work page or launches work; Escape returns to intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (logoPhaseOnly) {
          setLogoPhaseOnly(false);
        } else {
          onStartWork();
        }
      } else if (e.key === 'Escape') {
        if (!logoPhaseOnly) {
          e.preventDefault();
          setLogoPhaseOnly(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logoPhaseOnly, onStartWork]);

  return (
    <div 
      onClick={() => {
        if (logoPhaseOnly) {
          setLogoPhaseOnly(false);
        }
      }}
      className={`fixed inset-0 z-50 w-screen min-h-screen bg-[#03090d] text-white flex flex-col justify-between p-3 sm:p-6 overflow-y-auto font-sans select-none ${
        logoPhaseOnly ? 'cursor-pointer' : ''
      }`}
    >
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#00c896]/15 to-[#00e6a8]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Tag */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs font-mono border-b border-[#142e38] pb-3 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00e6a8] shadow-[0_0_10px_#00e6a8]" />
          <span className="text-zinc-200 font-bold uppercase tracking-wider text-xs">
            AGM Agafay Workstation
          </span>
          <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
            SYSTEM READY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#091a21] text-teal-300 border border-[#173a46] px-3 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#00e6a8]" />
            <span>Tauri v2 Native Desktop</span>
          </span>
        </div>
      </div>

      {/* Center Main Stage with Smooth Phase Switching */}
      <div className="my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto z-10 w-full px-2">
        <AnimatePresence mode="wait">
          {logoPhaseOnly ? (
            /* PHASE 1: AutoPyne Animated Logo - stays until clicked or Enter is pressed */
            <motion.div
              key="phase-1-autopyne-logo"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center justify-center py-10"
            >
              <AutoPyneLogo className="w-52 h-52 sm:w-64 sm:h-64" animate={true} />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.25, 0.9, 0.25] }}
                transition={{ 
                  delay: 0.6, 
                  duration: 2.2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="mt-8 flex items-center justify-center"
              >
                <p className="text-xs sm:text-sm font-mono text-zinc-300 tracking-[0.25em] uppercase select-none">
                  Press Enter to start
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* PHASE 2: AgmWorkSpace Main Screen */
            <motion.div
              key="phase-2-workspace-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center space-y-5 sm:space-y-6 w-full"
            >
              {/* AgmWorkSpace Banner Card */}
              <div className="py-4 px-6 sm:px-8 rounded-2xl bg-[#081820]/90 border border-[#00c896]/30 shadow-[0_0_40px_rgba(0,200,150,0.15)] backdrop-blur-md w-full">
                <AgmWorkspaceLogo />
              </div>

              {/* Sub-system Indicators in consistent original dark teal palette */}
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-mono">
                <span className="bg-[#00c896]/15 text-[#00e6a8] border border-[#00c896]/30 px-3 py-1 rounded-full font-bold uppercase">
                  Agafay Excursion Engine
                </span>
                <span className="bg-[#00c896]/15 text-[#00e6a8] border border-[#00c896]/30 px-3 py-1 rounded-full font-bold uppercase">
                  Excel Live Sync
                </span>
                <span className="bg-[#091a21] text-teal-300 border border-[#173a46] px-3 py-1 rounded-full font-bold uppercase">
                  AutoPyne Desktop
                </span>
              </div>

              {/* Action Controls */}
              <div className="w-full max-w-md space-y-3.5 pt-1">
                
                {/* START WORK BUTTON - Clean, solid, high-contrast AutoPyne emerald styling */}
                <motion.button
                  type="button"
                  onClick={onStartWork}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full group bg-[#00c896] hover:bg-[#00e6a8] text-[#03090d] font-bold text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_0_30px_rgba(0,200,150,0.35)] hover:shadow-[0_0_50px_rgba(0,230,168,0.6)] transition-all cursor-pointer flex items-center justify-between border border-[#00e6a8]/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#03090d] text-[#00e6a8] flex items-center justify-center shadow">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="tracking-wider uppercase font-mono font-black text-sm sm:text-base leading-tight">
                        Start Work
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-teal-950 uppercase tracking-wider">
                        Press Enter or Click to Launch
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#03090d] group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Manager Session Status Card */}
                {currentManager ? (
                  <div className="bg-[#091b22]/90 border border-[#183c48] p-3 rounded-xl flex items-center justify-between gap-3 font-mono">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/50 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {currentManager.name.charAt(0)}{currentManager.lastname ? currentManager.lastname.charAt(0) : ''}
                      </div>
                      <div className="text-left truncate">
                        <p className="text-xs font-bold text-white truncate">
                          Manager: <span className="text-[#00e6a8]">{currentManager.name} {currentManager.lastname}</span>
                        </p>
                        <span className="text-[10px] text-teal-400/70 block truncate">
                          {currentManager.skill || 'Administrator'} &bull; Active
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenAddManager}
                      className="shrink-0 text-[11px] bg-[#14313b] hover:bg-[#1d4452] text-teal-200 px-3 py-1.5 rounded-lg border border-[#235666] transition-all cursor-pointer font-bold flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3 h-3 text-[#00e6a8]" />
                      <span>Switch</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#091b22]/90 border border-[#183c48] p-3 rounded-xl flex items-center justify-between gap-3 font-mono text-xs">
                    <div className="text-left text-zinc-300">
                      <span className="font-bold text-white block">Default Admin Session</span>
                      <span className="text-[10px] text-teal-400/70">Full Access Active</span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAddManager}
                      className="shrink-0 text-[11px] bg-[#14313b] hover:bg-[#1d4452] text-teal-200 px-3 py-1.5 rounded-lg border border-[#235666] transition-all cursor-pointer font-bold flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3 h-3 text-[#00e6a8]" />
                      <span>Add Manager</span>
                    </button>
                  </div>
                )}

                {/* Back to AutoPyne Intro Animation Button */}
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setLogoPhaseOnly(true)}
                    className="text-[11px] font-mono text-zinc-400 hover:text-[#00e6a8] transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-[#081820]"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back to AutoPyne Intro (Esc)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Footer Credits */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-[#132c35] pt-3 z-10 shrink-0">
        <div className="flex items-center gap-2 text-zinc-300">
          <Laptop className="w-3.5 h-3.5 text-[#00e6a8]" />
          <span>AutoPyne Architecture Systems &copy; 2026</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="text-teal-400 font-bold">Marrakech - Agafay Desert</span>
          <span>&bull;</span>
          <span className="text-zinc-300">OJ-Abde Core</span>
        </div>
      </div>

    </div>
  );
};
