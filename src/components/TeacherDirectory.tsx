import { Search, UserCheck, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Teacher, TeacherPresenceStatus } from '../types/sfs';

interface TeacherDirectoryProps {
  teachers: Teacher[];
  absentTeacherIds: string[];
  onSubstitutionTeacherIds: Set<string>;
  onToggleAbsent: (teacherId: string) => void;
}

type StatusFilter = 'All' | TeacherPresenceStatus;

export function TeacherDirectory({
  teachers,
  absentTeacherIds,
  onSubstitutionTeacherIds,
  onToggleAbsent,
}: TeacherDirectoryProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const absentSet = useMemo(
    () => new Set(absentTeacherIds),
    [absentTeacherIds]
  );

  const activeTeachers = useMemo(
    () =>
      teachers
        .filter((t) => t.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teachers]
  );

  const getStatus = (teacherId: string): TeacherPresenceStatus => {
    if (absentSet.has(teacherId)) return 'Absent';
    if (onSubstitutionTeacherIds.has(teacherId)) return 'On Substitution';
    return 'Available';
  };

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeTeachers.filter((teacher) => {
      const status = getStatus(teacher.id);
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        teacher.name.toLowerCase().includes(q) ||
        teacher.mainSubject.toLowerCase().includes(q) ||
        teacher.secondarySubject.toLowerCase().includes(q) ||
        teacher.department.toLowerCase().includes(q)
      );
    });
  }, [activeTeachers, query, statusFilter, absentSet, onSubstitutionTeacherIds]);

  const filterOptions: StatusFilter[] = [
    'All',
    'Available',
    'Absent',
    'On Substitution',
  ];

  return (
    <section aria-labelledby="faculty-directory-heading" className="space-y-5">
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="faculty-directory-heading"
            className="text-xl sm:text-2xl font-semibold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Faculty Directory
          </h2>
          <p className="text-sm text-[#F3E7C6] mt-1">
            Mark one or more absent faculty members to compute period coverage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#12372B]/65 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or subject..."
              aria-label="Search teachers by name or subject"
              className="w-full sm:w-64 min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-white border border-[#C7A45A]/45 rounded-lg text-[#1D241E] placeholder:text-[#4A594E] focus:outline-none focus:ring-2 focus:ring-[#E5D4A5]"
            />
          </div>

          {/* Interactive Status Filter Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-[#C7A45A]/45 rounded-lg overflow-x-auto min-h-[44px]">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4D] cursor-pointer ${
                  statusFilter === opt
                    ? 'bg-[#12372B] text-white'
                    : 'text-[#1D241E] hover:bg-[#FAF9F4] hover:text-[#0B241C]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="sfs-surface-light rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-[#0B241C]">
            No faculty members match your filter.
          </p>
          <p className="text-xs text-[#3D4C42] mt-1">
            Clear the search query or switch back to All faculty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredTeachers.map((teacher) => {
            const status = getStatus(teacher.id);
            const isAbsent = status === 'Absent';
            const isOnSub = status === 'On Substitution';

            return (
              <article
                key={teacher.id}
                className={`sfs-surface-light rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isAbsent
                    ? 'border-[#9B2C2C]/60 bg-[#FFF8F8]'
                    : isOnSub
                    ? 'border-[#C7A45A]'
                    : 'hover:border-[#176B4D]/55'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold tracking-wider shrink-0 border ${
                      isAbsent
                        ? 'bg-[#9B2C2C]/12 text-[#822727] border-[#9B2C2C]/35'
                        : isOnSub
                        ? 'bg-[#EAD8A6]/45 text-[#0B241C] border-[#C7A45A]'
                        : 'bg-[#12372B] text-[#EAD8A6] border-[#12372B]'
                    }`}
                  >
                    {teacher.shortCode}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#0B241C] truncate">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-[#3D4C42] truncate mt-0.5 font-medium">
                      {teacher.mainSubject}
                      {teacher.secondarySubject
                        ? ` · ${teacher.secondarySubject}`
                        : ''}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-1.5 ${
                        isAbsent
                          ? 'text-[#9B2C2C]'
                          : isOnSub
                          ? 'text-[#825B12]'
                          : 'text-[#146C43]'
                      }`}
                    >
                      Status: {status}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleAbsent(teacher.id)}
                  className={`w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A45A] cursor-pointer ${
                    isAbsent
                      ? 'sfs-btn-secondary'
                      : 'sfs-btn-emerald'
                  }`}
                >
                  {isAbsent ? (
                    <>
                      <UserCheck className="w-4 h-4 text-[#146C43] shrink-0" />
                      <span>Mark Present</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 text-[#EAD8A6] shrink-0" />
                      <span>Mark Absent</span>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
