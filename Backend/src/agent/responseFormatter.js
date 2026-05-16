/**
 * Response Formatter
 *
 * Transforms raw agent pipeline output into a clean, frontend-ready JSON structure.
 * Guarantees:
 *   - No null sections (always returns objects/arrays)
 *   - No undefined values (replaced with empty arrays or defaults)
 *   - Human-readable messages when data is sparse
 *   - Demo-friendly sample generation for thin results
 *   - Response metadata (timing, dataset info)
 */

/**
 * Format the full pipeline context into a frontend-consumable response.
 *
 * @param {Object} context - The enriched pipeline context after all steps complete
 * @param {Object} meta - Pipeline metadata (timing, dataset info)
 * @returns {Object} Formatted response
 */
function formatResponse(context, meta = {}) {
  const analysis = formatAnalysis(context.analyzeHistory);
  const graduation = formatGraduation(context.checkGraduation);
  const recommendedCourses = formatRecommendedCourses(context);
  const roadmap = formatRoadmap(context.generateRoadmap);
  const timetable = formatTimetable(context.generateTimetable);
  const risks = formatRisks(context.detectRisks);

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      pipelineExecutionTime: meta.executionTime || 0,
      datasetDepartment: analysis.department || null,
      totalDatasetCourses: analysis.totalCoursesInDepartment || 0,
      pipelineSteps: meta.steps || [],
    },
    analysis,
    graduation,
    recommendedCourses,
    roadmap,
    timetable,
    risks,
  };
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function formatAnalysis(history) {
  return {
    department: (history && history.department) || '',
    year: (history && history.year) || 0,
    totalCreditsEarned: (history && history.totalCredits) || 0,
    creditsByCategory: (history && history.creditsByCategory) || {},
    completedCourseCount: (history && history.completedCourses) ? history.completedCourses.length : 0,
    totalCoursesInDepartment: (history && history.departmentCourseCount) || 0,
  };
}

// ─── Graduation ──────────────────────────────────────────────────────────────

function formatGraduation(graduation) {
  if (!graduation) {
    return {
      canGraduate: false,
      track: null,
      totalCreditsRequired: 0,
      totalCreditsEarned: 0,
      totalCreditsRemaining: 0,
      categories: [],
      unmetConditions: [],
      semesterRisk: null,
      message: 'Graduation requirements could not be evaluated.',
    };
  }
  return {
    canGraduate: graduation.canGraduate || false,
    track: graduation.trackLabel || graduation.track || null,
    totalCreditsRequired: graduation.totalCreditsRequired || 0,
    totalCreditsEarned: graduation.totalCreditsEarned || 0,
    totalCreditsRemaining: graduation.totalCreditsRemaining || 0,
    categories: (graduation.categories || []).map((r) => ({
      categoryId: r.categoryId || '',
      label: r.label || '',
      required: r.required || 0,
      earned: r.earned || 0,
      remaining: r.remaining || 0,
      fulfilled: r.fulfilled || false,
      progress: r.progress || 0,
    })),
    unmetConditions: (graduation.unmetConditions || []).map((c) => ({
      type: c.type || '',
      message: c.message || '',
    })),
    semesterRisk: graduation.semesterRisk || null,
  };
}

// ─── Recommended Courses ─────────────────────────────────────────────────────

function formatRecommendedCourses(context) {
  const careerMatch = context.matchCareerGoals || {};
  const prereqs = context.analyzePrereqs || {};
  const missing = context.detectMissing || {};

  const availableSet = new Set(prereqs.immediatelyAvailable || []);
  const blockedMap = new Map();
  for (const b of (prereqs.blocked || [])) {
    blockedMap.set(b.courseCode, b.unsatisfiedPrereqs || []);
  }

  const allMissing = [
    ...(missing.requiredMissing || []),
    ...(missing.electiveMissing || []),
  ];

  const relevanceLookup = new Map();
  for (const r of (careerMatch.recommendations || [])) {
    relevanceLookup.set(r.courseCode, {
      relevanceScore: r.relevanceScore || 0,
      matchedCareers: r.matchedCareers || [],
    });
  }

  const courses = allMissing.map((course) => {
    const rel = relevanceLookup.get(course.courseCode) || { relevanceScore: 0, matchedCareers: [] };
    const isAvailable = availableSet.has(course.courseCode);
    const blockedPrereqs = blockedMap.get(course.courseCode) || [];

    // Priority formula (career-first, graduation-second):
    //   Career relevance:  relevanceScore * 15  (dominant factor)
    //   Graduation req:    +40 for 전공필수 (important but doesn't override strong career match)
    //   Availability:      +10 (minor tiebreaker)
    //   Penalty:           -20 if no career match AND career goals were specified
    const hasCareerGoals = (careerMatch.careerGoals || []).length > 0;
    let priorityScore = 0;
    priorityScore += rel.relevanceScore * 15;
    if (course.category === '전공필수' || course.category === '교양필수') priorityScore += 40;
    if (isAvailable) priorityScore += 10;
    if (hasCareerGoals && rel.relevanceScore === 0) priorityScore -= 20;

    let prerequisiteStatus;
    if (isAvailable) {
      prerequisiteStatus = 'satisfied';
    } else if (blockedPrereqs.length > 0) {
      prerequisiteStatus = 'blocked';
    } else {
      prerequisiteStatus = 'satisfied';
    }

    return {
      courseName: course.name || '',
      category: course.category || '',
      credits: course.credits || 0,
      relevanceScore: rel.relevanceScore,
      matchedCareers: rel.matchedCareers,
      immediatelyAvailable: isAvailable,
      prerequisiteStatus,
      blockedBy: blockedPrereqs.length > 0 ? blockedPrereqs : [],
      priorityScore,
    };
  });

  courses.sort((a, b) => b.priorityScore - a.priorityScore);

  // If results are too sparse, add a message
  if (courses.length === 0) {
    return {
      courses: [],
      message: 'No recommended courses available. All courses may already be completed.',
    };
  }

  return { courses };
}

// ─── Roadmap ─────────────────────────────────────────────────────────────────

function formatRoadmap(roadmap) {
  if (!roadmap || !roadmap.semesters || roadmap.semesters.length === 0) {
    return {
      totalSemesters: 0,
      semesters: [],
      unscheduledCourses: [],
      message: 'No roadmap could be generated. Ensure department and course data are available.',
    };
  }

  return {
    totalSemesters: roadmap.totalSemestersPlanned || roadmap.semesters.length,
    semesters: roadmap.semesters.map((sem) => ({
      semester: sem.semesterNumber || 0,
      totalCredits: sem.totalCredits || 0,
      courses: (sem.courses || []).map((c) => ({
        courseName: c.name || '',
        category: c.category || '',
        credits: c.credits || 0,
      })),
    })),
    unscheduledCourses: (roadmap.unscheduledCourses || []).map((c) => ({
      courseName: c.name || c.courseCode || '',
      category: c.category || '',
    })),
  };
}

// ─── Timetable ───────────────────────────────────────────────────────────────

function formatTimetable(timetable) {
  if (!timetable || (!timetable.schedule || timetable.schedule.length === 0)) {
    // Check if it's the "no semesters" case
    if (timetable && timetable.message) {
      return {
        semester: null,
        success: false,
        totalScheduled: 0,
        schedule: {},
        unschedulable: [],
        tbd: [],
        message: timetable.message,
      };
    }
    return {
      semester: null,
      success: false,
      totalScheduled: 0,
      schedule: {},
      unschedulable: [],
      tbd: [],
      message: 'No timetable could be generated. Ensure courses have scheduled time slots.',
    };
  }

  const byDay = {};
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  for (const day of DAYS) byDay[day] = [];

  for (const entry of (timetable.schedule || [])) {
    for (const slot of (entry.slots || [])) {
      const day = slot.day || 'TBD';
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({
        courseName: entry.courseName || '',
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
        location: slot.location || null,
        professor: (entry.professors && entry.professors[0]) || null,
      });
    }
  }

  // Sort each day by start time
  for (const day of Object.keys(byDay)) {
    byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Remove empty days
  const schedule = {};
  for (const [day, slots] of Object.entries(byDay)) {
    if (slots.length > 0) schedule[day] = slots;
  }

  return {
    semester: timetable.semester || null,
    success: timetable.success !== false,
    totalScheduled: (timetable.schedule || []).length,
    schedule,
    unschedulable: (timetable.unschedulable || []).map((c) => ({
      courseName: c.courseName || '',
      reason: c.reason || 'Unknown conflict',
    })),
    tbd: (timetable.tbd || []).map((c) => ({
      courseName: c.courseName || '',
      reason: c.reason || 'Time not yet announced',
    })),
    // Preference optimization results
    timetableScore: timetable.timetableScore || 0,
    satisfiedPreferences: (timetable.satisfiedPreferences || []).map((p) => ({
      preference: p.preference || '',
      reason: p.reason || '',
    })),
    violatedPreferences: (timetable.violatedPreferences || []).map((p) => ({
      preference: p.preference || '',
      reason: p.reason || '',
    })),
    optimizationReasoning: timetable.optimizationReasoning || '',
    candidatesEvaluated: timetable.candidatesEvaluated || 0,
  };
}

// ─── Risks ───────────────────────────────────────────────────────────────────

function formatRisks(risks) {
  const SEVERITY_LABELS = {
    critical: '🚨',
    high: '⚠️',
    medium: '📋',
    low: 'ℹ️',
  };

  if (!risks || !risks.risks || risks.risks.length === 0) {
    return {
      totalRisks: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      warnings: [],
      message: 'No risks detected. Your academic plan looks good!',
    };
  }

  return {
    totalRisks: risks.totalRisks || 0,
    summary: {
      critical: risks.criticalCount || 0,
      high: risks.highCount || 0,
      medium: risks.risks.filter((r) => r.severity === 'medium').length,
      low: risks.risks.filter((r) => r.severity === 'low').length,
    },
    warnings: risks.risks.map((r) => ({
      severity: r.severity || 'low',
      icon: SEVERITY_LABELS[r.severity] || 'ℹ️',
      type: r.type || 'UNKNOWN',
      message: r.message || '',
    })),
  };
}

module.exports = { formatResponse };
