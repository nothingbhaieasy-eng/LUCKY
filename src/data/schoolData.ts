import type {
  DayOfWeek,
  PeriodDefinition,
  SchoolClass,
  Teacher,
  TimetableSlot,
} from '../types/sfs';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const SUBJECT_DEPARTMENT_MAP: Record<string, string> = {
  Mathematics: 'Mathematics',
  Physics: 'Science',
  Chemistry: 'Science',
  Biology: 'Science',
  Science: 'Science',
  English: 'Languages',
  Hindi: 'Languages',
  Sanskrit: 'Languages',
  'Social Science': 'Humanities',
  History: 'Humanities',
  Geography: 'Humanities',
  'Computer Science': 'Technology',
  Economics: 'Commerce',
  Accountancy: 'Commerce',
  'Business Studies': 'Commerce',
};

export const INITIAL_SUBJECTS: string[] = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Hindi',
  'Social Science',
  'Computer Science',
  'Economics',
];

export const INITIAL_CLASSES: SchoolClass[] = [
  { id: 'cls-6a', name: '6A', gradeLevel: 6, section: 'A' },
  { id: 'cls-7a', name: '7A', gradeLevel: 7, section: 'A' },
  { id: 'cls-8a', name: '8A', gradeLevel: 8, section: 'A' },
  { id: 'cls-8b', name: '8B', gradeLevel: 8, section: 'B' },
  { id: 'cls-9a', name: '9A', gradeLevel: 9, section: 'A' },
  { id: 'cls-9b', name: '9B', gradeLevel: 9, section: 'B' },
  { id: 'cls-10a', name: '10A', gradeLevel: 10, section: 'A' },
  { id: 'cls-10b', name: '10B', gradeLevel: 10, section: 'B' },
];

export const INITIAL_PERIODS: PeriodDefinition[] = [
  { periodNumber: 1, label: 'Period 1', startTime: '08:00', endTime: '08:45' },
  { periodNumber: 2, label: 'Period 2', startTime: '08:45', endTime: '09:30' },
  { periodNumber: 3, label: 'Period 3', startTime: '09:30', endTime: '10:15' },
  { periodNumber: 4, label: 'Period 4', startTime: '10:35', endTime: '11:20' },
  { periodNumber: 5, label: 'Period 5', startTime: '11:20', endTime: '12:05' },
  { periodNumber: 6, label: 'Period 6', startTime: '12:35', endTime: '13:20' },
  { periodNumber: 7, label: 'Period 7', startTime: '13:20', endTime: '14:05' },
];

/**
 * Fictional sample faculty for the SFS demonstration environment.
 */
export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-arjun',
    name: 'Arjun Mehta',
    shortCode: 'AM',
    mainSubject: 'Mathematics',
    secondarySubject: 'Physics',
    department: 'Mathematics',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-priya',
    name: 'Priya Nair',
    shortCode: 'PN',
    mainSubject: 'Mathematics',
    secondarySubject: 'Computer Science',
    department: 'Mathematics',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-rohit',
    name: 'Rohit Kulkarni',
    shortCode: 'RK',
    mainSubject: 'Science',
    secondarySubject: 'Mathematics',
    department: 'Science',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-ananya',
    name: 'Ananya Sen',
    shortCode: 'AS',
    mainSubject: 'Physics',
    secondarySubject: 'Science',
    department: 'Science',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-vikram',
    name: 'Vikram Joshi',
    shortCode: 'VJ',
    mainSubject: 'Chemistry',
    secondarySubject: 'Science',
    department: 'Science',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-meera',
    name: 'Meera Iyer',
    shortCode: 'MI',
    mainSubject: 'Biology',
    secondarySubject: 'Science',
    department: 'Science',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-kavita',
    name: 'Kavita Deshmukh',
    shortCode: 'KD',
    mainSubject: 'English',
    secondarySubject: 'Social Science',
    department: 'Languages',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-neha',
    name: 'Neha Kapoor',
    shortCode: 'NK',
    mainSubject: 'English',
    secondarySubject: 'Hindi',
    department: 'Languages',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-sanjay',
    name: 'Sanjay Verma',
    shortCode: 'SV',
    mainSubject: 'Hindi',
    secondarySubject: 'Social Science',
    department: 'Languages',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-divya',
    name: 'Divya Menon',
    shortCode: 'DM',
    mainSubject: 'Social Science',
    secondarySubject: 'English',
    department: 'Humanities',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-rahul',
    name: 'Rahul Saxena',
    shortCode: 'RS',
    mainSubject: 'Social Science',
    secondarySubject: 'Economics',
    department: 'Humanities',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-ishita',
    name: 'Ishita Bose',
    shortCode: 'IB',
    mainSubject: 'Computer Science',
    secondarySubject: 'Mathematics',
    department: 'Technology',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-karan',
    name: 'Karan Malhotra',
    shortCode: 'KM',
    mainSubject: 'Economics',
    secondarySubject: 'Mathematics',
    department: 'Commerce',
    maxDailySubstitutions: 3,
    active: true,
  },
  {
    id: 'tch-sunita',
    name: 'Sunita Rao',
    shortCode: 'SR',
    mainSubject: 'Science',
    secondarySubject: 'Biology',
    department: 'Science',
    maxDailySubstitutions: 3,
    active: true,
  },
];

type DayScheduleTemplate = Record<
  string,
  Array<{ period: number; subject: string; teacherId: string }>
>;

/**
 * Carefully conflict-free weekly timetable (zero double-booked teachers per day+period).
 * Each teacher teaches 3-5 periods per day so free substitute teachers are available
 * across periods, while still providing realistic multi-teacher scheduling constraints.
 */
const MONDAY_SCHEDULE: DayScheduleTemplate = {
  'cls-6a': [
    { period: 1, subject: 'English', teacherId: 'tch-kavita' },
    { period: 2, subject: 'Mathematics', teacherId: 'tch-priya' },
    { period: 3, subject: 'Science', teacherId: 'tch-rohit' },
    { period: 4, subject: 'Hindi', teacherId: 'tch-sanjay' },
    { period: 5, subject: 'Social Science', teacherId: 'tch-divya' },
    { period: 6, subject: 'Computer Science', teacherId: 'tch-ishita' },
  ],
  'cls-7a': [
    { period: 1, subject: 'Mathematics', teacherId: 'tch-priya' },
    { period: 2, subject: 'Science', teacherId: 'tch-sunita' },
    { period: 3, subject: 'English', teacherId: 'tch-neha' },
    { period: 4, subject: 'Social Science', teacherId: 'tch-rahul' },
    { period: 5, subject: 'Hindi', teacherId: 'tch-sanjay' },
    { period: 7, subject: 'Computer Science', teacherId: 'tch-ishita' },
  ],
  'cls-8a': [
    { period: 1, subject: 'Mathematics', teacherId: 'tch-arjun' },
    { period: 2, subject: 'English', teacherId: 'tch-kavita' },
    { period: 3, subject: 'Computer Science', teacherId: 'tch-ishita' },
    { period: 4, subject: 'Science', teacherId: 'tch-rohit' },
    { period: 5, subject: 'Hindi', teacherId: 'tch-neha' },
    { period: 6, subject: 'Social Science', teacherId: 'tch-divya' },
  ],
  'cls-8b': [
    { period: 1, subject: 'Science', teacherId: 'tch-sunita' },
    { period: 2, subject: 'Hindi', teacherId: 'tch-sanjay' },
    { period: 3, subject: 'Mathematics', teacherId: 'tch-arjun' },
    { period: 4, subject: 'English', teacherId: 'tch-kavita' },
    { period: 5, subject: 'Computer Science', teacherId: 'tch-ishita' },
    { period: 7, subject: 'Social Science', teacherId: 'tch-rahul' },
  ],
  'cls-9a': [
    { period: 1, subject: 'Physics', teacherId: 'tch-ananya' },
    { period: 2, subject: 'Social Science', teacherId: 'tch-divya' },
    { period: 3, subject: 'Chemistry', teacherId: 'tch-vikram' },
    { period: 4, subject: 'Mathematics', teacherId: 'tch-priya' },
    { period: 5, subject: 'English', teacherId: 'tch-kavita' },
    { period: 6, subject: 'Biology', teacherId: 'tch-meera' },
  ],
  'cls-9b': [
    { period: 1, subject: 'Biology', teacherId: 'tch-meera' },
    { period: 2, subject: 'Physics', teacherId: 'tch-ananya' },
    { period: 3, subject: 'Social Science', teacherId: 'tch-rahul' },
    { period: 4, subject: 'Chemistry', teacherId: 'tch-vikram' },
    { period: 5, subject: 'Mathematics', teacherId: 'tch-arjun' },
    { period: 7, subject: 'English', teacherId: 'tch-neha' },
  ],
  'cls-10a': [
    { period: 1, subject: 'Social Science', teacherId: 'tch-rahul' },
    { period: 2, subject: 'Chemistry', teacherId: 'tch-vikram' },
    { period: 3, subject: 'Economics', teacherId: 'tch-karan' },
    { period: 4, subject: 'Physics', teacherId: 'tch-ananya' },
    { period: 5, subject: 'Biology', teacherId: 'tch-meera' },
    { period: 6, subject: 'Mathematics', teacherId: 'tch-arjun' },
  ],
  'cls-10b': [
    { period: 1, subject: 'Chemistry', teacherId: 'tch-vikram' },
    { period: 2, subject: 'Economics', teacherId: 'tch-karan' },
    { period: 3, subject: 'Biology', teacherId: 'tch-meera' },
    { period: 4, subject: 'Mathematics', teacherId: 'tch-karan' },
    { period: 5, subject: 'Physics', teacherId: 'tch-ananya' },
    { period: 7, subject: 'English', teacherId: 'tch-kavita' },
  ],
};

function rotateDaySchedule(
  base: DayScheduleTemplate,
  periodShift: number
): DayScheduleTemplate {
  const result: DayScheduleTemplate = {};
  for (const [classId, entries] of Object.entries(base)) {
    result[classId] = entries.map((entry) => ({
      ...entry,
      period: ((entry.period - 1 + periodShift) % 7) + 1,
    }));
  }
  return result;
}

export function buildInitialTimetable(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  DAYS_OF_WEEK.forEach((day, dayIdx) => {
    const daySchedule =
      dayIdx === 0 ? MONDAY_SCHEDULE : rotateDaySchedule(MONDAY_SCHEDULE, dayIdx);
    const maxPeriods = day === 'Saturday' ? 5 : 7;

    for (const [classId, entries] of Object.entries(daySchedule)) {
      for (const item of entries) {
        if (item.period > maxPeriods) continue;
        slots.push({
          id: `slot-${day.toLowerCase()}-${classId}-p${item.period}`,
          day,
          periodNumber: item.period,
          classId,
          subject: item.subject,
          teacherId: item.teacherId,
        });
      }
    }
  });
  return slots;
}

export function deriveDayFromDateISO(dateISO: string): {
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timetableDay: DayOfWeek | null;
  isSchoolDay: boolean;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  if (!match) {
    return { weekday: 'Monday', timetableDay: 'Monday', isSchoolDay: true };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayNum = Number(match[3]);
  const dt = new Date(year, month - 1, dayNum);
  const jsDay = dt.getDay();
  const map = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  } as const;
  const weekday = map[jsDay as keyof typeof map] ?? 'Monday';
  return {
    weekday,
    timetableDay: weekday === 'Sunday' ? null : weekday,
    isSchoolDay: weekday !== 'Sunday',
  };
}

export function getDefaultDateAndDay(): {
  dateISO: string;
  day: DayOfWeek | null;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const dateISO = `${year}-${month}-${date}`;
  const derived = deriveDayFromDateISO(dateISO);
  return { dateISO, day: derived.timetableDay };
}
