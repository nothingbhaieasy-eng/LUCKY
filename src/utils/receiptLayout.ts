import type { ReceiptLayoutConfig } from '../types/sfs';

export function resolveReceiptTemplatePath(baseOverride?: string): string {
  const metaEnv = (
    import.meta as ImportMeta & { env?: { BASE_URL?: string } }
  ).env;
  const rawBase = baseOverride ?? metaEnv?.BASE_URL;
  if (!rawBase || rawBase === '/') {
    return './assets/sfs-receipt-template.png';
  }
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return `${normalizedBase}assets/sfs-receipt-template.png`;
}

export const RECEIPT_TEMPLATE_PATH = resolveReceiptTemplatePath();

export const RECEIPT_DIMENSIONS_MM = {
  width: 40,
  height: 60,
} as const;

export const DEFAULT_RECEIPT_LAYOUT: ReceiptLayoutConfig = {
  offsetXPct: 0,
  offsetYPct: 0,
  fontScale: 1,
};

export interface OverlaySlotBox {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

/**
 * Coordinates derived directly from 1024 x 1535 template measurements:
 * - TEACHER NAME underline: y = 32.15%, x = 29.8%..89.6%
 * - Line 1 underline:       y = 56.05%, x = 19.7%..90.2%
 * - Line 2 underline:       y = 62.11%, x = 19.7%..90.2%
 * - Line 3 underline:       y = 68.17%, x = 19.7%..90.2%
 * - Line 4 underline:       y = 74.23%, x = 19.7%..90.2%
 * - Principal Sir signature sits safely below y = 82% on the right.
 */
export const RECEIPT_OVERLAY_BOXES: {
  teacherName: OverlaySlotBox;
  assignmentLines: readonly [
    OverlaySlotBox,
    OverlaySlotBox,
    OverlaySlotBox,
    OverlaySlotBox,
  ];
} = {
  teacherName: {
    leftPct: 30.2,
    topPct: 27.2,
    widthPct: 58.6,
    heightPct: 4.5,
  },
  assignmentLines: [
    {
      leftPct: 20.4,
      topPct: 50.8,
      widthPct: 69.0,
      heightPct: 4.9,
    },
    {
      leftPct: 20.4,
      topPct: 56.9,
      widthPct: 69.0,
      heightPct: 4.9,
    },
    {
      leftPct: 20.4,
      topPct: 62.9,
      widthPct: 69.0,
      heightPct: 4.9,
    },
    {
      leftPct: 20.4,
      topPct: 69.0,
      widthPct: 69.0,
      heightPct: 4.9,
    },
  ],
};

export function formatReceiptLineText(
  periodNumber: number,
  className: string,
  subject: string
): string {
  return `Period ${periodNumber} — Class ${className} — ${subject}`;
}
