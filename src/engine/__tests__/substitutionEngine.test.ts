import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildInitialTimetable,
  deriveDayFromDateISO,
  INITIAL_CLASSES,
  INITIAL_PERIODS,
  INITIAL_TEACHERS,
} from '../../data/schoolData';
import type { ConfirmedScheduleSnapshot, Teacher, TimetableSlot } from '../../types/sfs';
import {
  getReceiptTemplateCandidates,
  RECEIPT_OVERLAY_BOXES,
  RECEIPT_TEMPLATE_PATH,
  resolveReceiptTemplatePath,
} from '../../utils/receiptLayout';
import {
  confirmSubstitutionSchedule,
  generateSubstitutions,
  getTeacherCandidatesForSlot,
  groupAssignmentsIntoReceipts,
  validateScheduleBeforeConfirm,
} from '../substitutionEngine';

function runTests() {
  const timetable = buildInitialTimetable();
  const mondayISO = '2026-11-16'; // Monday
  const wednesdayISO = '2026-11-18'; // Wednesday
  const sundayISO = '2026-11-22'; // Sunday

  // Verify initial timetable has zero double-booked teachers
  const slotMap = new Set<string>();
  for (const s of timetable) {
    const key = `${s.day}:${s.periodNumber}:${s.teacherId}`;
    assert.equal(
      slotMap.has(key),
      false,
      `Initial timetable conflict detected: ${key}`
    );
    slotMap.add(key);
  }
  console.log('✓ Initial weekly timetable verified conflict-free');

  // 1. One absent teacher with multiple affected periods
  const singleAbsent = generateSubstitutions({
    dateISO: mondayISO,
    absentTeacherIds: ['tch-arjun'],
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable,
  });
  assert.equal(
    singleAbsent.length,
    4,
    'Arjun Mehta has 4 classes on Monday (P1 8A, P3 8B, P5 9B, P6 10A)'
  );
  assert.ok(
    singleAbsent.every((a) => a.substituteTeacherId !== null && a.day === 'Monday'),
    'All 4 periods should receive eligible substitutes on derived Monday'
  );
  console.log('✓ Test 1: One absent teacher with multiple affected periods');

  // 2. Multiple absent teachers
  const multiAbsent = generateSubstitutions({
    dateISO: mondayISO,
    absentTeacherIds: ['tch-arjun', 'tch-kavita'],
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable,
  });
  assert.equal(
    multiAbsent.length,
    9,
    'Arjun (4) + Kavita (5) = 9 affected periods on Monday'
  );
  console.log('✓ Test 2: Multiple absent teachers');

  // 3 & 4. One substitute receiving multiple periods & different substitutes receiving different assignments
  const subCounts = new Map<string, number>();
  for (const item of multiAbsent) {
    assert.ok(item.substituteTeacherId);
    subCounts.set(
      item.substituteTeacherId!,
      (subCounts.get(item.substituteTeacherId!) ?? 0) + 1
    );
  }
  assert.ok(
    subCounts.size >= 2,
    'Different substitute teachers should receive assignments'
  );
  console.log('✓ Test 3 & 4: Substitute distribution across faculty verified');

  // 5. Teacher who already has a class in that period is NEVER assigned
  for (const item of multiAbsent) {
    const regularClass = timetable.find(
      (s) =>
        s.day === 'Monday' &&
        s.periodNumber === item.periodNumber &&
        s.teacherId === item.substituteTeacherId
    );
    assert.equal(
      regularClass,
      undefined,
      `Teacher ${item.substituteTeacherName} has a regular class in Period ${item.periodNumber}`
    );
  }
  console.log('✓ Test 5: Teachers with regular class in period excluded');

  // 6. Teacher already assigned another substitution in that period is NEVER double-booked
  const periodSubSet = new Set<string>();
  for (const item of multiAbsent) {
    const key = `${item.periodNumber}:${item.substituteTeacherId}`;
    assert.equal(
      periodSubSet.has(key),
      false,
      `Double booking in Period ${item.periodNumber} for ${item.substituteTeacherName}`
    );
    periodSubSet.add(key);
  }
  console.log('✓ Test 6: No teacher double-booked across substitutions in same period');

  // 7. Absent teacher excluded as a substitute
  const absentSet = new Set(['tch-arjun', 'tch-kavita']);
  for (const item of multiAbsent) {
    assert.equal(
      absentSet.has(item.substituteTeacherId!),
      false,
      'Absent teacher must never be assigned as a substitute'
    );
  }
  console.log('✓ Test 7: Absent teachers excluded from substitute pool');

  // 8. No available substitute -> MANUAL ASSIGNMENT REQUIRED
  const tinyTeachers: Teacher[] = [
    {
      id: 't1',
      name: 'Teacher One',
      shortCode: 'T1',
      mainSubject: 'Mathematics',
      secondarySubject: '',
      department: 'Mathematics',
      maxDailySubstitutions: 2,
      active: true,
    },
    {
      id: 't2',
      name: 'Teacher Two',
      shortCode: 'T2',
      mainSubject: 'Science',
      secondarySubject: '',
      department: 'Science',
      maxDailySubstitutions: 2,
      active: true,
    },
  ];
  const tightTimetable: TimetableSlot[] = [
    {
      id: 's1',
      day: 'Monday',
      periodNumber: 1,
      classId: 'cls-8a',
      subject: 'Mathematics',
      teacherId: 't1',
    },
    {
      id: 's2',
      day: 'Monday',
      periodNumber: 1,
      classId: 'cls-8b',
      subject: 'Science',
      teacherId: 't2',
    },
  ];
  const noSubResult = generateSubstitutions({
    dateISO: mondayISO,
    absentTeacherIds: ['t1'],
    teachers: tinyTeachers,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable: tightTimetable,
  });
  assert.equal(noSubResult.length, 1);
  assert.equal(noSubResult[0].substituteTeacherId, null);
  assert.equal(noSubResult[0].status, 'manual_required');
  const candidatesForTight = getTeacherCandidatesForSlot(
    noSubResult[0],
    noSubResult,
    ['t1'],
    tinyTeachers,
    INITIAL_CLASSES,
    tightTimetable
  );
  assert.ok(
    candidatesForTight.every((c) => !c.eligible),
    'All candidates should show unavailable reasons'
  );
  console.log('✓ Test 8: No available substitute triggers manual assignment required');

  // 9. Manual override & validation
  const firstDraft = [...singleAbsent];
  const p1Slot = firstDraft[0];
  const candidateEval = getTeacherCandidatesForSlot(
    p1Slot,
    firstDraft,
    ['tch-arjun'],
    INITIAL_TEACHERS,
    INITIAL_CLASSES,
    timetable
  );
  const altEligible = candidateEval.find(
    (c) => c.eligible && c.teacher.id !== p1Slot.substituteTeacherId
  );
  assert.ok(altEligible, 'Expected an alternative eligible teacher');
  firstDraft[0] = {
    ...p1Slot,
    substituteTeacherId: altEligible.teacher.id,
    substituteTeacherName: altEligible.teacher.name,
    isManualOverride: true,
    matchTier: 'manual',
    status: 'proposed',
  };
  const valOk = validateScheduleBeforeConfirm(
    firstDraft,
    ['tch-arjun'],
    INITIAL_TEACHERS,
    INITIAL_CLASSES,
    timetable
  );
  assert.equal(valOk.valid, true);
  console.log('✓ Test 9: Manual override validated cleanly');

  // 10. No receipt before confirmation (and confirmation blocked if unresolved)
  const unresolvedConfirm = confirmSubstitutionSchedule({
    dateISO: mondayISO,
    absentTeacherIds: ['t1'],
    draftAssignments: noSubResult,
    teachers: tinyTeachers,
    classes: INITIAL_CLASSES,
    timetable: tightTimetable,
    existingHistory: [],
  });
  assert.equal(unresolvedConfirm.ok, false);
  assert.equal(unresolvedConfirm.history.length, 0);
  console.log('✓ Test 10: Confirmation blocked and zero receipts generated when unresolved');

  // 11 & 12. One separate receipt for every substitute teacher & exact period details
  const confirmedMonday = confirmSubstitutionSchedule({
    dateISO: mondayISO,
    absentTeacherIds: ['tch-arjun', 'tch-kavita'],
    draftAssignments: multiAbsent,
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    timetable,
    existingHistory: [],
  });
  assert.equal(confirmedMonday.ok, true);
  assert.equal(confirmedMonday.wasDuplicate, false);
  assert.ok(confirmedMonday.snapshot);
  const mondayBundles = confirmedMonday.snapshot.receiptBundles;
  assert.equal(
    mondayBundles.length,
    subCounts.size,
    'Exactly one receipt bundle per unique substitute teacher'
  );
  for (const bundle of mondayBundles) {
    const allItems = bundle.sheets.flatMap((s) => s.items);
    assert.equal(allItems.length, bundle.totalAssignedPeriods);
    for (const item of allItems) {
      const source = multiAbsent.find((m) => m.id === item.assignmentId);
      assert.ok(source);
      assert.equal(source.substituteTeacherId, bundle.substituteTeacherId);
      assert.equal(item.periodNumber, source.periodNumber);
      assert.equal(item.className, source.className);
      assert.equal(item.subject, source.subject);
    }
  }
  console.log('✓ Test 11 & 12: Separate receipt per substitute teacher with exact period details');

  // 13. No duplicate receipts on repeated confirmation / reload
  const secondClick = confirmSubstitutionSchedule({
    dateISO: mondayISO,
    absentTeacherIds: ['tch-arjun', 'tch-kavita'],
    draftAssignments: multiAbsent,
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    timetable,
    existingHistory: confirmedMonday.history,
  });
  assert.equal(secondClick.ok, true);
  assert.equal(secondClick.wasDuplicate, true);
  assert.equal(secondClick.history.length, 1);
  console.log('✓ Test 13: Duplicate confirmation prevented');

  // 14 & 15. Continuation sheets (>4 assignments) & one receipt per page bounds
  const fiveAssignments = [1, 2, 3, 4, 5].map((p) => ({
    id: `sub-test-p${p}`,
    dateISO: mondayISO,
    day: 'Monday' as const,
    periodNumber: p,
    periodTime: '08:00–08:45',
    classId: 'cls-8a',
    className: '8A',
    subject: 'Mathematics',
    absentTeacherId: 'tch-arjun',
    absentTeacherName: 'Arjun Mehta',
    substituteTeacherId: 'tch-priya',
    substituteTeacherName: 'Priya Nair',
    reason: 'Test',
    matchTier: 'exact_main' as const,
    isManualOverride: false,
    status: 'confirmed' as const,
  }));
  const paginatedBundles = groupAssignmentsIntoReceipts(
    fiveAssignments,
    'batch-test',
    mondayISO,
    'Monday'
  );
  assert.equal(paginatedBundles.length, 1);
  assert.equal(
    paginatedBundles[0].sheets.length,
    2,
    '5 periods must split into 2 sheets (4 + 1) instead of overflowing 4 lines'
  );
  assert.equal(paginatedBundles[0].sheets[0].items.length, 4);
  assert.equal(paginatedBundles[0].sheets[1].items.length, 1);
  console.log('✓ Test 14 & 15: >4 period pagination and sheet isolation verified');

  // 16. Receipt template asset existence, GitHub Pages subpath safety & non-overflowing overlay coordinates
  assert.equal(
    RECEIPT_TEMPLATE_PATH,
    './assets/sfs-receipt-template.png',
    'Default receipt template path must be relative so GitHub Pages subpaths resolve properly'
  );
  assert.equal(
    resolveReceiptTemplatePath('/sfs-repo/'),
    '/sfs-repo/assets/sfs-receipt-template.png',
    'Explicit subpath base URL must preserve repository prefix'
  );
  const templateCandidates = getReceiptTemplateCandidates();
  assert.ok(
    templateCandidates.includes('./assets/sfs-receipt-template.png') &&
      templateCandidates.includes('/assets/sfs-receipt-template.png'),
    'Fallback candidate list must cover both relative subpath and root-relative URLs'
  );
  const templatePublicPath = path.join(
    process.cwd(),
    'public',
    RECEIPT_TEMPLATE_PATH.replace(/^\.?\/+/, '')
  );
  assert.equal(
    fs.existsSync(templatePublicPath),
    true,
    `Template image must exist at ${templatePublicPath}`
  );
  const allBoxes = [
    RECEIPT_OVERLAY_BOXES.teacherName,
    ...RECEIPT_OVERLAY_BOXES.assignmentLines,
  ];
  for (const box of allBoxes) {
    assert.ok(box.leftPct >= 0 && box.leftPct + box.widthPct <= 95);
    assert.ok(
      box.topPct >= 25 && box.topPct + box.heightPct <= 78,
      'Overlay must stay strictly above Principal Sir signature region (y > 80%)'
    );
  }
  console.log('✓ Test 16: Uploaded template asset verified & overlay bounds clear Principal signature');

  // 17. Date & weekday synchronization (Wednesday must use Wednesday timetable, never Monday)
  assert.equal(deriveDayFromDateISO(mondayISO).timetableDay, 'Monday');
  assert.equal(deriveDayFromDateISO(wednesdayISO).timetableDay, 'Wednesday');
  assert.equal(deriveDayFromDateISO(sundayISO).timetableDay, null);
  assert.equal(deriveDayFromDateISO(sundayISO).isSchoolDay, false);

  const wednesdayDraft = generateSubstitutions({
    dateISO: wednesdayISO,
    // Even if a stale day were passed, engine must derive Wednesday from wednesdayISO
    day: 'Monday',
    absentTeacherIds: ['tch-arjun'],
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable,
  });
  assert.ok(wednesdayDraft.length > 0);
  assert.ok(
    wednesdayDraft.every((item) => item.day === 'Wednesday'),
    'Wednesday date must strictly compute Wednesday timetable slots'
  );
  const sundayDraft = generateSubstitutions({
    dateISO: sundayISO,
    absentTeacherIds: ['tch-arjun'],
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable,
  });
  assert.equal(sundayDraft.length, 0, 'Sunday must have 0 regular timetable slots');
  console.log('✓ Test 17: Date and weekday synchronization verified (Mon/Wed/Sun)');

  // 18. Enforce maxDailySubstitutions across candidates, preserved overrides, and confirmation validation
  const cappedTeachers: Teacher[] = [
    {
      id: 'absent-t',
      name: 'Absent Teacher',
      shortCode: 'AT',
      mainSubject: 'Mathematics',
      secondarySubject: '',
      department: 'Mathematics',
      maxDailySubstitutions: 2,
      active: true,
    },
    {
      id: 'cap1-t',
      name: 'Capped Substitute',
      shortCode: 'CS',
      mainSubject: 'Mathematics',
      secondarySubject: '',
      department: 'Mathematics',
      maxDailySubstitutions: 1,
      active: true,
    },
  ];
  const capTimetable: TimetableSlot[] = [
    {
      id: 'cap-s1',
      day: 'Monday',
      periodNumber: 1,
      classId: 'cls-8a',
      subject: 'Mathematics',
      teacherId: 'absent-t',
    },
    {
      id: 'cap-s2',
      day: 'Monday',
      periodNumber: 2,
      classId: 'cls-8b',
      subject: 'Mathematics',
      teacherId: 'absent-t',
    },
  ];
  const capDraft = generateSubstitutions({
    dateISO: mondayISO,
    absentTeacherIds: ['absent-t'],
    teachers: cappedTeachers,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable: capTimetable,
  });
  assert.equal(capDraft[0].substituteTeacherId, 'cap1-t');
  assert.equal(
    capDraft[1].substituteTeacherId,
    null,
    'Second slot must remain unassigned because Capped Substitute hit maxDailySubstitutions=1'
  );

  const candidatesAtCap = getTeacherCandidatesForSlot(
    capDraft[1],
    capDraft,
    ['absent-t'],
    cappedTeachers,
    INITIAL_CLASSES,
    capTimetable
  );
  const cappedEval = candidatesAtCap.find((c) => c.teacher.id === 'cap1-t');
  assert.ok(cappedEval);
  assert.equal(
    cappedEval.eligible,
    false,
    'Teacher at maxDailySubstitutions must be marked ineligible'
  );
  assert.match(
    cappedEval.unavailableReason ?? '',
    /Daily substitution limit reached/i
  );

  // Force an over-limit manual override in validation & preserved-override check
  const overLimitDraft = [
    {
      ...capDraft[0],
      substituteTeacherId: 'cap1-t',
      substituteTeacherName: 'Capped Substitute',
      isManualOverride: true,
      matchTier: 'manual' as const,
      status: 'proposed' as const,
    },
    {
      ...capDraft[1],
      substituteTeacherId: 'cap1-t',
      substituteTeacherName: 'Capped Substitute',
      isManualOverride: true,
      matchTier: 'manual' as const,
      status: 'proposed' as const,
    },
  ];
  const revalidated = generateSubstitutions({
    dateISO: mondayISO,
    absentTeacherIds: ['absent-t'],
    teachers: cappedTeachers,
    classes: INITIAL_CLASSES,
    periods: INITIAL_PERIODS,
    timetable: capTimetable,
    existingDrafts: overLimitDraft,
    preserveManualOverrides: true,
  });
  assert.equal(revalidated[0].substituteTeacherId, 'cap1-t');
  assert.equal(
    revalidated[1].substituteTeacherId,
    null,
    'Preserved manual override exceeding maxDailySubstitutions must not be preserved'
  );

  const overCapValidation = validateScheduleBeforeConfirm(
    overLimitDraft,
    ['absent-t'],
    cappedTeachers,
    INITIAL_CLASSES,
    capTimetable
  );
  assert.equal(overCapValidation.valid, false);
  assert.ok(
    overCapValidation.errors.some((e) => e.includes('exceeding their daily limit'))
  );

  const overCapConfirm = confirmSubstitutionSchedule({
    dateISO: mondayISO,
    absentTeacherIds: ['absent-t'],
    draftAssignments: overLimitDraft,
    teachers: cappedTeachers,
    classes: INITIAL_CLASSES,
    timetable: capTimetable,
    existingHistory: [],
  });
  assert.equal(
    overCapConfirm.ok,
    false,
    'Confirmation must be blocked when daily workload limit is exceeded'
  );
  console.log('✓ Test 18: maxDailySubstitutions strictly enforced in candidates, overrides, and confirm validation');

  // 19. Preserve date-wise confirmed schedule history without overwriting prior days
  const wedConfirm = confirmSubstitutionSchedule({
    dateISO: wednesdayISO,
    absentTeacherIds: ['tch-arjun'],
    draftAssignments: wednesdayDraft,
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    timetable,
    existingHistory: confirmedMonday.history,
  });
  assert.equal(wedConfirm.ok, true);
  assert.equal(wedConfirm.wasDuplicate, false);
  assert.equal(
    wedConfirm.history.length,
    2,
    'Both Monday and Wednesday confirmed schedules must be preserved'
  );
  const history: ConfirmedScheduleSnapshot[] = wedConfirm.history;
  assert.notEqual(
    history[0].batchId,
    history[1].batchId,
    'Each confirmation must generate a unique batch ID'
  );
  const mondayEntries = history.filter((h) => h.dateISO === mondayISO);
  const wedEntries = history.filter((h) => h.dateISO === wednesdayISO);
  assert.equal(mondayEntries.length, 1);
  assert.equal(wedEntries.length, 1);
  assert.ok(mondayEntries[0].receiptBundles.length > 0);
  assert.ok(wedEntries[0].receiptBundles.length > 0);
  console.log('✓ Test 19: Date-wise confirmed schedule history & unique batch IDs preserved');

  console.log('\nALL 19 SUBSTITUTION, WORKLOAD & HISTORY TESTS PASSED');
}

runTests();
