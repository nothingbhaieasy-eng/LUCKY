import {
  deriveDayFromDateISO,
  SUBJECT_DEPARTMENT_MAP,
} from '../data/schoolData';
import type {
  CandidateEvaluation,
  ConfirmedScheduleSnapshot,
  DayOfWeek,
  MatchTier,
  PeriodDefinition,
  ReceiptAssignmentItem,
  ReceiptSheet,
  ScheduleValidationResult,
  SchoolClass,
  SubstitutionAssignment,
  Teacher,
  TeacherReceiptBundle,
  TimetableSlot,
} from '../types/sfs';

const MAX_LINES_PER_RECEIPT = 4;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function inferSubjectDepartment(subject: string): string {
  const direct = SUBJECT_DEPARTMENT_MAP[subject];
  if (direct) return direct;
  const lower = normalize(subject);
  for (const [key, dept] of Object.entries(SUBJECT_DEPARTMENT_MAP)) {
    if (normalize(key) === lower) return dept;
  }
  return '';
}

function getTierRank(tier: MatchTier): number {
  switch (tier) {
    case 'exact_main':
      return 1;
    case 'secondary_subject':
      return 2;
    case 'department':
      return 3;
    case 'general_available':
      return 4;
    case 'manual':
      return 5;
    default:
      return 99;
  }
}

export function evaluateMatchTier(
  teacher: Teacher,
  subject: string
): { tier: MatchTier; label: string } {
  const target = normalize(subject);
  if (normalize(teacher.mainSubject) === target) {
    return {
      tier: 'exact_main',
      label: `Exact subject match (${teacher.mainSubject})`,
    };
  }
  if (
    teacher.secondarySubject &&
    normalize(teacher.secondarySubject) === target
  ) {
    return {
      tier: 'secondary_subject',
      label: `Secondary subject expertise (${teacher.secondarySubject})`,
    };
  }
  const subjectDept = inferSubjectDepartment(subject);
  if (subjectDept && normalize(teacher.department) === normalize(subjectDept)) {
    return {
      tier: 'department',
      label: `Same department (${teacher.department})`,
    };
  }
  return {
    tier: 'general_available',
    label: `Available faculty (${teacher.mainSubject})`,
  };
}

export interface GenerateSubstitutionsInput {
  dateISO: string;
  day?: DayOfWeek;
  absentTeacherIds: string[];
  teachers: Teacher[];
  classes: SchoolClass[];
  periods: PeriodDefinition[];
  timetable: TimetableSlot[];
  existingDrafts?: SubstitutionAssignment[];
  preserveManualOverrides?: boolean;
}

export function generateSubstitutions({
  dateISO,
  absentTeacherIds,
  teachers,
  classes,
  periods,
  timetable,
  existingDrafts = [],
  preserveManualOverrides = true,
}: GenerateSubstitutionsInput): SubstitutionAssignment[] {
  const absentSet = new Set(absentTeacherIds);
  if (absentSet.size === 0) return [];

  const derived = deriveDayFromDateISO(dateISO);
  if (!derived.timetableDay) {
    return [];
  }
  const day = derived.timetableDay;

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const periodMap = new Map(periods.map((p) => [p.periodNumber, p]));

  const daySlots = timetable.filter((slot) => slot.day === day);

  // Regular class busy lookup: periodNumber -> Map<teacherId, TimetableSlot>
  const regularClassByPeriod = new Map<number, Map<string, TimetableSlot>>();
  // Daily regular period count per teacher
  const dailyRegularCount = new Map<string, number>();

  for (const slot of daySlots) {
    if (!regularClassByPeriod.has(slot.periodNumber)) {
      regularClassByPeriod.set(slot.periodNumber, new Map());
    }
    regularClassByPeriod.get(slot.periodNumber)!.set(slot.teacherId, slot);
    dailyRegularCount.set(
      slot.teacherId,
      (dailyRegularCount.get(slot.teacherId) ?? 0) + 1
    );
  }

  // Affected slots = regular slots on `day` belonging to absent teachers
  const affectedSlots = daySlots
    .filter((slot) => absentSet.has(slot.teacherId))
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) {
        return a.periodNumber - b.periodNumber;
      }
      const clsA = classMap.get(a.classId)?.name ?? a.classId;
      const clsB = classMap.get(b.classId)?.name ?? b.classId;
      return clsA.localeCompare(clsB);
    });

  // Track substitution bookings per period & total daily sub count
  const subBookedInPeriod = new Map<number, Set<string>>();
  const subCountToday = new Map<string, number>();

  const existingOverrideMap = new Map<string, SubstitutionAssignment>();
  if (preserveManualOverrides) {
    for (const draft of existingDrafts) {
      if (draft.isManualOverride && draft.day === day) {
        const key = `${draft.periodNumber}:${draft.classId}:${draft.absentTeacherId}`;
        existingOverrideMap.set(key, draft);
      }
    }
  }

  const resultsByKey = new Map<string, SubstitutionAssignment>();

  const buildBaseRecord = (slot: TimetableSlot) => {
    const className = classMap.get(slot.classId)?.name ?? slot.classId;
    const absentTeacher = teacherMap.get(slot.teacherId);
    const periodDef = periodMap.get(slot.periodNumber);
    const periodTime = periodDef
      ? `${periodDef.startTime}–${periodDef.endTime}`
      : '';
    return {
      id: `sub-${dateISO}-${day.toLowerCase()}-p${slot.periodNumber}-${slot.classId}`,
      dateISO,
      day,
      periodNumber: slot.periodNumber,
      periodTime,
      classId: slot.classId,
      className,
      subject: slot.subject,
      absentTeacherId: slot.teacherId,
      absentTeacherName: absentTeacher?.name ?? 'Unknown Teacher',
    };
  };

  // Pass 1: Apply valid preserved manual overrides first so auto-engine avoids double-booking them
  for (const slot of affectedSlots) {
    const key = `${slot.periodNumber}:${slot.classId}:${slot.teacherId}`;
    const saved = existingOverrideMap.get(key);
    if (!saved) continue;

    const base = buildBaseRecord(slot);
    if (saved.substituteTeacherId === null) {
      // User explicitly removed assignment -> leave unassigned for manual review
      resultsByKey.set(key, {
        ...base,
        substituteTeacherId: null,
        substituteTeacherName: null,
        reason: 'Assignment cleared manually — manual selection required',
        matchTier: 'unassigned',
        isManualOverride: true,
        status: 'manual_required',
      });
      continue;
    }

    const subTeacher = teacherMap.get(saved.substituteTeacherId);
    const hasRegularClass = regularClassByPeriod
      .get(slot.periodNumber)
      ?.has(saved.substituteTeacherId);
    const alreadySubbing = subBookedInPeriod
      .get(slot.periodNumber)
      ?.has(saved.substituteTeacherId);
    const currentSubCount = subTeacher
      ? subCountToday.get(subTeacher.id) ?? 0
      : 0;
    const withinDailyLimit = Boolean(
      subTeacher && currentSubCount < subTeacher.maxDailySubstitutions
    );

    if (
      subTeacher &&
      subTeacher.active &&
      !absentSet.has(subTeacher.id) &&
      !hasRegularClass &&
      !alreadySubbing &&
      withinDailyLimit
    ) {
      if (!subBookedInPeriod.has(slot.periodNumber)) {
        subBookedInPeriod.set(slot.periodNumber, new Set());
      }
      subBookedInPeriod.get(slot.periodNumber)!.add(subTeacher.id);
      subCountToday.set(subTeacher.id, currentSubCount + 1);

      resultsByKey.set(key, {
        ...base,
        substituteTeacherId: subTeacher.id,
        substituteTeacherName: subTeacher.name,
        reason: `Manual override · ${evaluateMatchTier(subTeacher, slot.subject).label}`,
        matchTier: 'manual',
        isManualOverride: true,
        status: 'proposed',
      });
    }
  }

  // Pass 2: Deterministic automatic assignment for remaining slots
  for (const slot of affectedSlots) {
    const key = `${slot.periodNumber}:${slot.classId}:${slot.teacherId}`;
    if (resultsByKey.has(key)) continue;

    const base = buildBaseRecord(slot);
    const busyRegularInPeriod =
      regularClassByPeriod.get(slot.periodNumber) ?? new Map();
    const busySubInPeriod = subBookedInPeriod.get(slot.periodNumber) ?? new Set();

    const eligibleCandidates = teachers
      .filter((t) => {
        if (!t.active) return false;
        if (absentSet.has(t.id)) return false;
        if (busyRegularInPeriod.has(t.id)) return false;
        if (busySubInPeriod.has(t.id)) return false;
        const currentSubs = subCountToday.get(t.id) ?? 0;
        if (currentSubs >= t.maxDailySubstitutions) return false;
        return true;
      })
      .map((t) => {
        const match = evaluateMatchTier(t, slot.subject);
        const currentSubs = subCountToday.get(t.id) ?? 0;
        const regCount = dailyRegularCount.get(t.id) ?? 0;
        return { teacher: t, match, currentSubs, regCount };
      })
      .sort((a, b) => {
        const tierDiff = getTierRank(a.match.tier) - getTierRank(b.match.tier);
        if (tierDiff !== 0) return tierDiff;
        if (a.currentSubs !== b.currentSubs) {
          return a.currentSubs - b.currentSubs;
        }
        if (a.regCount !== b.regCount) {
          return a.regCount - b.regCount;
        }
        return a.teacher.name.localeCompare(b.teacher.name);
      });

    if (eligibleCandidates.length === 0) {
      resultsByKey.set(key, {
        ...base,
        substituteTeacherId: null,
        substituteTeacherName: null,
        reason:
          'No eligible free teacher within daily workload limit for this period',
        matchTier: 'unassigned',
        isManualOverride: false,
        status: 'manual_required',
      });
      continue;
    }

    const chosen = eligibleCandidates[0];
    if (!subBookedInPeriod.has(slot.periodNumber)) {
      subBookedInPeriod.set(slot.periodNumber, new Set());
    }
    subBookedInPeriod.get(slot.periodNumber)!.add(chosen.teacher.id);
    subCountToday.set(chosen.teacher.id, chosen.currentSubs + 1);

    const priorLabel =
      chosen.currentSubs === 0
        ? '0 prior subs today'
        : `${chosen.currentSubs} prior sub${chosen.currentSubs > 1 ? 's' : ''} today`;

    resultsByKey.set(key, {
      ...base,
      substituteTeacherId: chosen.teacher.id,
      substituteTeacherName: chosen.teacher.name,
      reason: `${chosen.match.label} · Free in Period ${slot.periodNumber} · ${priorLabel}`,
      matchTier: chosen.match.tier,
      isManualOverride: false,
      status: 'proposed',
    });
  }

  return affectedSlots.map((slot) => {
    const key = `${slot.periodNumber}:${slot.classId}:${slot.teacherId}`;
    return resultsByKey.get(key)!;
  });
}

export function getTeacherCandidatesForSlot(
  targetAssignment: SubstitutionAssignment,
  allAssignments: SubstitutionAssignment[],
  absentTeacherIds: string[],
  teachers: Teacher[],
  classes: SchoolClass[],
  timetable: TimetableSlot[]
): CandidateEvaluation[] {
  const absentSet = new Set(absentTeacherIds);
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const regularInPeriod = new Map<string, TimetableSlot>();
  const dailyRegularCount = new Map<string, number>();

  for (const slot of timetable) {
    if (slot.day !== targetAssignment.day) continue;
    dailyRegularCount.set(
      slot.teacherId,
      (dailyRegularCount.get(slot.teacherId) ?? 0) + 1
    );
    if (slot.periodNumber === targetAssignment.periodNumber) {
      regularInPeriod.set(slot.teacherId, slot);
    }
  }

  const subCountToday = new Map<string, number>();
  const subInSamePeriod = new Map<string, SubstitutionAssignment>();

  for (const item of allAssignments) {
    if (!item.substituteTeacherId || item.id === targetAssignment.id) continue;
    subCountToday.set(
      item.substituteTeacherId,
      (subCountToday.get(item.substituteTeacherId) ?? 0) + 1
    );
    if (item.periodNumber === targetAssignment.periodNumber) {
      subInSamePeriod.set(item.substituteTeacherId, item);
    }
  }

  const evaluations: CandidateEvaluation[] = teachers
    .filter((t) => t.active)
    .map((teacher) => {
      const currentSubCount = subCountToday.get(teacher.id) ?? 0;
      const dailyRegularPeriods = dailyRegularCount.get(teacher.id) ?? 0;
      const match = evaluateMatchTier(teacher, targetAssignment.subject);

      if (absentSet.has(teacher.id)) {
        return {
          teacher,
          eligible: false,
          matchTier: match.tier,
          reason: match.label,
          unavailableReason: 'Marked absent today',
          currentSubCount,
          dailyRegularPeriods,
        };
      }

      const regSlot = regularInPeriod.get(teacher.id);
      if (regSlot) {
        const clsName = classMap.get(regSlot.classId)?.name ?? regSlot.classId;
        return {
          teacher,
          eligible: false,
          matchTier: match.tier,
          reason: match.label,
          unavailableReason: `Teaching Class ${clsName} (${regSlot.subject})`,
          currentSubCount,
          dailyRegularPeriods,
        };
      }

      const otherSub = subInSamePeriod.get(teacher.id);
      if (otherSub) {
        return {
          teacher,
          eligible: false,
          matchTier: match.tier,
          reason: match.label,
          unavailableReason: `Already substituting Class ${otherSub.className} in Period ${targetAssignment.periodNumber}`,
          currentSubCount,
          dailyRegularPeriods,
        };
      }

      if (currentSubCount >= teacher.maxDailySubstitutions) {
        return {
          teacher,
          eligible: false,
          matchTier: match.tier,
          reason: match.label,
          unavailableReason: `Daily substitution limit reached (${currentSubCount}/${teacher.maxDailySubstitutions})`,
          currentSubCount,
          dailyRegularPeriods,
        };
      }

      return {
        teacher,
        eligible: true,
        matchTier: match.tier,
        reason: `${match.label} · ${currentSubCount} sub${currentSubCount === 1 ? '' : 's'} today (max ${teacher.maxDailySubstitutions})`,
        currentSubCount,
        dailyRegularPeriods,
      };
    });

  return evaluations.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.eligible) {
      const tierDiff = getTierRank(a.matchTier) - getTierRank(b.matchTier);
      if (tierDiff !== 0) return tierDiff;
      if (a.currentSubCount !== b.currentSubCount) {
        return a.currentSubCount - b.currentSubCount;
      }
    }
    return a.teacher.name.localeCompare(b.teacher.name);
  });
}

export function validateScheduleBeforeConfirm(
  assignments: SubstitutionAssignment[],
  absentTeacherIds: string[],
  teachers: Teacher[],
  classes: SchoolClass[],
  timetable: TimetableSlot[]
): ScheduleValidationResult {
  const errors: string[] = [];
  let unresolvedCount = 0;
  let conflictCount = 0;

  if (assignments.length === 0) {
    return {
      valid: false,
      errors: [
        'No affected timetable periods require substitution for the selected day and absent teachers.',
      ],
      unresolvedCount: 0,
      conflictCount: 0,
    };
  }

  const absentSet = new Set(absentTeacherIds);
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  // Track double-bookings per periodNumber -> teacherId -> assignment
  const periodBookings = new Map<string, SubstitutionAssignment>();
  // Independently count daily substitutions per substitute teacher
  const dailySubCounts = new Map<string, number>();

  for (const item of assignments) {
    const derived = deriveDayFromDateISO(item.dateISO);
    if (!derived.timetableDay || item.day !== derived.timetableDay) {
      conflictCount++;
      errors.push(
        `Period ${item.periodNumber} · Class ${item.className} weekday (${item.day}) does not match calendar date (${item.dateISO}, ${derived.weekday}).`
      );
    }

    if (!item.substituteTeacherId) {
      unresolvedCount++;
      errors.push(
        `Period ${item.periodNumber} · Class ${item.className} (${item.subject}) has no substitute assigned.`
      );
      continue;
    }

    const subTeacher = teacherMap.get(item.substituteTeacherId);
    if (!subTeacher || !subTeacher.active) {
      conflictCount++;
      errors.push(
        `Assigned substitute for Period ${item.periodNumber} · Class ${item.className} is not an active teacher.`
      );
      continue;
    }

    dailySubCounts.set(
      subTeacher.id,
      (dailySubCounts.get(subTeacher.id) ?? 0) + 1
    );

    if (absentSet.has(item.substituteTeacherId)) {
      conflictCount++;
      errors.push(
        `${subTeacher.name} is marked absent and cannot substitute Period ${item.periodNumber} · Class ${item.className}.`
      );
    }

    const regularConflict = timetable.find(
      (slot) =>
        slot.day === item.day &&
        slot.periodNumber === item.periodNumber &&
        slot.teacherId === item.substituteTeacherId
    );
    if (regularConflict) {
      conflictCount++;
      const regClass =
        classMap.get(regularConflict.classId)?.name ?? regularConflict.classId;
      errors.push(
        `${subTeacher.name} already teaches Class ${regClass} (${regularConflict.subject}) in Period ${item.periodNumber}.`
      );
    }

    const bookingKey = `${item.periodNumber}:${item.substituteTeacherId}`;
    const existingSub = periodBookings.get(bookingKey);
    if (existingSub) {
      conflictCount++;
      errors.push(
        `${subTeacher.name} is double-booked in Period ${item.periodNumber} (Class ${existingSub.className} and Class ${item.className}).`
      );
    } else {
      periodBookings.set(bookingKey, item);
    }
  }

  for (const [subId, count] of dailySubCounts.entries()) {
    const subTeacher = teacherMap.get(subId);
    if (subTeacher && count > subTeacher.maxDailySubstitutions) {
      conflictCount++;
      errors.push(
        `${subTeacher.name} has ${count} substitutions assigned, exceeding their daily limit of ${subTeacher.maxDailySubstitutions}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unresolvedCount,
    conflictCount,
  };
}

export function buildScheduleSignature(
  dateISO: string,
  day: DayOfWeek,
  absentTeacherIds: string[],
  assignments: SubstitutionAssignment[]
): string {
  const absentPart = [...absentTeacherIds].sort().join(',');
  const assignPart = [...assignments]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (a) =>
        `${a.periodNumber}:${a.classId}:${a.absentTeacherId}->${a.substituteTeacherId ?? 'NONE'}`
    )
    .join('|');
  return `${dateISO}::${day}::${absentPart}::${assignPart}`;
}

export function groupAssignmentsIntoReceipts(
  assignments: SubstitutionAssignment[],
  batchId: string,
  dateISO: string,
  day: DayOfWeek
): TeacherReceiptBundle[] {
  const bySubstitute = new Map<
    string,
    { teacherName: string; items: ReceiptAssignmentItem[] }
  >();

  for (const item of assignments) {
    if (!item.substituteTeacherId || !item.substituteTeacherName) continue;
    if (!bySubstitute.has(item.substituteTeacherId)) {
      bySubstitute.set(item.substituteTeacherId, {
        teacherName: item.substituteTeacherName,
        items: [],
      });
    }
    bySubstitute.get(item.substituteTeacherId)!.items.push({
      assignmentId: item.id,
      periodNumber: item.periodNumber,
      className: item.className,
      subject: item.subject,
      absentTeacherName: item.absentTeacherName,
    });
  }

  const bundles: TeacherReceiptBundle[] = [];

  const sortedEntries = [...bySubstitute.entries()].sort((a, b) =>
    a[1].teacherName.localeCompare(b[1].teacherName)
  );

  for (const [subId, group] of sortedEntries) {
    const sortedItems = [...group.items].sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) {
        return a.periodNumber - b.periodNumber;
      }
      return a.className.localeCompare(b.className);
    });

    const totalPages = Math.max(
      1,
      Math.ceil(sortedItems.length / MAX_LINES_PER_RECEIPT)
    );
    const sheets: ReceiptSheet[] = [];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const slice = sortedItems.slice(
        pageIdx * MAX_LINES_PER_RECEIPT,
        (pageIdx + 1) * MAX_LINES_PER_RECEIPT
      );
      sheets.push({
        sheetId: `${batchId}-${subId}-p${pageIdx + 1}`,
        substituteTeacherId: subId,
        substituteTeacherName: group.teacherName,
        pageNumber: pageIdx + 1,
        totalPages,
        items: slice,
      });
    }

    bundles.push({
      bundleId: `${batchId}-${subId}`,
      batchId,
      dateISO,
      day,
      substituteTeacherId: subId,
      substituteTeacherName: group.teacherName,
      totalAssignedPeriods: sortedItems.length,
      sheets,
    });
  }

  return bundles;
}

let batchSequence = 0;

export function confirmSubstitutionSchedule(params: {
  dateISO: string;
  absentTeacherIds: string[];
  draftAssignments: SubstitutionAssignment[];
  teachers: Teacher[];
  classes: SchoolClass[];
  timetable: TimetableSlot[];
  existingHistory: ConfirmedScheduleSnapshot[];
}): {
  ok: boolean;
  errors: string[];
  snapshot: ConfirmedScheduleSnapshot | null;
  history: ConfirmedScheduleSnapshot[];
  wasDuplicate: boolean;
} {
  const derived = deriveDayFromDateISO(params.dateISO);
  if (!derived.timetableDay) {
    return {
      ok: false,
      errors: [
        `${params.dateISO} is ${derived.weekday}, which has no scheduled school timetable.`,
      ],
      snapshot: null,
      history: params.existingHistory,
      wasDuplicate: false,
    };
  }
  const day = derived.timetableDay;

  const validation = validateScheduleBeforeConfirm(
    params.draftAssignments,
    params.absentTeacherIds,
    params.teachers,
    params.classes,
    params.timetable
  );

  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      snapshot: null,
      history: params.existingHistory,
      wasDuplicate: false,
    };
  }

  const signatureKey = buildScheduleSignature(
    params.dateISO,
    day,
    params.absentTeacherIds,
    params.draftAssignments
  );

  // Prevent duplicate confirmation & duplicate receipts for the exact same schedule
  const duplicateEntry = params.existingHistory.find(
    (entry) => entry.signatureKey === signatureKey
  );
  if (duplicateEntry && duplicateEntry.receiptBundles.length > 0) {
    return {
      ok: true,
      errors: [],
      snapshot: duplicateEntry,
      history: params.existingHistory,
      wasDuplicate: true,
    };
  }

  batchSequence += 1;
  const batchId = `batch-${params.dateISO}-${Date.now()}-${batchSequence}-${Math.random().toString(36).slice(2, 6)}`;
  const confirmedAssignments: SubstitutionAssignment[] =
    params.draftAssignments.map((item) => ({
      ...item,
      status: 'confirmed',
    }));

  const receiptBundles = groupAssignmentsIntoReceipts(
    confirmedAssignments,
    batchId,
    params.dateISO,
    day
  );

  const snapshot: ConfirmedScheduleSnapshot = {
    batchId,
    dateISO: params.dateISO,
    day,
    confirmedAt: new Date().toISOString(),
    absentTeacherIds: [...params.absentTeacherIds],
    assignments: confirmedAssignments,
    receiptBundles,
    signatureKey,
  };

  return {
    ok: true,
    errors: [],
    snapshot,
    history: [snapshot, ...params.existingHistory],
    wasDuplicate: false,
  };
}
