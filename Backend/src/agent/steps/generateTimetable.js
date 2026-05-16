const datasetService = require('../../services/dataset.service');
const { solveAll } = require('../../utils/timetableSolver');
const preferenceService = require('../../services/timetablePreference.service');

/**
 * Step 7: Generate optimized conflict-free timetable
 *
 * Pipeline:
 *   1. Resolve courses from roadmap's first semester to full dataset objects
 *   2. Generate ALL valid conflict-free solutions (up to 20)
 *   3. Score each solution against user preferences
 *   4. Select the best-scoring solution
 *   5. Return with preference satisfaction details and reasoning
 *
 * Preferences are passed via context.input.preferences:
 *   { preferredFreeDays, avoidMorningClasses, avoidEveningClasses,
 *     compactSchedule, preferredLunchBreak, maxCreditsPerSemester,
 *     preferredDays, avoidDays }
 */
async function generateTimetable(context) {
  const { department } = context.analyzeHistory;
  const roadmap = context.generateRoadmap;
  const input = context.input || {};
  const preferences = input.preferences || {};

  if (!roadmap.semesters || roadmap.semesters.length === 0) {
    return {
      semester: null,
      schedule: [],
      tbd: [],
      unschedulable: [],
      conflicts: [],
      success: true,
      message: 'No semesters to schedule',
      timetableScore: 0,
      satisfiedPreferences: [],
      violatedPreferences: [],
      optimizationReasoning: '',
    };
  }

  const nextSemester = roadmap.semesters[0];
  const allCourses = datasetService.getCoursesByDepartment(department);
  const byCode = new Map(allCourses.map((c) => [c.courseCode, c]));

  // Resolve to full course objects (with sections) for the solver
  const coursesToSchedule = nextSemester.courses
    .map((c) => byCode.get(c.courseCode))
    .filter(Boolean);

  // Generate multiple valid solutions
  const solutions = solveAll(coursesToSchedule, 20);

  // If no preferences specified, just return the first solution
  const hasPreferences = Object.keys(preferences).some((k) => {
    const v = preferences[k];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== false;
  });

  if (!hasPreferences || solutions.length <= 1) {
    const best = solutions[0] || { schedule: [], tbd: [], unschedulable: [], conflicts: [], success: false };
    const evaluation = preferenceService.scoreSchedule(best.schedule, preferences);
    return {
      semester: nextSemester.semesterNumber,
      success: best.success !== false,
      schedule: best.schedule || [],
      tbd: best.tbd || [],
      unschedulable: best.unschedulable || [],
      conflicts: best.conflicts || [],
      timetableScore: evaluation.percentage,
      satisfiedPreferences: evaluation.details.filter((d) => d.satisfied),
      violatedPreferences: evaluation.details.filter((d) => !d.satisfied),
      optimizationReasoning: solutions.length === 1
        ? '유일한 충돌 없는 시간표입니다.'
        : '선호 조건이 지정되지 않아 첫 번째 유효 시간표를 반환합니다.',
      candidatesEvaluated: solutions.length,
    };
  }

  // Rank all solutions by preference score
  const ranked = preferenceService.rankSolutions(solutions, preferences);

  if (!ranked.best) {
    return {
      semester: nextSemester.semesterNumber,
      success: false,
      schedule: [],
      tbd: [],
      unschedulable: [],
      conflicts: [],
      timetableScore: 0,
      satisfiedPreferences: [],
      violatedPreferences: [],
      optimizationReasoning: '유효한 시간표를 생성할 수 없습니다.',
      candidatesEvaluated: 0,
    };
  }

  return {
    semester: nextSemester.semesterNumber,
    success: true,
    schedule: ranked.best.schedule,
    tbd: ranked.best.tbd || [],
    unschedulable: [],
    conflicts: [],
    timetableScore: ranked.best.timetableScore,
    satisfiedPreferences: ranked.best.satisfiedPreferences,
    violatedPreferences: ranked.best.violatedPreferences,
    optimizationReasoning: ranked.best.optimizationReasoning,
    candidatesEvaluated: ranked.totalCandidates,
    alternativeScores: ranked.alternatives,
  };
}

module.exports = generateTimetable;
