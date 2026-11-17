import type {
  DayOfWeek,
  PeriodDefinition,
  SchoolClass,
  Teacher,
  TimetableSlot,
} from '../types/sfs';

export interface FormValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTeacherInput(
  input: Omit<Teacher, 'id'>,
  existingTeachers: Teacher[],
  editingId?: string
): FormValidationResult {
  const errors: string[] = [];
  const trimmedName = input.name.trim();
  const trimmedShort = input.shortCode.trim().toUpperCase();
  const trimmedMain = input.mainSubject.trim();
  const trimmedDept = input.department.trim();

  if (trimmedName.length < 2) {
    errors.push('Teacher name must be at least 2 characters.');
  }
  if (trimmedShort.length < 2 || trimmedShort.length > 5) {
    errors.push('Short code must be 2 to 5 characters.');
  }
  if (!trimmedMain) {
    errors.push('Main subject is required.');
  }
  if (!trimmedDept) {
    errors.push('Department is required.');
  }
  if (
    !Number.isFinite(input.maxDailySubstitutions) ||
    input.maxDailySubstitutions < 1 ||
    input.maxDailySubstitutions > 8
  ) {
    errors.push('Max daily substitutions must be between 1 and 8.');
  }

  const duplicateName = existingTeachers.some(
    (t) =>
      t.id !== editingId &&
      t.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicateName) {
    errors.push('A teacher with this name already exists.');
  }

  const duplicateCode = existingTeachers.some(
    (t) => t.id !== editingId && t.shortCode.toUpperCase() === trimmedShort
  );
  if (duplicateCode) {
    errors.push('This teacher short code is already in use.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateTimetableSlotInput(
  candidate: {
    day: DayOfWeek;
    periodNumber: number;
    classId: string;
    subject: string;
    teacherId: string;
  },
  existingTimetable: TimetableSlot[],
  teachers: Teacher[],
  classes: SchoolClass[],
  editingSlotId?: string
): FormValidationResult {
  const errors: string[] = [];

  if (!candidate.subject.trim()) {
    errors.push('Subject is required.');
  }
  if (!candidate.classId) {
    errors.push('Class is required.');
  }
  if (!candidate.teacherId) {
    errors.push('Teacher is required.');
  }

  const teacherConflict = existingTimetable.find(
    (slot) =>
      slot.id !== editingSlotId &&
      slot.day === candidate.day &&
      slot.periodNumber === candidate.periodNumber &&
      slot.teacherId === candidate.teacherId
  );

  if (teacherConflict) {
    const teacherName =
      teachers.find((t) => t.id === candidate.teacherId)?.name ?? 'This teacher';
    const conflictClass =
      classes.find((c) => c.id === teacherConflict.classId)?.name ??
      teacherConflict.classId;
    errors.push(
      `${teacherName} is already assigned to Class ${conflictClass} (${teacherConflict.subject}) on ${candidate.day} in Period ${candidate.periodNumber}.`
    );
  }

  const classConflict = existingTimetable.find(
    (slot) =>
      slot.id !== editingSlotId &&
      slot.day === candidate.day &&
      slot.periodNumber === candidate.periodNumber &&
      slot.classId === candidate.classId
  );

  if (classConflict) {
    const className =
      classes.find((c) => c.id === candidate.classId)?.name ?? candidate.classId;
    errors.push(
      `Class ${className} already has ${classConflict.subject} scheduled in Period ${candidate.periodNumber} on ${candidate.day}.`
    );
  }

  return { valid: errors.length === 0, errors };
}

export function validateClassInput(
  name: string,
  existingClasses: SchoolClass[],
  editingId?: string
): FormValidationResult {
  const errors: string[] = [];
  const trimmed = name.trim();
  if (!trimmed) {
    errors.push('Class name is required (e.g., 8A or 11 Science).');
  }
  if (
    existingClasses.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    errors.push('This class already exists.');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePeriodInput(
  periodNumber: number,
  startTime: string,
  endTime: string,
  existingPeriods: PeriodDefinition[],
  editingPeriodNumber?: number
): FormValidationResult {
  const errors: string[] = [];
  if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 12) {
    errors.push('Period number must be between 1 and 12.');
  }
  if (!startTime.trim() || !endTime.trim()) {
    errors.push('Start and end times are required.');
  } else if (startTime >= endTime) {
    errors.push('End time must be after start time.');
  }
  if (
    periodNumber !== editingPeriodNumber &&
    existingPeriods.some((p) => p.periodNumber === periodNumber)
  ) {
    errors.push(`Period ${periodNumber} already exists.`);
  }
  return { valid: errors.length === 0, errors };
}
