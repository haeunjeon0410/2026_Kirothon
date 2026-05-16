/**
 * Step 8: Detect risks
 * Flags issues across the plan: unscheduled courses, heavy semesters,
 * graduation delays, prerequisite bottlenecks, and timetable conflicts.
 */
async function detectRisks(context) {
  const roadmap = context.generateRoadmap;
  const graduation = context.checkGraduation;
  const prereqs = context.analyzePrereqs;
  const timetable = context.generateTimetable;

  const risks = [];

  if (roadmap.unscheduledCourses && roadmap.unscheduledCourses.length > 0) {
    risks.push({
      type: 'ADDITIONAL_SEMESTER_REQUIRED',
      severity: 'high',
      message: `${roadmap.unscheduledCourses.length} courses could not fit within remaining semesters`,
      details: roadmap.unscheduledCourses,
    });
  }

  for (const sem of roadmap.semesters || []) {
    if (sem.totalCredits >= 18) {
      risks.push({
        type: 'HEAVY_SEMESTER',
        severity: 'medium',
        message: `Semester ${sem.semesterNumber} has ${sem.totalCredits} credits`,
        details: { semester: sem.semesterNumber, credits: sem.totalCredits },
      });
    }
  }

  const deepChains = (prereqs.criticalPaths || []).filter((cp) => cp.chainDepth >= 2);
  if (deepChains.length > 0) {
    risks.push({
      type: 'PREREQUISITE_BOTTLENECK',
      severity: 'medium',
      message: `${deepChains.length} courses have prerequisite chains 2+ levels deep`,
      details: deepChains,
    });
  }

  if (graduation && !graduation.canGraduate) {
    risks.push({
      type: 'GRADUATION_RISK',
      severity: 'critical',
      message: 'Current plan does not yet satisfy all graduation requirements',
      details: {
        unfulfilled: (graduation.requirements || []).filter((r) => !r.fulfilled),
        missingRequiredCourses: graduation.missingRequiredCourses || [],
      },
    });
  }

  if (timetable && !timetable.success) {
    risks.push({
      type: 'TIMETABLE_INFEASIBLE',
      severity: 'high',
      message: `${timetable.unschedulable.length} courses could not be placed without conflicts`,
      details: timetable.unschedulable,
    });
  }

  if (timetable && timetable.tbd && timetable.tbd.length > 0) {
    risks.push({
      type: 'TBD_TIME_SLOTS',
      severity: 'low',
      message: `${timetable.tbd.length} courses have no scheduled time yet`,
      details: timetable.tbd,
    });
  }

  return {
    totalRisks: risks.length,
    criticalCount: risks.filter((r) => r.severity === 'critical').length,
    highCount: risks.filter((r) => r.severity === 'high').length,
    risks,
  };
}

module.exports = detectRisks;
