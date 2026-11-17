import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Printer } from 'lucide-react';
import type { ReceiptLayoutConfig, TeacherReceiptBundle } from '../types/sfs';
import { ReceiptPreview } from './ReceiptPreview';

interface ReceiptCardProps {
  bundle: TeacherReceiptBundle;
  layout: ReceiptLayoutConfig;
  onPrintSingle: (bundle: TeacherReceiptBundle) => void;
  onInspectPhysical: (bundle: TeacherReceiptBundle, sheetIndex: number) => void;
}

export function ReceiptCard({
  bundle,
  layout,
  onPrintSingle,
  onInspectPhysical,
}: ReceiptCardProps) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const safeIndex = Math.min(sheetIndex, bundle.sheets.length - 1);
  const activeSheet = bundle.sheets[safeIndex];

  return (
    <article className="sfs-surface-light rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#12372B]/12 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#0B241C] truncate">
            {bundle.substituteTeacherName}
          </h3>
          <p className="text-xs font-medium text-[#3D4C42] tabular-nums mt-0.5">
            {bundle.totalAssignedPeriods} assigned{' '}
            {bundle.totalAssignedPeriods === 1 ? 'period' : 'periods'}
            {bundle.sheets.length > 1
              ? ` · ${bundle.sheets.length} receipt sheets`
              : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onInspectPhysical(bundle, safeIndex)}
          className="sfs-btn-secondary min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          title="Preview exact 40 mm × 60 mm physical print size"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>40×60 mm</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 bg-[#FAF9F4] flex flex-col items-center">
        <div className="w-full max-w-[230px] rounded-lg overflow-hidden shadow-md border border-[#12372B]/20">
          <ReceiptPreview
            sheet={activeSheet}
            layout={layout}
            mode="screen"
          />
        </div>

        {bundle.sheets.length > 1 && (
          <div className="mt-3.5 flex items-center gap-2.5 text-xs font-semibold text-[#0B241C] tabular-nums">
            <button
              type="button"
              onClick={() => setSheetIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeIndex === 0}
              className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-[#12372B]/25 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous sheet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Sheet {safeIndex + 1} of {bundle.sheets.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setSheetIndex((prev) =>
                  Math.min(bundle.sheets.length - 1, prev + 1)
                )
              }
              disabled={safeIndex >= bundle.sheets.length - 1}
              className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-[#12372B]/25 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next sheet"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-[#12372B]/12 bg-white flex-1 flex flex-col justify-between gap-4">
        <ul className="space-y-1.5 text-xs text-[#1D241E]">
          {activeSheet.items.map((item, idx) => (
            <li
              key={item.assignmentId}
              className="flex items-baseline justify-between gap-2 tabular-nums"
            >
              <span className="font-semibold text-[#0B241C] truncate">
                {idx + 1}. P{item.periodNumber} · {item.className} ·{' '}
                {item.subject}
              </span>
              <span className="text-xs font-medium text-[#3D4C42] shrink-0">
                for {item.absentTeacherName.split(' ')[0]}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onPrintSingle(bundle)}
          className="sfs-btn-emerald w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#EAD8A6] shrink-0" />
          <span>PRINT RECEIPT</span>
        </button>
      </div>
    </article>
  );
}
