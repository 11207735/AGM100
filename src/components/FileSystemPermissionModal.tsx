import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderLock,
  FolderCheck,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  Download,
  FileSpreadsheet,
  Database,
  X,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  requestAgmDirectoryHandle,
  writeWorkspaceToDirectoryHandle,
  downloadAgmWorkspaceZip,
  getPythonSyncScriptContent
} from '../utils/agmWorkspaceManager';
import { ResultItem } from './StaffProfilesView';
import { RegisteredGuide, RegisteredDriver } from './IdManagerView';
import { ManagerData } from './AutoPyneIntro';
import { PaymentRates } from './PaymentsDetailsModal';

interface FileSystemPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: ResultItem[];
  registeredGuides: RegisteredGuide[];
  registeredDrivers: RegisteredDriver[];
  managersList: ManagerData[];
  paymentRates: PaymentRates;
  inactiveStaff?: Record<string, any>;
  directoryHandle: FileSystemDirectoryHandle | null;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
  showNotification: (msg: string) => void;
}

export const FileSystemPermissionModal: React.FC<FileSystemPermissionModalProps> = ({
  isOpen,
  onClose,
  trips,
  registeredGuides,
  registeredDrivers,
  managersList,
  paymentRates,
  inactiveStaff,
  directoryHandle,
  setDirectoryHandle,
  showNotification
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const handleRequestPermission = async () => {
    try {
      const handle = await requestAgmDirectoryHandle();
      if (handle) {
        setDirectoryHandle(handle);
        showNotification(`✅ Access Granted to local folder: ${handle.name}`);
        
        // Immediately sync data
        setIsSyncing(true);
        const success = await writeWorkspaceToDirectoryHandle(
          handle,
          trips,
          registeredGuides,
          registeredDrivers,
          managersList,
          paymentRates,
          inactiveStaff
        );
        setIsSyncing(false);
        if (success) {
          showNotification(`📁 Synchronized ${trips.length} trips and Excel workbooks to ${handle.name}!`);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showNotification('Could not gain file system access. Please retry.');
      }
    }
  };

  const handleManualSync = async () => {
    if (!directoryHandle) {
      await handleRequestPermission();
      return;
    }
    setIsSyncing(true);
    const success = await writeWorkspaceToDirectoryHandle(
      directoryHandle,
      trips,
      registeredGuides,
      registeredDrivers,
      managersList,
      paymentRates,
      inactiveStaff
    );
    setIsSyncing(false);
    if (success) {
      showNotification(`✅ Re-synced ${trips.length} records to ${directoryHandle.name}`);
    } else {
      showNotification('⚠️ Permission expired or folder disconnected. Please re-grant access.');
      setDirectoryHandle(null);
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadAgmWorkspaceZip(
        trips,
        registeredGuides,
        registeredDrivers,
        managersList,
        paymentRates,
        inactiveStaff
      );
      showNotification('📦 Downloaded AutoPyne-AGM ZIP Archive (Windows & macOS)');
    } catch (e) {
      showNotification('Failed to download ZIP file.');
    }
  };

  const handleDownloadPythonScript = () => {
    try {
      const content = getPythonSyncScriptContent();
      const blob = new Blob([content], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AutoPyne_AGM_Sync.py';
      a.click();
      URL.revokeObjectURL(url);
      showNotification('🐍 Downloaded AutoPyne_AGM_Sync.py');
    } catch (e) {
      showNotification('Failed to download Python script.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#081219] border border-[#162c3d] rounded-2xl w-full max-w-xl text-zinc-100 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#162c3d] bg-[#0a1721] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                directoryHandle
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {directoryHandle ? <FolderCheck className="w-5 h-5" /> : <FolderLock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>File System Access Permission</span>
                  {directoryHandle ? (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                      ACTION REQUIRED
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  Direct Desktop / Documents Local Storage Integration
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-[#122432] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              directoryHandle
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                directoryHandle ? 'text-emerald-400' : 'text-amber-400'
              }`} />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">
                  {directoryHandle
                    ? `Linked Folder: "${directoryHandle.name}"`
                    : 'System Needs Permission to Access Your Local Files'}
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  {directoryHandle
                    ? 'All daily logged trips, staff assignments, and corporate Excel spreadsheets (.xlsx) are automatically written directly to your local file system.'
                    : 'Granting permission allows AGM Travel to automatically generate Excel workbooks on your computer and keep your JSON databases updated in real time.'}
                </p>
              </div>
            </div>

            {/* Permission Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#050b0f] border border-[#142634] p-3 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-[#00e6a8] font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Real-time Excel (.xlsx)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Saves monthly workbooks with multi-day vertical tables matching corporate standards.
                </p>
              </div>

              <div className="bg-[#050b0f] border border-[#142634] p-3 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Database className="w-4 h-4" />
                  <span>Master JSON Storage</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Mirrors SQLite & JSON database records directly into Documents/AutoPyne-AGM & Desktop/AutoPyne-AGM.
                </p>
              </div>
            </div>

            {/* Primary Action Button */}
            {isSupported ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={directoryHandle ? handleManualSync : handleRequestPermission}
                  disabled={isSyncing}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    directoryHandle
                      ? 'bg-[#00c896] hover:bg-[#00e6a8] text-zinc-950 font-black shadow-[0_0_20px_rgba(0,200,150,0.3)]'
                      : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Writing Files to Disk...</span>
                    </>
                  ) : directoryHandle ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync All Records to {directoryHandle.name}</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-4 h-4" />
                      <span>Grant File System Permission (Select Folder)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 text-center">
                Your browser runs in an environment where direct folder picking is handled via ZIP backup or desktop app. Use the options below.
              </div>
            )}

            {/* Secondary Options: ZIP Export and Python Script */}
            <div className="pt-2 border-t border-[#162c3d] space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block">
                Offline Backup & Sync Tools
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="bg-[#0b1822] hover:bg-[#112433] text-zinc-200 border border-[#1a3449] hover:border-[#244b68] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#00e6a8]" />
                  <span>Download Workspace ZIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPythonScript}
                  className="bg-[#0b1822] hover:bg-[#112433] text-zinc-200 border border-[#1a3449] hover:border-[#244b68] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FolderSync className="w-4 h-4 text-cyan-400" />
                  <span>Python Sync Script</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#162c3d] bg-[#0a1721] flex items-center justify-between text-xs text-zinc-400">
            <span>Total Trips: <strong className="text-white">{trips.length}</strong></span>
            <button
              type="button"
              onClick={onClose}
              className="bg-[#122432] hover:bg-[#1a3448] text-zinc-200 px-4 py-1.5 rounded-lg border border-[#1d3a50] transition-colors cursor-pointer font-bold"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
