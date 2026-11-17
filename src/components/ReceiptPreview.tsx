import { useMemo, useState } from 'react';
import type { ReceiptLayoutConfig, ReceiptSheet } from '../types/sfs';
import {
  formatReceiptLineText,
  getReceiptTemplateCandidates,
  RECEIPT_OVERLAY_BOXES,
  RECEIPT_TEMPLATE_PATH,
} from '../utils/receiptLayout';

interface ReceiptPreviewProps {
  sheet: ReceiptSheet;
  layout: ReceiptLayoutConfig;
  mode?: 'screen' | 'print' | 'physical';
  className?: string;
}

export function ReceiptPreview({
  sheet,
  layout,
  mode = 'screen',
  className = '',
}: ReceiptPreviewProps) {
  const candidates = useMemo(() => getReceiptTemplateCandidates(), []);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageError = candidateIndex >= candidates.length;
  const activeSrc = candidates[candidateIndex] ?? RECEIPT_TEMPLATE_PATH;

  const teacherDisplay =
    sheet.totalPages > 1
      ? `${sheet.substituteTeacherName} (${sheet.pageNumber}/${sheet.totalPages})`
      : sheet.substituteTeacherName;

  const isPrint = mode === 'print';
  const isPhysical = mode === 'physical';
  const useMm = isPrint || isPhysical;

  const teacherLength = teacherDisplay.length;
  const teacherScaleFactor =
    teacherLength > 26 ? 0.8 : teacherLength > 20 ? 0.9 : 1;

  const teacherFontSize = useMm
    ? `${(2.45 * teacherScaleFactor * layout.fontScale).toFixed(3)}mm`
    : `${(6.1 * teacherScaleFactor * layout.fontScale).toFixed(2)}cqw`;

  const offsetX = layout.offsetXPct;
  const offsetY = layout.offsetYPct;

  return (
    <div
      className={`relative overflow-hidden select-none bg-[#0B241C] ${
        isPrint ? 'sfs-print-sheet' : ''
      } ${className}`}
      style={{
        width: useMm ? '40mm' : '100%',
        height: useMm ? '60mm' : undefined,
        aspectRatio: useMm ? undefined : '1024 / 1535',
        containerType: useMm ? undefined : 'inline-size',
      }}
    >
      {!imageError ? (
        <img
          src={activeSrc}
          alt={`Shemford Futuristic School substitution receipt for ${sheet.substituteTeacherName}`}
          onError={() => setCandidateIndex((prev) => prev + 1)}
          className={
            useMm
              ? 'block w-full h-full object-fill pointer-events-none'
              : 'block w-full h-auto object-fill pointer-events-none'
          }
          draggable={false}
        />
      ) : (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-4 text-center bg-[#0B241C] text-[#E5D4A5] border border-[#C7A45A]">
          <p className="text-xs font-semibold">
            Receipt Template Image Missing
          </p>
          <p className="text-[10px] text-[#F7F6F0]/80 mt-1">
            Expected at {RECEIPT_TEMPLATE_PATH}
          </p>
        </div>
      )}

      {/* Teacher Name Overlay — strictly inside blank space above Teacher Name line */}
      <div
        className="absolute z-10 flex items-end overflow-hidden"
        style={{
          left: `${RECEIPT_OVERLAY_BOXES.teacherName.leftPct + offsetX}%`,
          top: `${RECEIPT_OVERLAY_BOXES.teacherName.topPct + offsetY}%`,
          width: `${RECEIPT_OVERLAY_BOXES.teacherName.widthPct}%`,
          height: `${RECEIPT_OVERLAY_BOXES.teacherName.heightPct}%`,
        }}
      >
        <span
          className="block w-full truncate font-semibold tracking-[0.01em] text-[#E5D4A5]"
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: teacherFontSize,
            lineHeight: 1.1,
            paddingBottom: useMm ? '0.25mm' : '0.6cqw',
          }}
          title={teacherDisplay}
        >
          {teacherDisplay}
        </span>
      </div>

      {/* Assignment Lines 1..4 — strictly inside blank space above each numbered line */}
      {RECEIPT_OVERLAY_BOXES.assignmentLines.map((box, idx) => {
        const item = sheet.items[idx];
        if (!item) {
          return null;
        }
        const lineText = formatReceiptLineText(
          item.periodNumber,
          item.className,
          item.subject
        );
        const len = lineText.length;
        const lineScale = len > 38 ? 0.78 : len > 31 ? 0.88 : 1;
        const lineFontSize = useMm
          ? `${(1.82 * lineScale * layout.fontScale).toFixed(3)}mm`
          : `${(4.55 * lineScale * layout.fontScale).toFixed(2)}cqw`;

        return (
          <div
            key={item.assignmentId}
            className="absolute z-10 flex items-end overflow-hidden"
            style={{
              left: `${box.leftPct + offsetX}%`,
              top: `${box.topPct + offsetY}%`,
              width: `${box.widthPct}%`,
              height: `${box.heightPct}%`,
            }}
          >
            <span
              className="block w-full truncate font-medium text-[#F7F6F0]"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontSize: lineFontSize,
                lineHeight: 1.15,
                paddingBottom: useMm ? '0.25mm' : '0.6cqw',
              }}
              title={lineText}
            >
              {lineText}
            </span>
          </div>
        );
      })}
    </div>
  );
}
