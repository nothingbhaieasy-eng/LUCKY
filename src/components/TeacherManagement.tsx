import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SubstitutionAssignment, Teacher } from '../types/sfs';
import { validateTeacherInput } from '../utils/validation';

interface TeacherManagementProps {
  teachers: Teacher[];
  subjects: string[];
  activeAssignments: SubstitutionAssignment[];
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

const DEPARTMENTS = [
  'Mathematics',
  'Science',
  'Languages',
  'Humanities',
  'Technology',
  'Commerce',
  'Arts & Physical Education',
];

export function TeacherManagement({
  teachers,
  subjects,
  activeAssignments,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
}: TeacherManagementProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [mainSubject, setMainSubject] = useState(subjects[0] ?? 'Mathematics');
  const [secondarySubject, setSecondarySubject] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [maxDailySubstitutions, setMaxDailySubstitutions] = useState(3);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const workloadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeAssignments) {
      if (item.substituteTeacherId) {
        map.set(
          item.substituteTeacherId,
          (map.get(item.substituteTeacherId) ?? 0) + 1
        );
      }
    }
    return map;
  }, [activeAssignments]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...teachers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((t) => {
        if (deptFilter !== 'All' && t.department !== deptFilter) return false;
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          t.mainSubject.toLowerCase().includes(q) ||
          t.secondarySubject.toLowerCase().includes(q) ||
          t.shortCode.toLowerCase().includes(q)
        );
      });
  }, [teachers, search, deptFilter]);

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setShortCode('');
    setMainSubject(subjects[0] ?? 'Mathematics');
    setSecondarySubject('');
    setDepartment(DEPARTMENTS[0]);
    setMaxDailySubstitutions(3);
    setActive(true);
    setErrors([]);
    setModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setShortCode(teacher.shortCode);
    setMainSubject(teacher.mainSubject);
    setSecondarySubject(teacher.secondarySubject);
    setDepartment(teacher.department);
    setMaxDailySubstitutions(teacher.maxDailySubstitutions);
    setActive(teacher.active);
    setErrors([]);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Teacher, 'id'> = {
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      mainSubject: mainSubject.trim(),
      secondarySubject: secondarySubject.trim(),
      department: department.trim(),
      maxDailySubstitutions: Number(maxDailySubstitutions),
      active,
    };

    const result = validateTeacherInput(
      payload,
      teachers,
      editingTeacher?.id
    );
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    if (editingTeacher) {
      onUpdateTeacher({ ...payload, id: editingTeacher.id });
    } else {
      onAddTeacher(payload);
    }
    setModalOpen(false);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTeacher && !shortCode) {
      const initials = val
        .trim()
        .split(/\s+/)
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 3);
      if (initials.length >= 2) {
        setShortCode(initials);
      }
    }
  };

  return (
    <div className="space-y-6 sfs-welcome-enter">
      {/* Header */}
      <div className="sfs-surface-dark rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-2xl sm:text-3xl font-semibold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Faculty Management
          </h1>
          <p className="text-sm text-[#E6EEE8] mt-1 leading-relaxed">
            Maintain teacher subjects, departments, daily substitution caps,
            and active workload.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="sfs-btn-primary min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Teacher</span>
        </button>
      </div>

      {/* Filters */}
      <div className="sfs-surface-ivory rounded-xl p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-[#12372B]/65 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter faculty by name, subject, or code..."
            className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-white border border-[#12372B]/25 rounded-lg text-[#1D241E] placeholder:text-[#4A594E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
          />
        </div>

        <div className="flex flex-col xs:flex-row sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="dept-filter"
            className="text-xs font-semibold text-[#0B241C] whitespace-nowrap"
          >
            Department:
          </label>
          <select
            id="dept-filter"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 text-sm font-medium bg-white border border-[#12372B]/25 rounded-lg text-[#0B241C] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D] cursor-pointer"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {filteredTeachers.length === 0 ? (
          <div className="sfs-surface-light rounded-xl p-8 text-center text-sm text-[#3D4C42]">
            No teachers found matching the current search.
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const subLoad = workloadMap.get(teacher.id) ?? 0;
            return (
              <article
                key={teacher.id}
                className="sfs-surface-light rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-lg bg-[#12372B] text-[#EAD8A6] text-xs font-bold flex items-center justify-center shrink-0">
                      {teacher.shortCode}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-[#0B241C] truncate">
                        {teacher.name}
                      </h2>
                      <p className="text-xs font-medium text-[#3D4C42] truncate">
                        {teacher.department}
                      </p>
                      {!teacher.active && (
                        <p className="text-xs font-semibold text-[#9B2C2C] mt-0.5">
                          Inactive
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <p className="text-[11px] font-semibold text-[#3D4C42]">
                      Load / Cap
                    </p>
                    <p className="text-sm font-mono font-bold text-[#0B241C]">
                      {subLoad} / {teacher.maxDailySubstitutions}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#1D241E] bg-[#FAF9F4] border border-[#12372B]/12 rounded-lg px-3 py-2 space-y-1">
                  <p>
                    <span className="font-semibold text-[#0B241C]">Main:</span>{' '}
                    {teacher.mainSubject}
                  </p>
                  {teacher.secondarySubject && (
                    <p>
                      <span className="font-semibold text-[#0B241C]">
                        Secondary:
                      </span>{' '}
                      {teacher.secondarySubject}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(teacher)}
                    className="sfs-btn-secondary min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(teacher.id)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#9B2C2C] bg-[#FFF8F8] hover:bg-[#FEECEC] border border-[#9B2C2C]/35 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Desktop Faculty Table (>= md) */}
      <div className="hidden md:block sfs-surface-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#12372B]/15 bg-[#FAF9F4] text-xs font-bold text-[#0B241C]">
                <th className="py-3.5 px-4">Teacher</th>
                <th className="py-3.5 px-4">Main Subject</th>
                <th className="py-3.5 px-4">Secondary Subject</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4 text-right">Today&apos;s Load</th>
                <th className="py-3.5 px-4 text-right">Max Cap</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12372B]/10 text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-[#3D4C42]"
                  >
                    No teachers found matching the current search.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const subLoad = workloadMap.get(teacher.id) ?? 0;
                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-[#FAF9F4] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-lg bg-[#12372B] text-[#EAD8A6] text-xs font-bold flex items-center justify-center shrink-0">
                            {teacher.shortCode}
                          </span>
                          <div>
                            <div className="font-bold text-[#0B241C]">
                              {teacher.name}
                            </div>
                            {!teacher.active && (
                              <div className="text-xs font-semibold text-[#9B2C2C]">
                                Inactive
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#1D241E]">
                        {teacher.mainSubject}
                      </td>
                      <td className="py-3.5 px-4 text-[#3D4C42]">
                        {teacher.secondarySubject || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#1D241E]">
                        {teacher.department}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-[#0B241C]">
                        {subLoad}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-[#3D4C42]">
                        {teacher.maxDailySubstitutions}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#12372B] hover:bg-[#EAD8A6]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4D] cursor-pointer"
                            aria-label={`Edit ${teacher.name}`}
                            title="Edit teacher"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(teacher.id)}
                            className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg text-[#9B2C2C] hover:bg-[#9B2C2C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B2C2C] cursor-pointer"
                            aria-label={`Delete ${teacher.name}`}
                            title="Delete teacher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Teacher Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingTeacher ? 'Edit teacher' : 'Add teacher'}
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#12372B]/12">
              <h2
                className="text-xl font-semibold text-[#0B241C]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {editingTeacher ? 'Edit Faculty Member' : 'Add Faculty Member'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-[#3D4C42] hover:text-[#0B241C] hover:bg-[#FAF9F4] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {errors.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#FFF8F8] border border-[#9B2C2C]/40 text-xs font-medium text-[#822727] space-y-1">
                  {errors.map((err) => (
                    <p key={err}>{err}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Teacher Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Meera Iyer"
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Initials / Code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                    placeholder="MI"
                    className="w-full min-h-[42px] px-3 py-2 text-sm font-mono uppercase border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Main Subject
                  </label>
                  <input
                    type="text"
                    list="sfs-subject-suggestions"
                    value={mainSubject}
                    onChange={(e) => setMainSubject(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Secondary Subject (Optional)
                  </label>
                  <input
                    type="text"
                    list="sfs-subject-suggestions"
                    value={secondarySubject}
                    onChange={(e) => setSecondarySubject(e.target.value)}
                    placeholder="e.g., Science"
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                  />
                </div>
              </div>

              <datalist id="sfs-subject-suggestions">
                {subjects.map((subj) => (
                  <option key={subj} value={subj} />
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#12372B]/25 rounded-lg text-[#1D241E] bg-white focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B241C] mb-1.5">
                    Max Daily Substitutions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={maxDailySubstitutions}
                    onChange={(e) =>
                      setMaxDailySubstitutions(Number(e.target.value))
                    }
                    className="w-full min-h-[42px] px-3 py-2 text-sm font-mono border border-[#12372B]/25 rounded-lg text-[#1D241E] focus:outline-none focus:ring-2 focus:ring-[#176B4D]/40 focus:border-[#176B4D]"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#1D241E] cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="accent-[#176B4D] w-4 h-4"
                />
                <span>
                  Active faculty member (eligible for timetable &amp;
                  substitutions)
                </span>
              </label>

              <div className="pt-4 border-t border-[#12372B]/12 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="sfs-btn-secondary min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sfs-btn-primary min-h-[44px] px-5 py-2 text-xs sm:text-sm font-bold rounded-lg cursor-pointer"
                >
                  {editingTeacher ? 'Save Changes' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-[#040F0B]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#C7A45A]/50 max-w-sm w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#0B241C]">
              Remove Faculty Member?
            </h3>
            <p className="text-xs text-[#3D4C42] mt-2 leading-relaxed">
              Deleting{' '}
              <strong className="text-[#0B241C]">
                {teachers.find((t) => t.id === deleteConfirmId)?.name}
              </strong>{' '}
              will also remove their regular timetable slots from the schedule.
            </p>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="sfs-btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTeacher(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="min-h-[42px] px-4 py-2 text-xs font-bold text-white bg-[#9B2C2C] hover:bg-[#822727] rounded-lg cursor-pointer"
              >
                Delete Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
