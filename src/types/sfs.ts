export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type CalendarWeekday = DayOfWeek | 'Sunday';

export type AppSection =
  | 'dashboard'
  | 'teachers'
  | 'timetable'
  | 'substitutions'
  | 'receipts'
  | 'settings';

export type TeacherPresenceStatus = 'Available' | 'Absent' | 'On Substitution';

export interface Teacher {
  id: string;
  name: string;
  shortCode: string;
  mainSubject: string;
  secondarySubject: string;
  department: string;
  maxDailySubstitutions: number;
  active: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: number;
  section: string;
}

export interface PeriodDefinition {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  periodNumber: number;
  classId: string;
  subject: string;
  teacherId: string;
}

export type MatchTier =
  | 'exact_main'
  | 'secondary_subject'
  | 'department'
  | 'general_available'
  | 'manual'
  | 'unassigned';

export type AssignmentStatus = 'proposed' | 'manual_required' | 'confirmed';

export interface SubstitutionAssignment {
  id: string;
  dateISO: string;
  day: DayOfWeek;
  periodNumber: number;
  periodTime: string;
  classId: string;
  className: string;
  subject: string;
  absentTeacherId: string;
  absentTeacherName: string;
  substituteTeacherId: string | null;
  substituteTeacherName: string | null;
  reason: string;
  matchTier: MatchTier;
  isManualOverride: boolean;
  status: AssignmentStatus;
}

export interface CandidateEvaluation {
  teacher: Teacher;
  eligible: boolean;
  matchTier: MatchTier;
  reason: string;
  unavailableReason?: string;
  currentSubCount: number;
  dailyRegularPeriods: number;
}

export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
  unresolvedCount: number;
  conflictCount: number;
}

export interface ReceiptAssignmentItem {
  assignmentId: string;
  periodNumber: number;
  className: string;
  subject: string;
  absentTeacherName: string;
}

export interface ReceiptSheet {
  sheetId: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  pageNumber: number;
  totalPages: number;
  items: ReceiptAssignmentItem[];
}

export interface TeacherReceiptBundle {
  bundleId: string;
  batchId: string;
  dateISO: string;
  day: DayOfWeek;
  substituteTeacherId: string;
  substituteTeacherName: string;
  totalAssignedPeriods: number;
  sheets: ReceiptSheet[];
}

export interface ConfirmedScheduleSnapshot {
  batchId: string;
  dateISO: string;
  day: DayOfWeek;
  confirmedAt: string;
  absentTeacherIds: string[];
  assignments: SubstitutionAssignment[];
  receiptBundles: TeacherReceiptBundle[];
  signatureKey: string;
}

export interface ReceiptLayoutConfig {
  offsetXPct: number;
  offsetYPct: number;
  fontScale: number;
}

export interface AppState {
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: string[];
  periods: PeriodDefinition[];
  timetable: TimetableSlot[];
  selectedDateISO: string;
  absentTeacherIds: string[];
  draftAssignments: SubstitutionAssignment[];
  confirmedHistory: ConfirmedScheduleSnapshot[];
  receiptLayout: ReceiptLayoutConfig;
}
