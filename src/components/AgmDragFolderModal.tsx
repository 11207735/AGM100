import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderUp,
  Folder,
  FileSpreadsheet,
  FolderArchive,
  Download,
  FolderSync,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  HardDrive,
  Users,
  Calendar,
  Sparkles,
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
  Layers,
  Database
} from 'lucide-react';
import { ResultItem } from './StaffProfilesView';
import { RegisteredGuide, RegisteredDriver } from './IdManagerView';
import { ManagerData } from './AutoPyneIntro';
import { PaymentRates } from './PaymentsDetailsModal';
import {
  buildAgmWorkspaceZip,
  getPythonSyncScriptContent,
  parseDroppedAgmFolder,
  requestAgmDirectoryHandle,
  writeWorkspaceToDirectoryHandle,
  AgmRestoreResult
} from '../utils/agmWorkspaceManager';

interface AgmDragFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: ResultItem[];
  guides: RegisteredGuide[];
  drivers: RegisteredDriver[];
  managers: ManagerData[];
  paymentRates: PaymentRates;
  onRestoreWorkspace: (restored: AgmRestoreResult) => void;
  showNotification: (msg: string) => void;
}

export const AgmDragFolderModal: React.FC<AgmDragFolderModalProps> = ({
  isOpen,
  onClose,
  trips,
  guides,
  drivers,
  managers,
  paymentRates,
  onRestoreWorkspace,
  showNotification
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<AgmRestoreResult | null>(null);
  const [activeTab, setActiveTab] = useState<'drag_restore' | 'export_sync' | 'python_setup'>('drag_restore');
  const [linkedDirectoryName, setLinkedDirectoryName] = useState<string | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.items || e.dataTransfer.files) {
      setIsProcessing(true);
      try {
        const items = e.dataTransfer.items.length > 0 ? e.dataTransfer.items : e.dataTransfer.files;
        const result = await parseDroppedAgmFolder(items);
        if (result && (result.trips.length > 0 || result.guides.length > 0 || result.drivers.length > 0 || result.managers.length > 0)) {
          setPreviewData(result);
          showNotification(`Scanned AGM-WorkSpace: ${result.trips.length} trips, ${result.guides.length} guides, ${result.drivers.length} drivers found`);
        } else {
          showNotification("No valid AGM data found in dropped items. Please drop the 'AGM-WorkSpace' folder or backup files.");
        }
      } catch (err: any) {
        console.error('Drop error:', err);
        showNotification("Error reading dropped folder: " + (err.message || 'Unknown error'));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      try {
        const result = await parseDroppedAgmFolder(e.target.files);
        if (result && (result.trips.length > 0 || result.guides.length > 0 || result.drivers.length > 0 || result.managers.length > 0)) {
          setPreviewData(result);
          showNotification(`Loaded ${result.trips.length} trips, ${result.guides.length} guides, ${result.drivers.length} drivers`);
        } else {
          showNotification("Could not find trip or profile records in selected folder.");
        }
      } catch (err: any) {
        showNotification("Error processing files: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const confirmRestore = () => {
    if (!previewData) return;
    onRestoreWorkspace(previewData);
    showNotification(`Restored ${previewData.trips.length} Trips & ${previewData.guides.length + previewData.drivers.length} Profiles from AGM-WorkSpace`);
    setPreviewData(null);
    onClose();
  };

  const handleDownloadZip = async () => {
    try {
      showNotification("Building AGM-WorkSpace.zip (Years, Monthly Excel Workbooks, Database)...");
      const blob = await buildAgmWorkspaceZip(trips, guides, drivers, managers, paymentRates);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AGM-WorkSpace-${new Date().getFullYear()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("AGM-WorkSpace.zip downloaded successfully! Extract to Desktop or Documents.");
    } catch (err: any) {
      showNotification("Error creating zip: " + err.message);
    }
  };

  const handleDownloadPythonScript = () => {
    try {
      const pyContent = getPythonSyncScriptContent();
      const blob = new Blob([pyContent], { type: 'text/x-python;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agm_workspace_sync.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("Downloaded 'agm_workspace_sync.py'! Run 'python agm_workspace_sync.py' to initialize Desktop/Documents folders.");
    } catch (err: any) {
      showNotification("Download failed: " + err.message);
    }
  };

  const handleRequestDirectoryAccess = async () => {
    try {
      setIsSyncingLocal(true);
      const handle = await requestAgmDirectoryHandle();
      if (!handle) {
        showNotification("Directory permission was not granted or not supported in this browser.");
        setIsSyncingLocal(false);
        return;
      }

      setLinkedDirectoryName(handle.name);
      showNotification(`Permission granted for folder: '${handle.name}'. Writing AGM-WorkSpace hierarchy...`);

      const success = await writeWorkspaceToDirectoryHandle(
        handle,
        trips,
        guides,
        drivers,
        managers,
        paymentRates
      );

      if (success) {
        showNotification(`Successfully written Years, Excel Workbooks, and Database to '${handle.name}'!`);
      } else {
        showNotification(`Could not complete writing all files to directory.`);
      }
    } catch (err: any) {
      showNotification("Folder sync error: " + err.message);
    } finally {
      setIsSyncingLocal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-[#09151a] border-2 border-[#00c896]/40 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(0,200,150,0.25)] overflow-hidden text-zinc-100"
      >
        {/* Header */}
        <div className="bg-[#0c1c24] border-b border-[#1b3b47] p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00c896]/30 to-teal-500/20 border border-[#00e6a8] text-[#00e6a8] flex items-center justify-center font-bold shadow-lg">
              <FolderUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  AGM-WorkSpace Server Hub
                </h2>
                <span className="bg-[#00c896]/20 text-[#00e6a8] border border-[#00c896]/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Desktop & Docs
                </span>
              </div>
              <p className="text-xs text-teal-300/80 mt-0.5">
                Offline File Server &bull; Drag Folder to Restore &bull; Python Sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-[#12252e] hover:bg-[#1a3845] p-2 rounded-xl border border-[#1e3e4a] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#060e12] border-b border-[#152e38] px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('drag_restore')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'drag_restore'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white bg-[#0e2129] border border-[#183540]'
            }`}
          >
            <FolderUp className="w-3.5 h-3.5" />
            <span>Drag Folder & Restore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export_sync')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export_sync'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white bg-[#0e2129] border border-[#183540]'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Create & Sync Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('python_setup')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'python_setup'
                ? 'bg-[#00c896] text-zinc-950 font-black shadow-md'
                : 'text-zinc-400 hover:text-white bg-[#0e2129] border border-[#183540]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Python Script Sync</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: DRAG FOLDER & RESTORE */}
          {activeTab === 'drag_restore' && (
            <div className="space-y-4">
              {/* Guidance Banner */}
              <div className="bg-[#0b1b22] border border-[#1b3d4a] rounded-2xl p-4 flex items-start gap-3 text-xs text-zinc-300">
                <ShieldCheck className="w-5 h-5 text-[#00e6a8] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white">How AGM-WorkSpace Standalone Restore Works:</p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    If you cleared your browser data or re-downloaded the app, simply <strong className="text-[#00e6a8]">drag & drop your 'AGM-WorkSpace' folder</strong> into the box below. All daily logged trips, Excel workbooks, registered guides, drivers, and manager settings will be instantly loaded back like a local server.
                  </p>
                </div>
              </div>

              {/* Main Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer relative ${
                  isDragging
                    ? 'border-[#00e6a8] bg-[#00c896]/15 scale-[1.01] shadow-[0_0_40px_rgba(0,200,150,0.3)]'
                    : 'border-[#1f4250] bg-[#0b171c] hover:border-[#00c896]/70 hover:bg-[#0e1f26]'
                }`}
                onClick={() => folderInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFolderSelect}
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  multiple
                  className="hidden"
                />

                <div className="space-y-3 max-w-md mx-auto pointer-events-none">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#00c896]/20 to-teal-500/10 border-2 border-[#00e6a8] text-[#00e6a8] flex items-center justify-center mx-auto shadow-inner">
                    <FolderUp className={`w-8 h-8 ${isDragging ? 'animate-bounce' : ''}`} />
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                      {isDragging ? 'Drop AGM-WorkSpace Folder Here' : 'Drag & Drop "AGM-WorkSpace" Folder'}
                    </h3>
                    <p className="text-xs text-teal-300/80 mt-1">
                      or click to browse and select the folder from Desktop / Documents
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 pt-2 flex-wrap">
                    <span className="bg-[#10242d] px-2.5 py-1 rounded-full border border-[#1b3a45] flex items-center gap-1">
                      <Folder className="w-3 h-3 text-emerald-400" /> Years / year-2026
                    </span>
                    <span className="bg-[#10242d] px-2.5 py-1 rounded-full border border-[#1b3a45] flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-teal-400" /> Excel .xlsx Workbooks
                    </span>
                    <span className="bg-[#10242d] px-2.5 py-1 rounded-full border border-[#1b3a45] flex items-center gap-1">
                      <Database className="w-3 h-3 text-cyan-400" /> database / *.json
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-[#09151a]/95 rounded-3xl flex items-center justify-center flex-col gap-3">
                    <div className="w-8 h-8 border-3 border-[#00e6a8] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-[#00e6a8]">Scanning AGM-WorkSpace hierarchy and workbooks...</p>
                  </div>
                )}
              </div>

              {/* Scanned Preview Data Card */}
              {previewData && (
                <div className="bg-[#0a1e26] border-2 border-[#00c896] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_0_30px_rgba(0,200,150,0.2)]">
                  <div className="flex items-center justify-between border-b border-[#183f4d] pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#00e6a8]" />
                      <h4 className="text-sm font-black text-white uppercase">
                        AGM-WorkSpace Repository Scanned Ready
                      </h4>
                    </div>
                    <span className="text-[11px] text-teal-300 font-bold">
                      Source: {previewData.source}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-[#0e2731] border border-[#1c4857] p-3 rounded-xl">
                      <p className="text-[10px] text-zinc-400 uppercase">Daily Trips</p>
                      <p className="text-xl font-black text-[#00e6a8] mt-0.5">{previewData.trips.length}</p>
                    </div>
                    <div className="bg-[#0e2731] border border-[#1c4857] p-3 rounded-xl">
                      <p className="text-[10px] text-zinc-400 uppercase">Guides</p>
                      <p className="text-xl font-black text-amber-300 mt-0.5">{previewData.guides.length}</p>
                    </div>
                    <div className="bg-[#0e2731] border border-[#1c4857] p-3 rounded-xl">
                      <p className="text-[10px] text-zinc-400 uppercase">Drivers</p>
                      <p className="text-xl font-black text-cyan-300 mt-0.5">{previewData.drivers.length}</p>
                    </div>
                    <div className="bg-[#0e2731] border border-[#1c4857] p-3 rounded-xl">
                      <p className="text-[10px] text-zinc-400 uppercase">Managers</p>
                      <p className="text-xl font-black text-white mt-0.5">{previewData.managers.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="px-4 py-2.5 rounded-xl bg-[#10242e] text-zinc-400 hover:text-white border border-[#1c3c4a] text-xs font-bold cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={confirmRestore}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-[0_0_25px_rgba(0,200,150,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Restore Everything to App</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT & SYNC FOLDER */}
          {activeTab === 'export_sync' && (
            <div className="space-y-4">
              <div className="bg-[#0b171c] border border-[#1e3c49] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#00c896]/20 border border-[#00c896]/40 text-[#00e6a8] flex items-center justify-center font-bold">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Browser File System Permission Sync
                    </h3>
                    <p className="text-xs text-teal-300/80">
                      Link your local Desktop or Documents folder directly to auto-generate all Excel workbooks
                    </p>
                  </div>
                </div>

                <div className="bg-[#071115] border border-[#152e37] p-4 rounded-2xl text-xs text-zinc-300 space-y-2">
                  <p className="text-zinc-200 leading-relaxed">
                    Click the button below to grant permission. The app will create the <strong className="text-[#00e6a8]">AutoPyne-AGM</strong> folder structure in Documents &amp; Desktop:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1 text-[11px]">
                    <li><strong className="text-white">Years/year-2026/...</strong> (12 Monthly folders with stacked daily tables)</li>
                    <li><strong className="text-white">database/</strong> (Full SQLite &amp; JSON snapshot of trips, staff rosters, rates)</li>
                    <li><strong className="text-white">agm_workspace_manifest.json</strong> &amp; <strong className="text-white">AutoPyne_AGM_Sync.py</strong></li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRequestDirectoryAccess}
                    disabled={isSyncingLocal}
                    className="flex-1 bg-gradient-to-r from-[#00c896] via-teal-400 to-[#00e6a8] hover:from-[#00e6a8] hover:to-teal-300 text-zinc-950 font-black text-xs py-3.5 px-4 rounded-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <FolderSync className="w-4 h-4" />
                    <span>{isSyncingLocal ? 'Writing to Folder...' : 'Link & Write AutoPyne-AGM Folder'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="bg-[#12242d] hover:bg-[#1a3542] text-teal-200 border border-[#1e414f] font-bold text-xs py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4 text-[#00e6a8]" />
                    <span>Download .ZIP Archive (Windows &amp; macOS)</span>
                  </button>
                </div>

                {linkedDirectoryName && (
                  <div className="bg-[#09221b] border border-[#00c896]/50 rounded-xl p-3 text-xs text-[#00e6a8] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Connected Directory: <strong>{linkedDirectoryName}</strong> (Synchronized)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PYTHON SCRIPT SETUP */}
          {activeTab === 'python_setup' && (
            <div className="space-y-4">
              <div className="bg-[#0b171c] border border-[#1e3c49] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                    <FileCode2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Python Workspace Sync Service (`AutoPyne_AGM_Sync.py`)
                    </h3>
                    <p className="text-xs text-teal-300/80">
                      Run locally on Windows or macOS to auto-create Desktop/AutoPyne-AGM and Documents/AutoPyne-AGM
                    </p>
                  </div>
                </div>

                <div className="bg-[#071115] border border-[#152e37] p-4 rounded-2xl text-xs space-y-2 text-zinc-300">
                  <p className="font-bold text-white">How to execute the Python Sync Script:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                    <li>Download <strong className="text-amber-300">AutoPyne_AGM_Sync.py</strong> using the button below.</li>
                    <li>Open Command Prompt (Windows) or Terminal (macOS) and run: <code className="text-[#00e6a8] bg-[#0c1f27] px-2 py-0.5 rounded">python AutoPyne_AGM_Sync.py</code></li>
                    <li>It automatically builds <strong className="text-white">Documents/AutoPyne-AGM</strong> and <strong className="text-white">Desktop/AutoPyne-AGM</strong> with all Year &amp; Month Excel files.</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadPythonScript}
                    className="flex-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-zinc-950 font-black text-xs py-3.5 px-4 rounded-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download 'AutoPyne_AGM_Sync.py'</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#071014] border-t border-[#152e38] p-4 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>AGM Travel Agafay Operations WorkSpace Hub</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#10242e] text-zinc-300 hover:text-white border border-[#1b3a45] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
