import {
  buildInitialTimetable,
  getDefaultDateAndDay,
  INITIAL_CLASSES,
  INITIAL_PERIODS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
} from '../data/schoolData';
import type {
  AppState,
  ConfirmedScheduleSnapshot,
  TeacherReceiptBundle,
} from '../types/sfs';
import { DEFAULT_RECEIPT_LAYOUT } from './receiptLayout';

export const STORAGE_KEY = 'sfs_substitution_system_v1';

interface LegacyAppStateShape extends Partial<AppState> {
  confirmedSnapshot?: Omit<ConfirmedScheduleSnapshot, 'receiptBundles'> | null;
  receiptBundles?: TeacherReceiptBundle[];
}

function normalizeAppState(
  parsed: LegacyAppStateShape,
  fallback: AppState
): AppState {
  let confirmedHistory: ConfirmedScheduleSnapshot[] = Array.isArray(
    parsed.confirmedHistory
  )
    ? parsed.confirmedHistory
    : [];

  // Migrate legacy single-snapshot storage cleanly
  if (
    confirmedHistory.length === 0 &&
    parsed.confirmedSnapshot &&
    Array.isArray(parsed.confirmedSnapshot.assignments)
  ) {
    confirmedHistory = [
      {
        ...parsed.confirmedSnapshot,
        receiptBundles: Array.isArray(parsed.receiptBundles)
          ? parsed.receiptBundles
          : [],
      },
    ];
  }

  return {
    ...fallback,
    teachers: parsed.teachers ?? fallback.teachers,
    classes: parsed.classes ?? fallback.classes,
    subjects: parsed.subjects ?? fallback.subjects,
    periods: parsed.periods ?? fallback.periods,
    timetable: parsed.timetable ?? fallback.timetable,
    selectedDateISO: parsed.selectedDateISO ?? fallback.selectedDateISO,
    absentTeacherIds: parsed.absentTeacherIds ?? fallback.absentTeacherIds,
    draftAssignments: parsed.draftAssignments ?? fallback.draftAssignments,
    confirmedHistory,
    receiptLayout: {
      ...DEFAULT_RECEIPT_LAYOUT,
      ...(parsed.receiptLayout ?? {}),
    },
  };
}

export function createInitialAppState(): AppState {
  const { dateISO } = getDefaultDateAndDay();
  return {
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    subjects: INITIAL_SUBJECTS,
    periods: INITIAL_PERIODS,
    timetable: buildInitialTimetable(),
    selectedDateISO: dateISO,
    absentTeacherIds: [],
    draftAssignments: [],
    confirmedHistory: [],
    receiptLayout: DEFAULT_RECEIPT_LAYOUT,
  };
}

export function loadAppState(): AppState {
  const fallback = createInitialAppState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as LegacyAppStateShape;
    if (
      !parsed ||
      !Array.isArray(parsed.teachers) ||
      !Array.isArray(parsed.timetable)
    ) {
      return fallback;
    }
    return normalizeAppState(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function saveAppState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearAndResetAppState(): AppState {
  const fresh = createInitialAppState();
  saveAppState(fresh);
  return fresh;
}

export function exportAppStateAsJson(state: AppState): string {
  return JSON.stringify(
    {
      schema: 'sfs-substitution-export-v2',
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
}

export function parseImportedAppState(jsonText: string): {
  ok: boolean;
  state?: AppState;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText) as {
      schema?: string;
      data?: LegacyAppStateShape;
    } & LegacyAppStateShape;
    const candidate = parsed.data ?? parsed;

    if (
      !candidate ||
      !Array.isArray(candidate.teachers) ||
      !Array.isArray(candidate.classes) ||
      !Array.isArray(candidate.periods) ||
      !Array.isArray(candidate.timetable)
    ) {
      return {
        ok: false,
        error:
          'Invalid SFS backup file. Expected teachers, classes, periods, and timetable arrays.',
      };
    }

    const fallback = createInitialAppState();
    return {
      ok: true,
      state: normalizeAppState(candidate, fallback),
    };
  } catch {
    return {
      ok: false,
      error: 'Could not parse JSON file. Please verify the file format.',
    };
  }
}
