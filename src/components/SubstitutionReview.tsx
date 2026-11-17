import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { deriveDayFromDateISO } from '../data/schoolData';
import {
  buildScheduleSignature,
  getTeacherCandidatesForSlot,
  validateScheduleBeforeConfirm,
} from '../engine/substitutionEngine';
import type {
  ConfirmedScheduleSnapshot,
  SchoolClass,
  SubstitutionAssignment,
  Teacher,
  TimetableSlot,
} from '../types/sfs';

interface SubstitutionReviewProps {
  selectedDateISO: string;
  teachers: Teacher[];
  classes: SchoolClass[];
  timetable: TimetableSlot[];
  absentTeacherIds: string[];
  draftAssignments: SubstitutionAssignment[];
  confirmedHistory: ConfirmedScheduleSnapshot[];
  onAssignManual: (assignmentId: string, substituteTeacherId: string) => void;
  onClearAssignment: (assignmentId: string) => void;
  onRecalculate: () => void;
  onConfirmSubstitutions: () => { ok: boolean; errors: string[] };
  onGoToDashboard: () => void;
  onGoToReceipts: () => void;
}

export function SubstitutionReview({
  selectedDateISO,
  teachers,
  classes,
  timetable,
  absentTeacherIds,
  draftAssignments,
  confirmedHistory,
  onAssignManual,
  onClearAssignment,
  onRecalculate,
  onConfirmSubstitutions,
  onGoToDashboard,
  onGoToReceipts,
}: SubstitutionReviewProps) {
  const [confirmErrors, setConfirmErrors] = useState<string[]>([]);
  const derived = deriveDayFromDateISO(selectedDateISO);

  const validation = useMemo(
    () =>
      validateScheduleBeforeConfirm(
        draftAssignments,
        absentTeacherIds,
        teachers,
        classes,
        timetable
      ),
    [draftAssignments, absentTeacherIds, teachers, classes, timetable]
  );

  const uniqueSubstituteIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of draftAssignments) {
      if (item.substituteTeacherId) set.add(item.substituteTeacherId);
    }
    return set;
  }, [draftAssignments]);

  const proposedCount = draftAssignments.filter(
    (a) => a.substituteTeacherId !== null
  ).length;
  const unresolvedCount = draftAssignments.filter(
    (a) => a.substituteTeacherId === null
  ).length;

  const isAlreadyConfirmedExact = useMemo(() => {
    if (!derived.timetableDay || draftAssignments.length === 0) return false;
    const signature = buildScheduleSignature(
      selectedDateISO,
      derived.timetableDay,
      absentTeacherIds,
      draftAssignments
    );
    return confirmedHistory.some((entry) => entry.signatureKey === signature);
  }, [
    confirmedHistory,
    selectedDateISO,
    derived.timetableDay,
    absentTeacherIds,
    draftAssignments,
  ]);

  const handleConfirmClick = () => {
    const result = onConfirmSubstitutions();
    if (!result.ok) {
      setConfirmErrors(result.errors);
    } else {
      setConfirmErrors([]);
    }
  };

  if (!derived.isSchoolDay || !derived.timetableDay) {
    return (
      <section className="sfs-surface-light rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto my-6">
        <h1
          className="text-2xl font-semibold text-[#0B241C]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {derived.weekday} — Non-Teaching Day
        </h1>
        <p className="text-sm text-[#3D4C42] mt-2 leading-relaxed">
          {selectedDateISO} is a Sunday and has no scheduled timetable periods.
          Select a Monday–Saturday date on the Dashboard to generate
          substitutions.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="sfs-btn-primary min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-lg cursor-pointer"
          >
            Return to Dashboard
          </button>
          {confirmedHistory.length > 0 && (
            <button
              type="button"
              onClick={onGoToReceipts}
              className="sfs-btn-secondary min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-lg cursor-pointer"
            >
              View Receipt History
            </button>
          )}
        </div>
      </section>
    );
  }

  if (absentTeacherIds.length === 0) {
    return (
      <section className="sfs-surface-light rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto my-6">
        <h1
          className="text-2xl font-semibold text-[#0B241C]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          No Absent Teachers Selected
        </h1>
        <p className="text-sm text-[#3D4C42] mt-2 leading-relaxed">
          Select one or more absent faculty members from the Faculty Directory on
          the Dashboard to generate substitution proposals for{' '}
          <strong className="text-[#0B241C]">
            {derived.timetableDay}, {selectedDateISO}
          </strong>
          .
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="sfs-btn-primary min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-lg cursor-pointer"
          >
            Go to Faculty Directory
          </button>
          {confirmedHistory.length > 0 && (
            <button
              type="button"
              onClick={onGoToReceipts}
              className="sfs-btn-secondary min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-lg cursor-pointer"
            >
              View Existing Receipts
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 sfs-welcome-enter">
      {/* Header */}
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-2xl sm:text-3xl font-semibold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Substitution Review &amp; Confirmation
          </h1>
          <p className="text-sm text-[#E6EEE8] mt-1 leading-relaxed">
            <span className="text-[#F3E7C6] font-semibold">
              {derived.timetableDay}, {selectedDateISO}
            </span>{' '}
            · Verify proposed replacements, override manually within daily caps,
            and confirm to issue receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setConfirmErrors([]);
              onRecalculate();
            }}
            className="sfs-btn-dark-secondary min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#EAD8A6]" />
            <span>Recalculate Substitutions</span>
          </button>
        </div>
      </div>

      {/* Compact Summary Strip */}
      <section
        aria-label="Substitution schedule summary"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
      >
        <div className="sfs-surface-light rounded-xl p-4">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Absent Teachers
          </p>
          <p className="text-2xl font-bold text-[#0B241C] tabular-nums mt-1.5">
            {absentTeacherIds.length}
          </p>
        </div>
        <div className="sfs-surface-light rounded-xl p-4">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Affected Periods
          </p>
          <p className="text-2xl font-bold text-[#0B241C] tabular-nums mt-1.5">
            {draftAssignments.length}
          </p>
        </div>
        <div className="sfs-surface-light rounded-xl p-4">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Substitute Teachers
          </p>
          <p className="text-2xl font-bold text-[#146C43] tabular-nums mt-1.5">
            {uniqueSubstituteIds.size}
          </p>
        </div>
        <div className="sfs-surface-light rounded-xl p-4">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Proposed Assignments
          </p>
          <p className="text-2xl font-bold text-[#146C43] tabular-nums mt-1.5">
            {proposedCount}
          </p>
        </div>
        <div className="sfs-surface-light rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Unresolved Periods
          </p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1.5 ${
              unresolvedCount > 0 ? 'text-[#9B2C2C]' : 'text-[#0B241C]'
            }`}
          >
            {unresolvedCount}
          </p>
        </div>
      </section>

      {draftAssignments.length === 0 ? (
        <div className="sfs-surface-light rounded-xl p-6 text-sm text-[#1D241E]">
          The selected absent teachers have no regular classes scheduled on{' '}
          <strong className="text-[#0B241C]">{derived.timetableDay}</strong>. No
          substitutions are required.
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Assignment Cards (< lg) */}
          <div className="lg:hidden space-y-3">
            {draftAssignments.map((item) => {
              const candidates = getTeacherCandidatesForSlot(
                item,
                draftAssignments,
                absentTeacherIds,
                teachers,
                classes,
                timetable
              );
              const eligible = candidates.filter((c) => c.eligible);
              const unavailable = candidates.filter((c) => !c.eligible);
              const isUnresolved = item.substituteTeacherId === null;

              return (
                <article
                  key={item.id}
                  className={`sfs-surface-light rounded-xl p-4 space-y-3 ${
                    isUnresolved ? 'border-[#9B2C2C]/65 bg-[#FFF8F8]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#0B241C] tabular-nums">
                        Period {item.periodNumber} · Class {item.className}
                      </div>
                      <div className="text-xs font-medium text-[#3D4C42] mt-0.5">
                        {item.subject}
                        {item.periodTime ? ` · ${item.periodTime}` : ''}
                      </div>
                    </div>

                    {isUnresolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9B2C2C] shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Manual Required</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#146C43] shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isAlreadyConfirmedExact
                            ? 'Confirmed'
                            : item.isManualOverride
                            ? 'Manual'
                            : 'Proposed'}
                        </span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#3D4C42]">
                    Covering for{' '}
                    <strong className="text-[#0B241C]">
                      {item.absentTeacherName}
                    </strong>
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#0B241C] mb-1">
                      Assigned Substitute
                    </label>
                    <select
                      value={item.substituteTeacherId ?? ''}
                      onChange={(e) => {
                        setConfirmErrors([]);
                        if (!e.target.value) {
                          onClearAssignment(item.id);
                        } else {
                          onAssignManual(item.id, e.target.value);
                        }
                      }}
                      aria-label={`Select substitute for Period ${item.periodNumber} Class ${item.className}`}
                      className={`w-full min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 cursor-pointer ${
                        isUnresolved
                          ? 'border-[#9B2C2C] bg-white text-[#822727]'
                          : 'border-[#12372B]/25 bg-white text-[#0B241C]'
                      }`}
                    >
                      <option value="">-- Select Substitute Teacher --</option>
                      <optgroup label="Eligible Free Teachers">
                        {eligible.map((c) => (
                          <option key={c.teacher.id} value={c.teacher.id}>
                            {c.teacher.name} ({c.teacher.mainSubject} ·{' '}
                            {c.currentSubCount}/
                            {c.teacher.maxDailySubstitutions} subs)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Unavailable (Conflict / Absent / Daily Limit)">
                        {unavailable.map((c) => (
                          <option
                            key={c.teacher.id}
                            value={c.teacher.id}
                            disabled
                          >
                            {c.teacher.name} — {c.unavailableReason}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-[#3D4C42] leading-snug">
                      {item.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmErrors([]);
                        onClearAssignment(item.id);
                      }}
                      disabled={isUnresolved}
                      className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg text-[#9B2C2C] bg-[#FFF8F8] border border-[#9B2C2C]/30 disabled:opacity-35 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      aria-label={`Remove assignment for Period ${item.periodNumber} Class ${item.className}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop Assignments Table (>= lg) */}
          <div className="hidden lg:block sfs-surface-light rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F4] border-b border-[#12372B]/15 text-xs font-bold text-[#0B241C]">
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Class &amp; Subject</th>
                    <th className="py-3.5 px-4">Absent Teacher</th>
                    <th className="py-3.5 px-4">Assigned Substitute</th>
                    <th className="py-3.5 px-4">Suggestion Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Clear</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12372B]/10 text-sm">
                  {draftAssignments.map((item) => {
                    const candidates = getTeacherCandidatesForSlot(
                      item,
                      draftAssignments,
                      absentTeacherIds,
                      teachers,
                      classes,
                      timetable
                    );
                    const eligible = candidates.filter((c) => c.eligible);
                    const unavailable = candidates.filter((c) => !c.eligible);
                    const isUnresolved = item.substituteTeacherId === null;

                    return (
                      <tr
                        key={item.id}
                        className={
                          isUnresolved
                            ? 'bg-[#FFF8F8]'
                            : 'hover:bg-[#FAF9F4] transition-colors'
                        }
                      >
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-bold text-[#0B241C] tabular-nums">
                            Period {item.periodNumber}
                          </div>
                          {item.periodTime && (
                            <div className="text-xs font-mono text-[#3D4C42] tabular-nums mt-0.5">
                              {item.periodTime}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-[#0B241C]">
                            Class {item.className}
                          </div>
                          <div className="text-xs font-medium text-[#3D4C42] mt-0.5">
                            {item.subject}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-[#1D241E] font-medium">
                          {item.absentTeacherName}
                        </td>

                        <td className="py-3.5 px-4 align-top min-w-[240px]">
                          <select
                            value={item.substituteTeacherId ?? ''}
                            onChange={(e) => {
                              setConfirmErrors([]);
                              if (!e.target.value) {
                                onClearAssignment(item.id);
                              } else {
                                onAssignManual(item.id, e.target.value);
                              }
                            }}
                            aria-label={`Select substitute for Period ${item.periodNumber} Class ${item.className}`}
                            className={`w-full min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 cursor-pointer ${
                              isUnresolved
                                ? 'border-[#9B2C2C] bg-white text-[#822727]'
                                : 'border-[#12372B]/25 bg-white text-[#0B241C]'
                            }`}
                          >
                            <option value="">
                              -- Select Substitute Teacher --
                            </option>
                            <optgroup label="Eligible Free Teachers">
                              {eligible.map((c) => (
                                <option key={c.teacher.id} value={c.teacher.id}>
                                  {c.teacher.name} ({c.teacher.mainSubject} ·{' '}
                                  {c.currentSubCount}/
                                  {c.teacher.maxDailySubstitutions} subs)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Unavailable (Conflict / Absent / Daily Limit)">
                              {unavailable.map((c) => (
                                <option
                                  key={c.teacher.id}
                                  value={c.teacher.id}
                                  disabled
                                >
                                  {c.teacher.name} — {c.unavailableReason}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 align-top text-xs text-[#3D4C42] max-w-xs leading-relaxed">
                          {item.reason}
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {isUnresolved ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9B2C2C]">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>MANUAL ASSIGNMENT REQUIRED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#146C43]">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>
                                {isAlreadyConfirmedExact
                                  ? 'Confirmed'
                                  : item.isManualOverride
                                  ? 'Manual Assigned'
                                  : 'Proposed'}
                              </span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmErrors([]);
                              onClearAssignment(item.id);
                            }}
                            disabled={isUnresolved}
                            className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#9B2C2C] hover:bg-[#9B2C2C]/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Clear assignment for manual override"
                            aria-label={`Remove assignment for Period ${item.periodNumber} Class ${item.className}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Footer & Validation Guard */}
      {draftAssignments.length > 0 && (
        <div className="sfs-surface-light rounded-xl p-5 sm:p-6 space-y-4">
          {(!validation.valid || confirmErrors.length > 0) && (
            <div className="p-4 rounded-lg bg-[#FFF8F8] border border-[#9B2C2C]/40 text-xs text-[#822727] space-y-1.5">
              <p className="font-bold">
                Cannot confirm schedule until all issues are resolved:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {(confirmErrors.length > 0
                  ? confirmErrors
                  : validation.errors
                ).map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-[#1D241E] space-y-1 leading-relaxed">
              <p>
                <strong className="text-[#0B241C]">Ready to Confirm:</strong>{' '}
                {validation.valid
                  ? `All ${draftAssignments.length} affected periods resolved within daily workload limits with zero double-bookings. ${uniqueSubstituteIds.size} individual teacher receipts will be generated.`
                  : `${validation.unresolvedCount} unresolved period(s) and ${validation.conflictCount} conflict(s) remaining.`}
              </p>
              {isAlreadyConfirmedExact && (
                <p className="text-[#146C43] font-semibold">
                  This exact schedule is already confirmed in history. View
                  receipts or modify an assignment above to issue an updated
                  batch.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isAlreadyConfirmedExact ? (
                <button
                  type="button"
                  onClick={onGoToReceipts}
                  className="sfs-btn-primary min-h-[48px] w-full sm:w-auto px-6 py-3 text-sm font-bold rounded-lg whitespace-nowrap cursor-pointer"
                >
                  Open Substitution Receipts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmClick}
                  disabled={!validation.valid}
                  className="sfs-btn-primary min-h-[48px] w-full sm:w-auto px-6 py-3 text-sm sm:text-base font-bold rounded-lg whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                >
                  CONFIRM SUBSTITUTIONS
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
