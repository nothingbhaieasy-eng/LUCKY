import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type {
  AppState,
  ReceiptLayoutConfig,
  ReceiptSheet,
} from '../types/sfs';
import { DEFAULT_RECEIPT_LAYOUT } from '../utils/receiptLayout';
import { exportAppStateAsJson, parseImportedAppState } from '../utils/storage';
import { ReceiptPreview } from './ReceiptPreview';

interface SettingsPanelProps {
  appState: AppState;
  onUpdateReceiptLayout: (layout: ReceiptLayoutConfig) => void;
  onImportState: (nextState: AppState) => void;
  onResetDemoData: () => void;
}

const SAMPLE_PREVIEW_SHEET: ReceiptSheet = {
  sheetId: 'calibration-preview',
  substituteTeacherId: 'sample',
  substituteTeacherName: 'Kavita Deshmukh',
  pageNumber: 1,
  totalPages: 1,
  items: [
    {
      assignmentId: 's1',
      periodNumber: 1,
      className: '8A',
      subject: 'Mathematics',
      absentTeacherName: 'Arjun Mehta',
    },
    {
      assignmentId: 's2',
      periodNumber: 3,
      className: '9B',
      subject: 'Science',
      absentTeacherName: 'Rohit Kulkarni',
    },
  ],
};

export function SettingsPanel({
  appState,
  onUpdateReceiptLayout,
  onImportState,
  onResetDemoData,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleExportJson = () => {
    const content = exportAppStateAsJson(appState);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfs-substitution-backup-${appState.selectedDateISO}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedAppState(text);
      if (!parsed.ok || !parsed.state) {
        setImportFeedback({
          type: 'error',
          message: parsed.error ?? 'Failed to import JSON file.',
        });
      } else {
        onImportState(parsed.state);
        setImportFeedback({
          type: 'success',
          message: `Imported ${parsed.state.teachers.length} teachers and ${parsed.state.timetable.length} timetable slots.`,
        });
      }
    } catch {
      setImportFeedback({
        type: 'error',
        message: 'Could not read the selected file.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl sfs-welcome-enter">
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6">
        <h1
          className="text-2xl sm:text-3xl font-semibold text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Settings &amp; Data Management
        </h1>
        <p className="text-sm text-[#E6EEE8] mt-1 leading-relaxed">
          Back up school data as JSON, fine-tune 40 × 60 mm receipt text
          alignment, or restore fictional demo records.
        </p>
      </div>

      {/* Data Backup & Restore */}
      <section className="sfs-surface-light rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0B241C]">
            School Data Backup &amp; Restore
          </h2>
          <p className="text-xs sm:text-sm text-[#3D4C42] mt-1">
            All faculty, timetable, absence, and receipt records are stored
            locally in your browser.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="sfs-btn-emerald min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#EAD8A6]" />
            <span>Export Data as JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sfs-btn-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data from JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#9B2C2C] bg-[#FFF8F8] hover:bg-[#FEECEC] border border-[#9B2C2C]/35 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>

        {importFeedback && (
          <p
            className={`text-xs sm:text-sm font-semibold ${
              importFeedback.type === 'error'
                ? 'text-[#9B2C2C]'
                : 'text-[#146C43]'
            }`}
          >
            {importFeedback.message}
          </p>
        )}
      </section>

      {/* Receipt Alignment Calibration */}
      <section className="sfs-surface-light rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 space-y-4 w-full">
            <div>
              <h2 className="text-base font-bold text-[#0B241C]">
                Receipt Text Alignment Calibration
              </h2>
              <p className="text-xs sm:text-sm text-[#3D4C42] mt-1">
                Adjust horizontal/vertical offsets or text scale if your
                printer shifts output slightly on 40 × 60 mm stock.
              </p>
            </div>

            <div className="space-y-3.5">
              <label className="block text-xs font-semibold text-[#0B241C]">
                Horizontal Offset ({appState.receiptLayout.offsetXPct.toFixed(1)}
                %)
                <input
                  type="range"
                  min={-4}
                  max={4}
                  step={0.2}
                  value={appState.receiptLayout.offsetXPct}
                  onChange={(e) =>
                    onUpdateReceiptLayout({
                      ...appState.receiptLayout,
                      offsetXPct: Number(e.target.value),
                    })
                  }
                  className="w-full mt-1.5 accent-[#176B4D] cursor-pointer"
                />
              </label>

              <label className="block text-xs font-semibold text-[#0B241C]">
                Vertical Offset ({appState.receiptLayout.offsetYPct.toFixed(1)}
                %)
                <input
                  type="range"
                  min={-4}
                  max={4}
                  step={0.2}
                  value={appState.receiptLayout.offsetYPct}
                  onChange={(e) =>
                    onUpdateReceiptLayout({
                      ...appState.receiptLayout,
                      offsetYPct: Number(e.target.value),
                    })
                  }
                  className="w-full mt-1.5 accent-[#176B4D] cursor-pointer"
                />
              </label>

              <label className="block text-xs font-semibold text-[#0B241C]">
                Font Scale ({Math.round(appState.receiptLayout.fontScale * 100)}
                %)
                <input
                  type="range"
                  min={0.8}
                  max={1.15}
                  step={0.02}
                  value={appState.receiptLayout.fontScale}
                  onChange={(e) =>
                    onUpdateReceiptLayout({
                      ...appState.receiptLayout,
                      fontScale: Number(e.target.value),
                    })
                  }
                  className="w-full mt-1.5 accent-[#176B4D] cursor-pointer"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => onUpdateReceiptLayout(DEFAULT_RECEIPT_LAYOUT)}
              className="sfs-btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Reset Calibration to Default
            </button>
          </div>

          <div className="w-48 shrink-0 mx-auto md:mx-0">
            <p className="text-xs font-semibold text-[#3D4C42] text-center mb-2">
              Live Alignment Preview
            </p>
            <div className="rounded-lg overflow-hidden border border-[#12372B]/25 shadow-md">
              <ReceiptPreview
                sheet={SAMPLE_PREVIEW_SHEET}
                layout={appState.receiptLayout}
                mode="screen"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-sm w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#0B241C]">
              Reset Demo Data?
            </h3>
            <p className="text-xs text-[#3D4C42] mt-2 leading-relaxed">
              This will restore the fictional sample faculty, default timetable,
              and clear any confirmed substitution receipts in local storage.
            </p>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="sfs-btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setResetConfirmOpen(false);
                }}
                className="min-h-[42px] px-4 py-2 text-xs font-bold text-white bg-[#9B2C2C] hover:bg-[#822727] rounded-lg cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
