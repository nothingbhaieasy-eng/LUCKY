import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Premium3DBackground } from './components/Premium3DBackground';
import { PrintQueueOverlay, PrintReceipts } from './components/PrintReceipts';
import { SettingsPanel } from './components/SettingsPanel';
import { Sidebar } from './components/Sidebar';
import { SubstitutionReview } from './components/SubstitutionReview';
import { TeacherManagement } from './components/TeacherManagement';
import { Timetable } from './components/Timetable';
import { deriveDayFromDateISO } from './data/schoolData';
import {
  confirmSubstitutionSchedule,
  evaluateMatchTier,
  generateSubstitutions,
} from './engine/substitutionEngine';
import type {
  AppSection,
  AppState,
  PeriodDefinition,
  ReceiptLayoutConfig,
  ReceiptSheet,
  SchoolClass,
  Teacher,
  TimetableSlot,
} from './types/sfs';
import {
  clearAndResetAppState,
  loadAppState,
  saveAppState,
} from './utils/storage';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [printSheets, setPrintSheets] = useState<ReceiptSheet[]>([]);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const recomputeDrafts = (
    nextState: AppState,
    preserveManualOverrides: boolean
  ): AppState => {
    const draftAssignments = generateSubstitutions({
      dateISO: nextState.selectedDateISO,
      absentTeacherIds: nextState.absentTeacherIds,
      teachers: nextState.teachers,
      classes: nextState.classes,
      periods: nextState.periods,
      timetable: nextState.timetable,
      existingDrafts: nextState.draftAssignments,
      preserveManualOverrides,
    });
    return {
      ...nextState,
      draftAssignments,
    };
  };

  const handleToggleAbsent = (teacherId: string) => {
    setAppState((prev) => {
      const exists = prev.absentTeacherIds.includes(teacherId);
      const absentTeacherIds = exists
        ? prev.absentTeacherIds.filter((id) => id !== teacherId)
        : [...prev.absentTeacherIds, teacherId];
      return recomputeDrafts({ ...prev, absentTeacherIds }, true);
    });
  };

  const handleChangeDate = (dateISO: string) => {
    setAppState((prev) =>
      recomputeDrafts({ ...prev, selectedDateISO: dateISO }, false)
    );
  };

  // Teacher CRUD
  const handleAddTeacher = (teacherData: Omit<Teacher, 'id'>) => {
    const id = `tch-${teacherData.shortCode.toLowerCase()}-${Date.now()}`;
    setAppState((prev) => {
      const subjects = prev.subjects.includes(teacherData.mainSubject)
        ? prev.subjects
        : [...prev.subjects, teacherData.mainSubject];
      const next: AppState = {
        ...prev,
        teachers: [...prev.teachers, { ...teacherData, id }],
        subjects,
      };
      return recomputeDrafts(next, true);
    });
  };

  const handleUpdateTeacher = (updated: Teacher) => {
    setAppState((prev) => {
      const teachers = prev.teachers.map((t) =>
        t.id === updated.id ? updated : t
      );
      const absentTeacherIds = updated.active
        ? prev.absentTeacherIds
        : prev.absentTeacherIds.filter((id) => id !== updated.id);
      const subjects = prev.subjects.includes(updated.mainSubject)
        ? prev.subjects
        : [...prev.subjects, updated.mainSubject];
      return recomputeDrafts(
        { ...prev, teachers, absentTeacherIds, subjects },
        true
      );
    });
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setAppState((prev) => {
      const teachers = prev.teachers.filter((t) => t.id !== teacherId);
      const timetable = prev.timetable.filter((s) => s.teacherId !== teacherId);
      const absentTeacherIds = prev.absentTeacherIds.filter(
        (id) => id !== teacherId
      );
      return recomputeDrafts(
        { ...prev, teachers, timetable, absentTeacherIds },
        true
      );
    });
  };

  // Timetable CRUD
  const handleUpsertSlot = (slot: TimetableSlot) => {
    setAppState((prev) => {
      const exists = prev.timetable.some((s) => s.id === slot.id);
      const timetable = exists
        ? prev.timetable.map((s) => (s.id === slot.id ? slot : s))
        : [...prev.timetable, slot];
      return recomputeDrafts({ ...prev, timetable }, true);
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    setAppState((prev) => {
      const timetable = prev.timetable.filter((s) => s.id !== slotId);
      return recomputeDrafts({ ...prev, timetable }, true);
    });
  };

  const handleAddClass = (schoolClass: SchoolClass) => {
    setAppState((prev) => ({
      ...prev,
      classes: [...prev.classes, schoolClass],
    }));
  };

  const handleDeleteClass = (classId: string) => {
    setAppState((prev) => {
      const classes = prev.classes.filter((c) => c.id !== classId);
      const timetable = prev.timetable.filter((s) => s.classId !== classId);
      return recomputeDrafts({ ...prev, classes, timetable }, true);
    });
  };

  const handleSavePeriods = (periods: PeriodDefinition[]) => {
    setAppState((prev) => {
      const validNumbers = new Set(periods.map((p) => p.periodNumber));
      const timetable = prev.timetable.filter((s) =>
        validNumbers.has(s.periodNumber)
      );
      return recomputeDrafts({ ...prev, periods, timetable }, true);
    });
  };

  const handleEnsureSubject = (subject: string) => {
    const trimmed = subject.trim();
    if (!trimmed) return;
    setAppState((prev) =>
      prev.subjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : { ...prev, subjects: [...prev.subjects, trimmed] }
    );
  };

  // Substitution Review Handlers
  const handleAssignManual = (
    assignmentId: string,
    substituteTeacherId: string
  ) => {
    setAppState((prev) => {
      const subTeacher = prev.teachers.find(
        (t) => t.id === substituteTeacherId
      );
      if (!subTeacher) return prev;

      const draftAssignments = prev.draftAssignments.map((item) => {
        if (item.id !== assignmentId) return item;
        const match = evaluateMatchTier(subTeacher, item.subject);
        return {
          ...item,
          substituteTeacherId: subTeacher.id,
          substituteTeacherName: subTeacher.name,
          reason: `Manual assignment · ${match.label}`,
          matchTier: 'manual' as const,
          isManualOverride: true,
          status: 'proposed' as const,
        };
      });

      return { ...prev, draftAssignments };
    });
  };

  const handleClearAssignment = (assignmentId: string) => {
    setAppState((prev) => {
      const draftAssignments = prev.draftAssignments.map((item) => {
        if (item.id !== assignmentId) return item;
        return {
          ...item,
          substituteTeacherId: null,
          substituteTeacherName: null,
          reason: 'Assignment cleared manually — manual selection required',
          matchTier: 'unassigned' as const,
          isManualOverride: true,
          status: 'manual_required' as const,
        };
      });
      return { ...prev, draftAssignments };
    });
  };

  const handleRecalculate = () => {
    setAppState((prev) => recomputeDrafts(prev, false));
  };

  const handleConfirmSubstitutions = (): { ok: boolean; errors: string[] } => {
    const result = confirmSubstitutionSchedule({
      dateISO: appState.selectedDateISO,
      absentTeacherIds: appState.absentTeacherIds,
      draftAssignments: appState.draftAssignments,
      teachers: appState.teachers,
      classes: appState.classes,
      timetable: appState.timetable,
      existingHistory: appState.confirmedHistory,
    });

    if (!result.ok || !result.snapshot) {
      return { ok: false, errors: result.errors };
    }

    if (!result.wasDuplicate) {
      setAppState((prev) => ({
        ...prev,
        confirmedHistory: result.history,
        draftAssignments: result.snapshot!.assignments,
      }));
    }

    setActiveSection('receipts');
    return { ok: true, errors: [] };
  };

  // Printing Helpers
  const triggerPrintSheets = (sheets: ReceiptSheet[]) => {
    if (sheets.length === 0) return;
    setPrintSheets(sheets);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 60);
    });
  };

  // Settings Handlers
  const handleUpdateReceiptLayout = (receiptLayout: ReceiptLayoutConfig) => {
    setAppState((prev) => ({ ...prev, receiptLayout }));
  };

  const handleImportState = (nextState: AppState) => {
    setAppState(recomputeDrafts(nextState, true));
  };

  const handleResetDemoData = () => {
    const fresh = clearAndResetAppState();
    setAppState(fresh);
    setActiveSection('dashboard');
  };

  const derivedScheduleDay = useMemo(
    () => deriveDayFromDateISO(appState.selectedDateISO).timetableDay ?? 'Monday',
    [appState.selectedDateISO]
  );

  const activeAssignmentsForWorkload = useMemo(() => {
    const latestForDate = appState.confirmedHistory.find(
      (entry) => entry.dateISO === appState.selectedDateISO
    );
    return latestForDate ? latestForDate.assignments : appState.draftAssignments;
  }, [
    appState.confirmedHistory,
    appState.draftAssignments,
    appState.selectedDateISO,
  ]);

  const sidebarReceiptCount = useMemo(() => {
    const latestForDate = appState.confirmedHistory.find(
      (entry) => entry.dateISO === appState.selectedDateISO
    );
    if (latestForDate) return latestForDate.receiptBundles.length;
    return appState.confirmedHistory[0]?.receiptBundles.length ?? 0;
  }, [appState.confirmedHistory, appState.selectedDateISO]);

  return (
    <>
      <Premium3DBackground />
      <div className="sfs-screen-app relative z-10 min-h-screen flex flex-col lg:flex-row bg-transparent text-[#1D241E]">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          pendingCount={appState.draftAssignments.length}
          receiptCount={sidebarReceiptCount}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div className="max-w-7xl mx-auto">
            {activeSection === 'dashboard' && (
              <Dashboard
                selectedDateISO={appState.selectedDateISO}
                teachers={appState.teachers}
                absentTeacherIds={appState.absentTeacherIds}
                draftAssignments={appState.draftAssignments}
                confirmedHistory={appState.confirmedHistory}
                onChangeDate={handleChangeDate}
                onToggleAbsent={handleToggleAbsent}
                onGoToSubstitutions={() => setActiveSection('substitutions')}
                onGoToReceipts={() => setActiveSection('receipts')}
              />
            )}

            {activeSection === 'teachers' && (
              <TeacherManagement
                teachers={appState.teachers}
                subjects={appState.subjects}
                activeAssignments={activeAssignmentsForWorkload}
                onAddTeacher={handleAddTeacher}
                onUpdateTeacher={handleUpdateTeacher}
                onDeleteTeacher={handleDeleteTeacher}
              />
            )}

            {activeSection === 'timetable' && (
              <Timetable
                teachers={appState.teachers}
                classes={appState.classes}
                periods={appState.periods}
                subjects={appState.subjects}
                timetable={appState.timetable}
                selectedDay={derivedScheduleDay}
                onUpsertSlot={handleUpsertSlot}
                onDeleteSlot={handleDeleteSlot}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onSavePeriods={handleSavePeriods}
                onEnsureSubject={handleEnsureSubject}
              />
            )}

            {activeSection === 'substitutions' && (
              <SubstitutionReview
                selectedDateISO={appState.selectedDateISO}
                teachers={appState.teachers}
                classes={appState.classes}
                timetable={appState.timetable}
                absentTeacherIds={appState.absentTeacherIds}
                draftAssignments={appState.draftAssignments}
                confirmedHistory={appState.confirmedHistory}
                onAssignManual={handleAssignManual}
                onClearAssignment={handleClearAssignment}
                onRecalculate={handleRecalculate}
                onConfirmSubstitutions={handleConfirmSubstitutions}
                onGoToDashboard={() => setActiveSection('dashboard')}
                onGoToReceipts={() => setActiveSection('receipts')}
              />
            )}

            {activeSection === 'receipts' && (
              <PrintReceipts
                confirmedHistory={appState.confirmedHistory}
                selectedDateISO={appState.selectedDateISO}
                receiptLayout={appState.receiptLayout}
                onPrintSheets={triggerPrintSheets}
                onReturnDashboard={() => setActiveSection('dashboard')}
                onGoToSubstitutions={() => setActiveSection('substitutions')}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsPanel
                appState={appState}
                onUpdateReceiptLayout={handleUpdateReceiptLayout}
                onImportState={handleImportState}
                onResetDemoData={handleResetDemoData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Dedicated 40mm x 60mm Print Output Root */}
      <PrintQueueOverlay
        sheets={printSheets}
        layout={appState.receiptLayout}
      />
    </>
  );
}
