const datasetService = require('./dataset.service');
const { solveAll } = require('../utils/timetableSolver');
const preferenceService = require('./timetablePreference.service');
const AppError = require('../utils/AppError');

/**
 * Timetable service - generates a conflict-free, preference-optimized schedule.
 *
 * Accepts course names via any of: `courses`, `courseNames`, or `courseCodes`.
 * Normalizes Unicode (NFC) for consistent Korean matching.
 */
async function generateTimetable(input = {}) {
  const { department, preferences = {} } = input;

  if (!department) throw new AppError('department is required', 400);

  // Accept courses from multiple possible field names
  const rawNames = input.courses || input.courseNames || [];
  const rawCodes = input.courseCodes || [];

  if (rawNames.length === 0 && rawCodes.length === 0) {
    throw new AppError('courses (or courseNames/courseCodes) array is required', 400);
  }

  const allCourses = datasetService.getCoursesByDepartment(department);
  if (allCourses.length === 0) {
    throw new AppError(`No courses found for department '${department}'`, 404);
  }

  // Build lookup maps with NFC normalization
  const byCode = new Map(allCourses.map((c) => [c.courseCode, c]));
  const byName = new Map(allCourses.map((c) => [c.name, c]));
  const byNormalizedName = new Map(allCourses.map((c) => [normalizeName(c.name), c]));

  const matched = [];
  const unmatched = [];

  // Match by code
  for (const code of rawCodes) {
    const normalized = code.normalize('NFC');
    if (byCode.has(normalized)) {
      matched.push(byCode.get(normalized));
    } else {
      unmatched.push(code);
    }
  }

  // Match by name (try exact, then normalized, then substring)
  for (const name of rawNames) {
    const nfc = name.normalize('NFC');

    if (byName.has(nfc)) {
      matched.push(byName.get(nfc));
      continue;
    }

    const norm = normalizeName(nfc);
    if (byNormalizedName.has(norm)) {
      matched.push(byNormalizedName.get(norm));
      continue;
    }

    // Substring match (course name contains input or input contains course name)
    const substringMatch = allCourses.find(
      (c) => c.name.includes(nfc) || nfc.includes(c.name)
    );
    if (substringMatch) {
      matched.push(substringMatch);
      continue;
    }

    unmatched.push(name);
  }

  if (matched.length === 0) {
    const error = new AppError(
      `No valid courses matched. Requested: [${[...rawNames, ...rawCodes].join(', ')}]`,
      400
    );
    error.details = {
      requestedCourses: [...rawNames, ...rawCodes],
      matchedCourses: [],
      unmatchedCourses: unmatched,
      availableSample: allCourses.slice(0, 10).map((c) => c.name),
    };
    throw error;
  }

  // Deduplicate matched courses
  const uniqueMatched = [...new Map(matched.map((c) => [c.courseCode, c])).values()];

  // Generate multiple solutions and rank by preferences
  const solutions = solveAll(uniqueMatched, 20);

  const hasPreferences = Object.keys(preferences).some((k) => {
    const v = preferences[k];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== false;
  });

  let best;
  let candidatesEvaluated = solutions.length;

  if (hasPreferences && solutions.length > 1) {
    const ranked = preferenceService.rankSolutions(solutions, preferences);
    best = ranked.best
      ? { ...solutions.find((_, i) => i === 0), ...ranked.best }
      : solutions[0];
  } else {
    best = solutions[0];
    const evaluation = preferenceService.scoreSchedule(best.schedule || [], preferences);
    best.timetableScore = evaluation.percentage;
    best.satisfiedPreferences = evaluation.details.filter((d) => d.satisfied);
    best.violatedPreferences = evaluation.details.filter((d) => !d.satisfied);
  }

  return {
    department,
    requestedCourses: [...rawNames, ...rawCodes],
    matchedCourses: uniqueMatched.map((c) => c.name),
    unmatchedCourses: unmatched,
    totalRequested: rawNames.length + rawCodes.length,
    totalMatched: uniqueMatched.length,
    totalUnmatched: unmatched.length,
    candidatesEvaluated,
    success: best.success !== false,
    schedule: best.schedule || [],
    tbd: best.tbd || [],
    unschedulable: best.unschedulable || [],
    conflicts: best.conflicts || [],
    timetableScore: best.timetableScore || 0,
    satisfiedPreferences: best.satisfiedPreferences || [],
    violatedPreferences: best.violatedPreferences || [],
  };
}

/**
 * Normalize a name for fuzzy lookup.
 */
function normalizeName(name) {
  return name
    .replace(/\s+/g, '')
    .replace(/[()（）:/\-_]/g, '')
    .toLowerCase()
    .normalize('NFC');
}

module.exports = { generateTimetable };
