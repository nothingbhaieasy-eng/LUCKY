import { Clock, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DAYS_OF_WEEK } from '../data/schoolData';
import type {
  DayOfWeek,
  PeriodDefinition,
  SchoolClass,
  Teacher,
  TimetableSlot,
} from '../types/sfs';
import {
  validateClassInput,
  validatePeriodInput,
  validateTimetableSlotInput,
} from '../utils/validation';

interface TimetableProps {
  teachers: Teacher[];
  classes: SchoolClass[];
  periods: PeriodDefinition[];
  subjects: string[];
  timetable: TimetableSlot[];
  selectedDay: DayOfWeek;
  onUpsertSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onAddClass: (schoolClass: SchoolClass) => void;
  onDeleteClass: (classId: string) => void;
  onSavePeriods: (periods: PeriodDefinition[]) => void;
  onEnsureSubject: (subject: string) => void;
}

type ViewMode = 'class' | 'teacher' | 'daily';

export function Timetable({
  teachers,
  classes,
  periods,
  subjects,
  timetable,
  selectedDay,
  onUpsertSlot,
  onDeleteSlot,
  onAddClass,
  onDeleteClass,
  onSavePeriods,
  onEnsureSubject,
}: TimetableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id ?? ''
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teachers[0]?.id ?? ''
  );
  const [overviewDay, setOverviewDay] = useState<DayOfWeek>(selectedDay);
  const [mobileDay, setMobileDay] = useState<DayOfWeek>(selectedDay);

  // Slot Editor Modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotDay, setSlotDay] = useState<DayOfWeek>('Monday');
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotClassId, setSlotClassId] = useState<string>(classes[0]?.id ?? '');
  const [slotTeacherId, setSlotTeacherId] = useState<string>(
    teachers[0]?.id ?? ''
  );
  const [slotSubject, setSlotSubject] = useState<string>(
    subjects[0] ?? 'Mathematics'
  );
  const [slotErrors, setSlotErrors] = useState<string[]>([]);

  // Structure Manager Modal (Classes & Periods)
  const [manageClassesOpen, setManageClassesOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classError, setClassError] = useState('');

  const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);
  const [periodNum, setPeriodNum] = useState<number>(periods.length + 1);
  const [periodStart, setPeriodStart] = useState('14:05');
  const [periodEnd, setPeriodEnd] = useState('14:50');
  const [editingPeriodNum, setEditingPeriodNum] = useState<number | null>(null);
  const [periodError, setPeriodError] = useState('');

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.periodNumber - b.periodNumber),
    [periods]
  );

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      ),
    [classes]
  );

  const activeTeachers = useMemo(
    () =>
      teachers
        .filter((t) => t.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teachers]
  );

  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t])),
    [teachers]
  );
  const classMap = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes]
  );

  const effectiveClassId = classMap.has(selectedClassId)
    ? selectedClassId
    : sortedClasses[0]?.id ?? '';
  const effectiveTeacherId = teacherMap.has(selectedTeacherId)
    ? selectedTeacherId
    : activeTeachers[0]?.id ?? '';

  const openSlotModal = (preset: {
    slot?: TimetableSlot;
    day?: DayOfWeek;
    periodNumber?: number;
    classId?: string;
    teacherId?: string;
  }) => {
    if (preset.slot) {
      setEditingSlot(preset.slot);
      setSlotDay(preset.slot.day);
      setSlotPeriod(preset.slot.periodNumber);
      setSlotClassId(preset.slot.classId);
      setSlotTeacherId(preset.slot.teacherId);
      setSlotSubject(preset.slot.subject);
    } else {
      setEditingSlot(null);
      setSlotDay(preset.day ?? overviewDay);
      setSlotPeriod(preset.periodNumber ?? sortedPeriods[0]?.periodNumber ?? 1);
      setSlotClassId(preset.classId ?? effectiveClassId);
      const tId = preset.teacherId ?? effectiveTeacherId;
      setSlotTeacherId(tId);
      const t = teacherMap.get(tId);
      setSlotSubject(t?.mainSubject ?? subjects[0] ?? 'Mathematics');
    }
    setSlotErrors([]);
    setSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = {
      day: slotDay,
      periodNumber: Number(slotPeriod),
      classId: slotClassId,
      subject: slotSubject.trim(),
      teacherId: slotTeacherId,
    };

    const validation = validateTimetableSlotInput(
      candidate,
      timetable,
      teachers,
      classes,
      editingSlot?.id
    );
    if (!validation.valid) {
      setSlotErrors(validation.errors);
      return;
    }

    onEnsureSubject(candidate.subject);
    const id =
      editingSlot?.id ??
      `slot-${candidate.day.toLowerCase()}-${candidate.classId}-p${candidate.periodNumber}-${Date.now()}`;
    onUpsertSlot({ id, ...candidate });
    setSlotModalOpen(false);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateClassInput(newClassName, classes);
    if (!val.valid) {
      setClassError(val.errors[0]);
      return;
    }
    const trimmed = newClassName.trim();
    const match = trimmed.match(/^(\d+)\s*(.*)$/);
    const gradeLevel = match ? Number(match[1]) : 0;
    const section = match && match[2] ? match[2].trim() : '';
    onAddClass({
      id: `cls-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: trimmed,
      gradeLevel,
      section,
    });
    setNewClassName('');
    setClassError('');
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validatePeriodInput(
      Number(periodNum),
      periodStart,
      periodEnd,
      periods,
      editingPeriodNum ?? undefined
    );
    if (!val.valid) {
      setPeriodError(val.errors[0]);
      return;
    }

    const updated =
      editingPeriodNum !== null
        ? periods.map((p) =>
            p.periodNumber === editingPeriodNum
              ? {
                  periodNumber: Number(periodNum),
                  label: `Period ${periodNum}`,
                  startTime: periodStart,
                  endTime: periodEnd,
                }
              : p
          )
        : [
            ...periods,
            {
              periodNumber: Number(periodNum),
              label: `Period ${periodNum}`,
              startTime: periodStart,
              endTime: periodEnd,
            },
          ];

    onSavePeriods(updated.sort((a, b) => a.periodNumber - b.periodNumber));
    setEditingPeriodNum(null);
    setPeriodNum(updated.length + 1);
    setPeriodError('');
  };

  const handleDeletePeriod = (pNum: number) => {
    onSavePeriods(periods.filter((p) => p.periodNumber !== pNum));
  };

  return (
    <div className="space-y-6 sfs-welcome-enter">
      {/* Header */}
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-2xl sm:text-3xl font-semibold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Timetable Management
          </h1>
          <p className="text-sm text-[#E6EEE8] mt-1 leading-relaxed">
            Configure classes, period timings, and weekly faculty schedules
            with automatic conflict checks.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setManageClassesOpen(true)}
            className="sfs-btn-dark-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#EAD8A6]" />
            <span>Manage Classes ({classes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPeriodNum(null);
              setPeriodNum((sortedPeriods.at(-1)?.periodNumber ?? 0) + 1);
              setPeriodError('');
              setManagePeriodsOpen(true);
            }}
            className="sfs-btn-dark-secondary min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#EAD8A6]" />
            <span>Period Timings ({periods.length})</span>
          </button>

          <button
            type="button"
            onClick={() => openSlotModal({})}
            className="sfs-btn-primary min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Timetable Entry</span>
          </button>
        </div>
      </div>

      {/* View Mode & Selector Toolbar */}
      <div className="sfs-surface-ivory rounded-xl p-4 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-[#12372B]/20 rounded-lg overflow-x-auto min-h-[44px]">
          <button
            type="button"
            onClick={() => setViewMode('class')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'class'
                ? 'bg-[#12372B] text-white'
                : 'text-[#1D241E] hover:bg-[#FAF9F4] hover:text-[#0B241C]'
            }`}
          >
            Class-wise Weekly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('teacher')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-[#12372B] text-white'
                : 'text-[#1D241E] hover:bg-[#FAF9F4] hover:text-[#0B241C]'
            }`}
          >
            Teacher-wise Weekly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-[#12372B] text-white'
                : 'text-[#1D241E] hover:bg-[#FAF9F4] hover:text-[#0B241C]'
            }`}
          >
            Daily Master Grid
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'class' && (
            <label className="w-full md:w-auto flex items-center gap-2.5 text-xs font-semibold text-[#0B241C]">
              <span className="shrink-0">Class:</span>
              <select
                value={effectiveClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 text-sm font-medium bg-white border border-[#12372B]/25 rounded-lg text-[#0B241C] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 cursor-pointer"
              >
                {sortedClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {viewMode === 'teacher' && (
            <label className="w-full md:w-auto flex items-center gap-2.5 text-xs font-semibold text-[#0B241C]">
              <span className="shrink-0">Teacher:</span>
              <select
                value={effectiveTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 text-sm font-medium bg-white border border-[#12372B]/25 rounded-lg text-[#0B241C] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 cursor-pointer"
              >
                {activeTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.mainSubject})
                  </option>
                ))}
              </select>
            </label>
          )}

          {viewMode === 'daily' && (
            <label className="w-full md:w-auto flex items-center gap-2.5 text-xs font-semibold text-[#0B241C]">
              <span className="shrink-0">Day:</span>
              <select
                value={overviewDay}
                onChange={(e) => setOverviewDay(e.target.value as DayOfWeek)}
                className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 text-sm font-medium bg-white border border-[#12372B]/25 rounded-lg text-[#0B241C] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 cursor-pointer"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Mobile Day-by-Period Card View (< md) */}
      <div className="md:hidden space-y-4">
        {viewMode !== 'daily' && (
          <div className="sfs-surface-ivory rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setMobileDay(day)}
                className={`min-h-[40px] flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                  mobileDay === day
                    ? 'bg-[#12372B] text-white'
                    : 'text-[#1D241E] hover:bg-white'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {sortedPeriods.map((period) => {
            if (viewMode === 'daily') {
              return (
                <article
                  key={period.periodNumber}
                  className="sfs-surface-light rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-baseline justify-between border-b border-[#12372B]/12 pb-2.5">
                    <h2 className="text-sm font-bold text-[#0B241C] tabular-nums">
                      {period.label} ({overviewDay})
                    </h2>
                    <span className="text-xs font-mono text-[#3D4C42] tabular-nums">
                      {period.startTime}–{period.endTime}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {sortedClasses.map((cls) => {
                      const slot = timetable.find(
                        (s) =>
                          s.day === overviewDay &&
                          s.periodNumber === period.periodNumber &&
                          s.classId === cls.id
                      );
                      const teacher = slot
                        ? teacherMap.get(slot.teacherId)
                        : null;
                      return slot ? (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => openSlotModal({ slot })}
                          className="w-full min-h-[44px] text-left rounded-lg border border-[#12372B]/18 bg-[#FAF9F4] px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#0B241C]">
                              Class {cls.name} · {slot.subject}
                            </span>
                            <p className="text-xs text-[#3D4C42] truncate">
                              {teacher?.name ?? 'Unknown'}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#146C43] shrink-0">
                            Edit
                          </span>
                        </button>
                      ) : (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() =>
                            openSlotModal({
                              day: overviewDay,
                              periodNumber: period.periodNumber,
                              classId: cls.id,
                            })
                          }
                          className="w-full min-h-[44px] text-left rounded-lg border border-dashed border-[#12372B]/25 px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-[#3D4C42] cursor-pointer"
                        >
                          <span>Class {cls.name}</span>
                          <span className="font-semibold text-[#146C43]">
                            + Assign
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            }

            const slot =
              viewMode === 'class'
                ? timetable.find(
                    (s) =>
                      s.day === mobileDay &&
                      s.periodNumber === period.periodNumber &&
                      s.classId === effectiveClassId
                  )
                : timetable.find(
                    (s) =>
                      s.day === mobileDay &&
                      s.periodNumber === period.periodNumber &&
                      s.teacherId === effectiveTeacherId
                  );

            const teacher = slot ? teacherMap.get(slot.teacherId) : null;
            const cls = slot ? classMap.get(slot.classId) : null;

            return (
              <article
                key={period.periodNumber}
                className="sfs-surface-light rounded-xl p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#0B241C] tabular-nums">
                    {period.label}
                  </span>
                  <span className="text-xs font-mono text-[#3D4C42] tabular-nums">
                    {period.startTime}–{period.endTime}
                  </span>
                </div>

                {slot ? (
                  <div className="space-y-3">
                    <div className="bg-[#FAF9F4] border border-[#12372B]/15 rounded-lg px-3.5 py-2.5">
                      <p className="text-sm font-bold text-[#0B241C]">
                        {viewMode === 'class'
                          ? slot.subject
                          : `Class ${cls?.name ?? slot.classId}`}
                      </p>
                      <p className="text-xs font-medium text-[#3D4C42] mt-0.5">
                        {viewMode === 'class'
                          ? teacher?.name ?? 'Unknown'
                          : slot.subject}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => openSlotModal({ slot })}
                        className="sfs-btn-secondary min-h-[44px] text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Edit Slot
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSlot(slot.id)}
                        className="min-h-[44px] text-xs font-semibold text-[#9B2C2C] bg-[#FFF8F8] border border-[#9B2C2C]/30 rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openSlotModal(
                        viewMode === 'class'
                          ? {
                              day: mobileDay,
                              periodNumber: period.periodNumber,
                              classId: effectiveClassId,
                            }
                          : {
                              day: mobileDay,
                              periodNumber: period.periodNumber,
                              teacherId: effectiveTeacherId,
                            }
                      )
                    }
                    className="w-full min-h-[44px] rounded-lg border border-dashed border-[#12372B]/30 text-xs font-semibold text-[#146C43] hover:bg-[#FAF9F4] cursor-pointer"
                  >
                    {viewMode === 'teacher'
                      ? 'Free Period (+ Assign)'
                      : '+ Assign Slot'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Desktop Timetable Grid (>= md) */}
      <div className="hidden md:block sfs-surface-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'class' && (
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[#FAF9F4] border-b border-[#12372B]/15 text-xs font-bold text-[#0B241C]">
                  <th className="py-3.5 px-3.5 w-36">Period</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} className="py-3.5 px-3">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12372B]/12 text-xs">
                {sortedPeriods.map((period) => (
                  <tr key={period.periodNumber}>
                    <td className="py-3 px-3.5 align-top bg-[#FAF9F4]">
                      <div className="font-bold text-[#0B241C] tabular-nums">
                        {period.label}
                      </div>
                      <div className="text-[11px] font-mono text-[#3D4C42] tabular-nums mt-0.5">
                        {period.startTime}–{period.endTime}
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map((day) => {
                      const slot = timetable.find(
                        (s) =>
                          s.day === day &&
                          s.periodNumber === period.periodNumber &&
                          s.classId === effectiveClassId
                      );
                      const teacher = slot
                        ? teacherMap.get(slot.teacherId)
                        : null;
                      return (
                        <td
                          key={day}
                          className="py-2.5 px-2.5 align-top border-l border-[#12372B]/10"
                        >
                          {slot ? (
                            <div className="rounded-lg border border-[#12372B]/18 bg-[#FAF9F4] p-2.5 hover:border-[#176B4D]/60 transition-colors">
                              <div className="font-bold text-[#0B241C] truncate">
                                {slot.subject}
                              </div>
                              <div className="text-[11px] font-medium text-[#3D4C42] truncate mt-0.5">
                                {teacher?.name ?? 'Unknown'}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openSlotModal({ slot })}
                                  className="text-[11px] font-bold text-[#146C43] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <span className="text-[#3D4C42]/45">·</span>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSlot(slot.id)}
                                  className="text-[11px] font-bold text-[#9B2C2C] hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openSlotModal({
                                  day,
                                  periodNumber: period.periodNumber,
                                  classId: effectiveClassId,
                                })
                              }
                              className="w-full py-3.5 rounded-lg border border-dashed border-[#12372B]/25 text-xs font-semibold text-[#3D4C42] hover:text-[#146C43] hover:border-[#176B4D]/60 hover:bg-[#FAF9F4] transition-colors cursor-pointer"
                            >
                              + Assign
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'teacher' && (
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[#FAF9F4] border-b border-[#12372B]/15 text-xs font-bold text-[#0B241C]">
                  <th className="py-3.5 px-3.5 w-36">Period</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} className="py-3.5 px-3">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12372B]/12 text-xs">
                {sortedPeriods.map((period) => (
                  <tr key={period.periodNumber}>
                    <td className="py-3 px-3.5 align-top bg-[#FAF9F4]">
                      <div className="font-bold text-[#0B241C] tabular-nums">
                        {period.label}
                      </div>
                      <div className="text-[11px] font-mono text-[#3D4C42] tabular-nums mt-0.5">
                        {period.startTime}–{period.endTime}
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map((day) => {
                      const slot = timetable.find(
                        (s) =>
                          s.day === day &&
                          s.periodNumber === period.periodNumber &&
                          s.teacherId === effectiveTeacherId
                      );
                      const cls = slot ? classMap.get(slot.classId) : null;
                      return (
                        <td
                          key={day}
                          className="py-2.5 px-2.5 align-top border-l border-[#12372B]/10"
                        >
                          {slot ? (
                            <div className="rounded-lg border border-[#12372B]/20 bg-[#12372B]/6 p-2.5">
                              <div className="font-bold text-[#0B241C]">
                                Class {cls?.name ?? slot.classId}
                              </div>
                              <div className="text-[11px] font-medium text-[#3D4C42] truncate mt-0.5">
                                {slot.subject}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openSlotModal({ slot })}
                                  className="text-[11px] font-bold text-[#146C43] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <span className="text-[#3D4C42]/45">·</span>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSlot(slot.id)}
                                  className="text-[11px] font-bold text-[#9B2C2C] hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openSlotModal({
                                  day,
                                  periodNumber: period.periodNumber,
                                  teacherId: effectiveTeacherId,
                                })
                              }
                              className="w-full py-3.5 rounded-lg border border-dashed border-[#12372B]/25 text-xs font-semibold text-[#146C43] hover:border-[#176B4D]/60 hover:bg-[#FAF9F4] transition-colors cursor-pointer"
                            >
                              Free (+ Assign)
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'daily' && (
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[#FAF9F4] border-b border-[#12372B]/15 text-xs font-bold text-[#0B241C]">
                  <th className="py-3.5 px-3.5 w-36">
                    Period ({overviewDay})
                  </th>
                  {sortedClasses.map((cls) => (
                    <th key={cls.id} className="py-3.5 px-3">
                      Class {cls.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12372B]/12 text-xs">
                {sortedPeriods.map((period) => (
                  <tr key={period.periodNumber}>
                    <td className="py-3 px-3.5 align-top bg-[#FAF9F4]">
                      <div className="font-bold text-[#0B241C] tabular-nums">
                        {period.label}
                      </div>
                      <div className="text-[11px] font-mono text-[#3D4C42] tabular-nums mt-0.5">
                        {period.startTime}–{period.endTime}
                      </div>
                    </td>
                    {sortedClasses.map((cls) => {
                      const slot = timetable.find(
                        (s) =>
                          s.day === overviewDay &&
                          s.periodNumber === period.periodNumber &&
                          s.classId === cls.id
                      );
                      const teacher = slot
                        ? teacherMap.get(slot.teacherId)
                        : null;
                      return (
                        <td
                          key={cls.id}
                          className="py-2.5 px-2.5 align-top border-l border-[#12372B]/10"
                        >
                          {slot ? (
                            <button
                              type="button"
                              onClick={() => openSlotModal({ slot })}
                              className="w-full text-left rounded-lg border border-[#12372B]/18 bg-[#FAF9F4] p-2.5 hover:border-[#176B4D]/60 transition-colors cursor-pointer"
                            >
                              <div className="font-bold text-[#0B241C] truncate">
                                {slot.subject}
                              </div>
                              <div className="text-[11px] font-medium text-[#3D4C42] truncate mt-0.5">
                                {teacher?.name ?? 'Unknown'}
                              </div>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openSlotModal({
                                  day: overviewDay,
                                  periodNumber: period.periodNumber,
                                  classId: cls.id,
                                })
                              }
                              className="w-full py-3.5 rounded-lg border border-dashed border-[#12372B]/25 text-xs font-semibold text-[#3D4C42] hover:text-[#146C43] hover:border-[#176B4D]/60 hover:bg-[#FAF9F4] transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Timetable Slot Modal */}
      {slotModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#12372B]/12">
              <h2
                className="text-xl font-semibold text-[#0B241C]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {editingSlot ? 'Edit Timetable Slot' : 'Add Timetable Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#3D4C42] hover:text-[#0B241C] hover:bg-[#FAF9F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="mt-5 space-y-4">
              {slotErrors.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#FFF8F8] border border-[#9B2C2C]/40 text-xs font-medium text-[#822727] space-y-1">
                  {slotErrors.map((err) => (
                    <p key={err}>{err}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Day
                  </label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] bg-white focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Period
                  </label>
                  <select
                    value={slotPeriod}
                    onChange={(e) => setSlotPeriod(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] bg-white focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
                  >
                    {sortedPeriods.map((p) => (
                      <option key={p.periodNumber} value={p.periodNumber}>
                        {p.label} ({p.startTime}–{p.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                  Class
                </label>
                <select
                  value={slotClassId}
                  onChange={(e) => setSlotClassId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] bg-white focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
                >
                  {sortedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                  Teacher
                </label>
                <select
                  value={slotTeacherId}
                  onChange={(e) => setSlotTeacherId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] bg-white focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
                >
                  {activeTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.mainSubject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  list="sfs-timetable-subjects"
                  value={slotSubject}
                  onChange={(e) => setSlotSubject(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
                  required
                />
                <datalist id="sfs-timetable-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="pt-4 border-t border-[#12372B]/12 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
                {editingSlot ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSlot(editingSlot.id);
                      setSlotModalOpen(false);
                    }}
                    className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-[#9B2C2C] hover:bg-[#FFF8F8] border border-[#9B2C2C]/30 rounded-lg cursor-pointer"
                  >
                    Delete Slot
                  </button>
                ) : (
                  <span className="hidden sm:inline" />
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSlotModalOpen(false)}
                    className="sfs-btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sfs-btn-primary min-h-[42px] px-5 py-2 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Classes Modal */}
      {manageClassesOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#12372B]/12">
              <h2
                className="text-xl font-semibold text-[#0B241C]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Manage School Classes
              </h2>
              <button
                type="button"
                onClick={() => setManageClassesOpen(false)}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#3D4C42] hover:text-[#0B241C] hover:bg-[#FAF9F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="mt-4 flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g., 11 Science or 7B"
                className="flex-1 min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40"
              />
              <button
                type="submit"
                className="sfs-btn-primary min-h-[42px] px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer"
              >
                Add Class
              </button>
            </form>
            {classError && (
              <p className="text-xs font-medium text-[#9B2C2C] mt-1.5">
                {classError}
              </p>
            )}

            <ul className="mt-4 max-h-64 overflow-y-auto divide-y divide-[#12372B]/10 border border-[#12372B]/15 rounded-lg">
              {sortedClasses.map((cls) => (
                <li
                  key={cls.id}
                  className="px-3.5 py-2.5 flex items-center justify-between text-sm"
                >
                  <span className="font-semibold text-[#0B241C]">
                    Class {cls.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteClass(cls.id)}
                    disabled={classes.length <= 1}
                    className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-[#9B2C2C] hover:bg-[#9B2C2C]/10 rounded-lg disabled:opacity-35 cursor-pointer"
                    title="Delete class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Manage Periods Modal */}
      {managePeriodsOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-lg w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#12372B]/12">
              <h2
                className="text-xl font-semibold text-[#0B241C]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Period Numbers &amp; Timings
              </h2>
              <button
                type="button"
                onClick={() => setManagePeriodsOpen(false)}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#3D4C42] hover:text-[#0B241C] hover:bg-[#FAF9F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSavePeriod}
              className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1">
                  Period #
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodNum}
                  onChange={(e) => setPeriodNum(Number(e.target.value))}
                  className="w-full min-h-[42px] px-2.5 py-2 text-sm font-mono border border-[#12372B]/25 rounded-lg text-[#1D241E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1">
                  Start
                </label>
                <input
                  type="time"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 py-2 text-sm font-mono border border-[#12372B]/25 rounded-lg text-[#1D241E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0B241C] mb-1">
                  End
                </label>
                <input
                  type="time"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 py-2 text-sm font-mono border border-[#12372B]/25 rounded-lg text-[#1D241E]"
                />
              </div>
              <button
                type="submit"
                className="sfs-btn-primary min-h-[42px] px-3 py-2 text-xs font-bold rounded-lg cursor-pointer"
              >
                {editingPeriodNum !== null ? 'Update' : 'Add'}
              </button>
            </form>
            {periodError && (
              <p className="text-xs font-medium text-[#9B2C2C] mt-1.5">
                {periodError}
              </p>
            )}

            <ul className="mt-4 max-h-64 overflow-y-auto divide-y divide-[#12372B]/10 border border-[#12372B]/15 rounded-lg">
              {sortedPeriods.map((p) => (
                <li
                  key={p.periodNumber}
                  className="px-3.5 py-2.5 flex items-center justify-between text-sm"
                >
                  <div className="tabular-nums">
                    <span className="font-bold text-[#0B241C]">{p.label}</span>
                    <span className="text-xs font-mono text-[#3D4C42] ml-3">
                      {p.startTime} – {p.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPeriodNum(p.periodNumber);
                        setPeriodNum(p.periodNumber);
                        setPeriodStart(p.startTime);
                        setPeriodEnd(p.endTime);
                        setPeriodError('');
                      }}
                      className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-[#12372B] hover:bg-[#EAD8A6]/45 rounded-lg cursor-pointer"
                      title="Edit timing"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(p.periodNumber)}
                      disabled={periods.length <= 1}
                      className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-[#9B2C2C] hover:bg-[#9B2C2C]/10 rounded-lg disabled:opacity-35 cursor-pointer"
                      title="Delete period"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
