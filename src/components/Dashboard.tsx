import { ArrowRight, Calendar } from 'lucide-react';
import { deriveDayFromDateISO } from '../data/schoolData';
import type {
  ConfirmedScheduleSnapshot,
  SubstitutionAssignment,
  Teacher,
} from '../types/sfs';
import { TeacherDirectory } from './TeacherDirectory';

interface DashboardProps {
  selectedDateISO: string;
  teachers: Teacher[];
  absentTeacherIds: string[];
  draftAssignments: SubstitutionAssignment[];
  confirmedHistory: ConfirmedScheduleSnapshot[];
  onChangeDate: (dateISO: string) => void;
  onToggleAbsent: (teacherId: string) => void;
  onGoToSubstitutions: () => void;
  onGoToReceipts: () => void;
}

export function Dashboard({
  selectedDateISO,
  teachers,
  absentTeacherIds,
  draftAssignments,
  confirmedHistory,
  onChangeDate,
  onToggleAbsent,
  onGoToSubstitutions,
  onGoToReceipts,
}: DashboardProps) {
  const derived = deriveDayFromDateISO(selectedDateISO);
  const activeTeachers = teachers.filter((t) => t.active);
  const periodsRequiringSub = draftAssignments.length;

  const latestConfirmedForDate =
    confirmedHistory.find((entry) => entry.dateISO === selectedDateISO) ?? null;

  const confirmedCount = latestConfirmedForDate
    ? latestConfirmedForDate.assignments.length
    : 0;

  const onSubstitutionTeacherIds = new Set<string>();
  const sourceAssignments = latestConfirmedForDate
    ? latestConfirmedForDate.assignments
    : draftAssignments;

  for (const item of sourceAssignments) {
    if (item.substituteTeacherId) {
      onSubstitutionTeacherIds.add(item.substituteTeacherId);
    }
  }

  const formattedDate = (() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selectedDateISO);
    if (!match) return selectedDateISO;
    const parsed = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
    if (Number.isNaN(parsed.getTime())) return selectedDateISO;
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  })();

  return (
    <div className="space-y-6 sfs-welcome-enter">
      {/* Refined SFS Brand Header */}
      <header className="sfs-surface-dark text-[#F7F6F0] rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-[#F3E7C6]">
            Shemford Futuristic School
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold text-white mt-1.5 leading-tight"
            style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
          >
            Faculty Substitution Management
          </h1>
          <p className="text-sm text-[#E6EEE8] mt-1.5 leading-relaxed">
            {derived.weekday}, {formattedDate} ·{' '}
            {derived.isSchoolDay
              ? `Synchronized with ${derived.weekday} timetable`
              : 'Non-teaching day (no regular classes scheduled)'}
          </p>
        </div>

        {/* Calendar Date Picker with Synchronized Weekday */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
          <label className="min-h-[44px] flex items-center gap-2.5 bg-[#061510] border border-[#C7A45A]/55 rounded-lg px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-[#E5D4A5]">
            <Calendar className="w-4 h-4 text-[#EAD8A6] shrink-0" />
            <span className="sr-only">Substitution Date</span>
            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => {
                if (e.target.value) onChangeDate(e.target.value);
              }}
              className="w-full sm:w-auto bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer"
            />
          </label>

          <div className="min-h-[44px] inline-flex items-center justify-center bg-[#061510] border border-[#C7A45A]/40 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-[#F3E7C6] font-semibold whitespace-nowrap">
            {derived.isSchoolDay
              ? `${derived.weekday} Timetable`
              : 'Sunday (Closed)'}
          </div>
        </div>
      </header>

      {/* 4 Essential Metrics Strip */}
      <section
        aria-label="Today substitution summary"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <div className="sfs-surface-light rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Total Teachers
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#0B241C] tabular-nums mt-2">
            {activeTeachers.length}
          </p>
        </div>

        <div className="sfs-surface-light rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Teachers Absent Today
          </p>
          <p
            className={`text-2xl sm:text-3xl font-bold tabular-nums mt-2 ${
              absentTeacherIds.length > 0 ? 'text-[#9B2C2C]' : 'text-[#0B241C]'
            }`}
          >
            {absentTeacherIds.length}
          </p>
        </div>

        <div className="sfs-surface-light rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Periods Requiring Sub
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#0B241C] tabular-nums mt-2">
            {periodsRequiringSub}
          </p>
        </div>

        <div className="sfs-surface-light rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-[#3D4C42]">
            Confirmed Substitutions
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#146C43] tabular-nums mt-2">
            {confirmedCount}
          </p>
        </div>
      </section>

      {/* High-Visibility Actionable Workflow Banner */}
      {(absentTeacherIds.length > 0 || confirmedHistory.length > 0) && (
        <section
          aria-label="Substitution workflow actions"
          className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-[#C7A45A]/65"
        >
          <div className="text-sm sm:text-base text-[#EEF3EF] leading-relaxed">
            {!derived.isSchoolDay ? (
              <span>
                <strong className="text-white">{selectedDateISO}</strong> is a
                Sunday. Choose a Monday–Saturday date to compute timetable
                substitutions.
              </span>
            ) : absentTeacherIds.length > 0 ? (
              <span>
                <strong className="text-[#EAD8A6] tabular-nums">
                  {absentTeacherIds.length}
                </strong>{' '}
                absent{' '}
                {absentTeacherIds.length === 1 ? 'teacher' : 'teachers'} marked
                for <strong className="text-white">{derived.weekday}</strong> (
                <span className="font-mono text-xs sm:text-sm text-[#F3E7C6]">
                  {selectedDateISO}
                </span>
                ) ·{' '}
                <strong className="text-[#EAD8A6] tabular-nums">
                  {periodsRequiringSub}
                </strong>{' '}
                affected{' '}
                {periodsRequiringSub === 1 ? 'period' : 'periods'} ready for
                review.
              </span>
            ) : (
              <span>
                <strong className="text-[#EAD8A6] tabular-nums">
                  {confirmedHistory.length}
                </strong>{' '}
                confirmed{' '}
                {confirmedHistory.length === 1 ? 'schedule' : 'schedules'} saved
                in receipt history.
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {absentTeacherIds.length > 0 && derived.isSchoolDay && (
              <button
                type="button"
                onClick={onGoToSubstitutions}
                className="sfs-btn-primary min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] cursor-pointer"
              >
                <span>Review &amp; Confirm Substitutions</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
            {confirmedHistory.length > 0 && (
              <button
                type="button"
                onClick={onGoToReceipts}
                className="sfs-btn-dark-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5D4A5] cursor-pointer"
              >
                <span>View Receipts ({confirmedHistory.length})</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Prominent Faculty Directory */}
      <TeacherDirectory
        teachers={teachers}
        absentTeacherIds={absentTeacherIds}
        onSubstitutionTeacherIds={onSubstitutionTeacherIds}
        onToggleAbsent={onToggleAbsent}
      />
    </div>
  );
}
