import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Info,
  Printer,
  X,
} from 'lucide-react';
import type {
  ConfirmedScheduleSnapshot,
  ReceiptLayoutConfig,
  ReceiptSheet,
  TeacherReceiptBundle,
} from '../types/sfs';
import { ReceiptCard } from './ReceiptCard';
import { ReceiptPreview } from './ReceiptPreview';

interface PrintReceiptsProps {
  confirmedHistory: ConfirmedScheduleSnapshot[];
  selectedDateISO: string;
  receiptLayout: ReceiptLayoutConfig;
  onPrintSheets: (sheets: ReceiptSheet[]) => void;
  onReturnDashboard: () => void;
  onGoToSubstitutions: () => void;
}

export function PrintReceipts({
  confirmedHistory,
  selectedDateISO,
  receiptLayout,
  onPrintSheets,
  onReturnDashboard,
  onGoToSubstitutions,
}: PrintReceiptsProps) {
  const [inspectTarget, setInspectTarget] = useState<{
    bundle: TeacherReceiptBundle;
    sheetIndex: number;
  } | null>(null);
  const [showPrintGuide, setShowPrintGuide] = useState(false);

  const uniqueDates = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const entry of confirmedHistory) {
      if (!seen.has(entry.dateISO)) {
        seen.add(entry.dateISO);
        list.push(entry.dateISO);
      }
    }
    return list.sort((a, b) => b.localeCompare(a));
  }, [confirmedHistory]);

  const [dateFilter, setDateFilter] = useState<string>(() =>
    confirmedHistory.some((e) => e.dateISO === selectedDateISO)
      ? selectedDateISO
      : uniqueDates[0] ?? 'ALL'
  );

  // When a new schedule is confirmed, focus the filter on that confirmed date
  const latestBatchId = confirmedHistory[0]?.batchId ?? null;
  const latestBatchDate = confirmedHistory[0]?.dateISO ?? null;
  useEffect(() => {
    if (latestBatchDate) {
      setDateFilter(latestBatchDate);
    }
  }, [latestBatchId, latestBatchDate]);

  const filteredSnapshots = useMemo(() => {
    if (dateFilter === 'ALL') return confirmedHistory;
    const matches = confirmedHistory.filter(
      (entry) => entry.dateISO === dateFilter
    );
    return matches.length > 0 ? matches : confirmedHistory;
  }, [confirmedHistory, dateFilter]);

  const allVisibleBundles = useMemo(
    () => filteredSnapshots.flatMap((snap) => snap.receiptBundles),
    [filteredSnapshots]
  );

  const totalVisiblePeriods = useMemo(
    () =>
      filteredSnapshots.reduce((sum, snap) => sum + snap.assignments.length, 0),
    [filteredSnapshots]
  );

  const totalVisibleSheets = useMemo(
    () =>
      allVisibleBundles.reduce((sum, bundle) => sum + bundle.sheets.length, 0),
    [allVisibleBundles]
  );

  if (confirmedHistory.length === 0) {
    return (
      <section className="sfs-surface-light rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto my-6">
        <h2
          className="text-2xl font-semibold text-[#0B241C]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          No Confirmed Receipts Generated Yet
        </h2>
        <p className="text-sm text-[#3D4C42] mt-2 leading-relaxed">
          Receipts are generated strictly after you mark absent teachers,
          resolve all affected timetable periods, and click{' '}
          <span className="font-bold text-[#0B241C]">
            Confirm Substitutions
          </span>
          .
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoToSubstitutions}
            className="sfs-btn-primary min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-lg cursor-pointer"
          >
            Review Substitutions
          </button>
          <button
            type="button"
            onClick={onReturnDashboard}
            className="sfs-btn-secondary min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-lg cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 sfs-welcome-enter">
      {/* Header & Action Bar */}
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sm:gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F3E7C6]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#EAD8A6]" />
            <span>
              {confirmedHistory.length} confirmed{' '}
              {confirmedHistory.length === 1 ? 'schedule' : 'schedules'} in
              history
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-white mt-1.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Substitution Receipts
          </h2>
          <p className="text-sm text-[#E6EEE8] mt-1 tabular-nums leading-relaxed">
            Showing {allVisibleBundles.length} substitute{' '}
            {allVisibleBundles.length === 1 ? 'receipt' : 'receipts'} ·{' '}
            {totalVisiblePeriods} confirmed{' '}
            {totalVisiblePeriods === 1 ? 'period' : 'periods'} ·{' '}
            {totalVisibleSheets} printable 40 × 60 mm{' '}
            {totalVisibleSheets === 1 ? 'sheet' : 'sheets'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Date Filter */}
          <label className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#F3E7C6] bg-[#061510] border border-[#C7A45A]/50 rounded-lg focus-within:ring-2 focus-within:ring-[#E5D4A5]">
            <Calendar className="w-4 h-4 text-[#EAD8A6] shrink-0" />
            <span>Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter receipts by confirmed date"
              className="flex-1 bg-[#061510] font-mono font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">
                All Confirmed Dates ({confirmedHistory.length})
              </option>
              {uniqueDates.map((d) => {
                const count = confirmedHistory.filter(
                  (e) => e.dateISO === d
                ).length;
                return (
                  <option key={d} value={d}>
                    {d}
                    {count > 1 ? ` (${count} batches)` : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <button
            type="button"
            onClick={onReturnDashboard}
            className="sfs-btn-dark-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#EAD8A6]" />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintGuide((v) => !v)}
            className="sfs-btn-dark-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Info className="w-4 h-4 text-[#EAD8A6]" />
            <span>40×60 mm Print Guide</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onPrintSheets(allVisibleBundles.flatMap((b) => b.sheets))
            }
            disabled={totalVisibleSheets === 0}
            className="sfs-btn-primary min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>PRINT ALL RECEIPTS</span>
          </button>
        </div>
      </div>

      {/* Print Guidance Panel */}
      {showPrintGuide && (
        <div className="sfs-surface-dark text-[#F7F6F0] rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[#EAD8A6]">
                Printer Configuration for 40 mm × 60 mm Receipts
              </h3>
              <p className="text-xs sm:text-sm text-[#E6EEE8] mt-1.5 leading-relaxed">
                CSS <code className="font-mono text-[#F3E7C6]">@page</code>{' '}
                rules set the page size to <strong>40mm × 60mm</strong> with
                zero margins, and each receipt automatically starts on its own
                page. Because browsers and printer drivers can still override
                paper size, verify these settings in your print dialog:
              </p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-white list-disc list-inside">
                <li>
                  Paper / Media Size: Custom <strong>40 mm × 60 mm</strong>
                </li>
                <li>
                  Scale: <strong>100% (Actual Size)</strong> — do not use Fit to
                  Page
                </li>
                <li>
                  Margins: <strong>None / 0 mm</strong>
                </li>
                <li>
                  Options: Enable <strong>Background graphics</strong>, disable
                  Headers &amp; Footers
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowPrintGuide(false)}
              className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#F3E7C6] hover:text-white hover:bg-[#12372B] cursor-pointer shrink-0"
              aria-label="Close print guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmed Batches & Separate Receipt Cards */}
      <div className="space-y-8">
        {filteredSnapshots.map((snapshot) => {
          const confirmedTime = new Date(
            snapshot.confirmedAt
          ).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const batchSheets = snapshot.receiptBundles.flatMap((b) => b.sheets);

          return (
            <section key={snapshot.batchId} className="space-y-4">
              <div className="sfs-surface-dark rounded-xl px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-[#E6EEE8] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-white">
                    {snapshot.day}, {snapshot.dateISO}
                  </span>
                  <span className="text-[#EAD8A6]/65" aria-hidden="true">
                    ·
                  </span>
                  <span>Confirmed at {confirmedTime}</span>
                  <span className="text-[#EAD8A6]/65" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-xs text-[#F3E7C6]">
                    {snapshot.batchId}
                  </span>
                </div>

                {filteredSnapshots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onPrintSheets(batchSheets)}
                    className="sfs-btn-dark-secondary min-h-[40px] inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg self-start sm:self-auto cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#EAD8A6]" />
                    <span>Print This Date Batch ({batchSheets.length})</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {snapshot.receiptBundles.map((bundle) => (
                  <ReceiptCard
                    key={bundle.bundleId}
                    bundle={bundle}
                    layout={receiptLayout}
                    onPrintSingle={(b) => onPrintSheets(b.sheets)}
                    onInspectPhysical={(b, idx) =>
                      setInspectTarget({ bundle: b, sheetIndex: idx })
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Exact 40 x 60 mm Physical Size Preview Modal */}
      {inspectTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Exact 40mm by 60mm physical receipt preview"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#12372B]/12">
              <div>
                <h3 className="text-base font-bold text-[#0B241C]">
                  Exact Print Size Preview (40 mm × 60 mm)
                </h3>
                <p className="text-xs text-[#3D4C42] mt-0.5 font-medium">
                  {inspectTarget.bundle.substituteTeacherName} · Sheet{' '}
                  {inspectTarget.sheetIndex + 1} of{' '}
                  {inspectTarget.bundle.sheets.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#3D4C42] hover:text-[#0B241C] hover:bg-[#FAF9F4] cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-6 bg-[#FAF9F4] rounded-lg mt-4 flex flex-col items-center justify-center border border-[#12372B]/15">
              <div className="text-xs font-mono font-medium text-[#3D4C42] mb-2.5">
                40 mm wide × 60 mm tall (1:1 CSS mm)
              </div>
              <div className="shadow-lg border border-[#12372B]/25">
                <ReceiptPreview
                  sheet={inspectTarget.bundle.sheets[inspectTarget.sheetIndex]}
                  layout={receiptLayout}
                  mode="physical"
                />
              </div>
            </div>

            <p className="text-xs text-[#3D4C42] mt-3.5 leading-relaxed">
              Principal Sir&apos;s signature box at the bottom-right stays
              completely clear. Select{' '}
              <strong className="text-[#0B241C]">100% scale</strong> and{' '}
              <strong className="text-[#0B241C]">0 mm margins</strong> when
              printing.
            </p>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="sfs-btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = inspectTarget.bundle;
                  setInspectTarget(null);
                  onPrintSheets(b.sheets);
                }}
                className="sfs-btn-primary min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print This Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PrintQueueOverlayProps {
  sheets: ReceiptSheet[];
  layout: ReceiptLayoutConfig;
}

export function PrintQueueOverlay({ sheets, layout }: PrintQueueOverlayProps) {
  return (
    <div className="sfs-print-root" aria-hidden="true">
      {sheets.map((sheet) => (
        <ReceiptPreview
          key={sheet.sheetId}
          sheet={sheet}
          layout={layout}
          mode="print"
        />
      ))}
    </div>
  );
}
