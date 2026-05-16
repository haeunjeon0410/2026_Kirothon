const datasetService = require('./dataset.service');
const graduationService = require('./graduation.service');
const AppError = require('../utils/AppError');

/**
 * Academic service - operates on dataset-backed course records.
 * Accepts completed courses by name (since dataset has no official codes).
 */

/**
 * POST /academic/analyze
 * Body: { department, completedCourseNames: [string] }
 */
async function analyzeRecord(input = {}) {
  const { department, completedCourseNames = [] } = input;
  if (!department) throw new AppError('department is required', 400);

  const allCourses = datasetService.getCoursesByDepartment(department);
  const byName = new Map(allCourses.map((c) => [c.name, c]));
  const completed = completedCourseNames.map((n) => byName.get(n)).filter(Boolean);

  const totalCredits = completed.reduce((s, c) => s + (c.credits || 0), 0);
  const creditsByCategory = {};
  for (const c of completed) {
    creditsByCategory[c.category] = (creditsByCategory[c.category] || 0) + (c.credits || 0);
  }

  return {
    department,
    totalCredits,
    creditsByCategory,
    completedCourseCount: completed.length,
    unrecognizedCourseNames: completedCourseNames.filter((n) => !byName.has(n)),
    completedCourses: completed.map((c) => ({
      courseCode: c.courseCode,
      name: c.name,
      credits: c.credits,
      category: c.category,
    })),
  };
}

/**
 * GET /academic/graduation-status/:userId
 * Also accepts query params:
 *   ?department=...&completedCourseNames=A,B,C&track=singleMajor&year=2
 * for stateless evaluation without a DB user.
 */
async function getGraduationStatus(userIdOrInput, query = {}) {
  const department = query.department;
  if (!department) {
    throw new AppError('department is required (provide ?department=...)', 400);
  }
  const names = query.completedCourseNames
    ? String(query.completedCourseNames).split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const allCourses = datasetService.getCoursesByDepartment(department);
  const byName = new Map(allCourses.map((c) => [c.name, c]));
  const completed = names.map((n) => byName.get(n)).filter(Boolean);

  const profile = graduationService.buildProfile({
    department,
    track: query.track || 'singleMajor',
    secondDepartment: query.secondDepartment || null,
    minorDepartment: query.minorDepartment || null,
    year: parseInt(query.year, 10) || 1,
    completedCourses: completed,
  });

  return graduationService.evaluate(profile);
}

/**
 * GET /academic/tracks/:department
 * List available graduation tracks for a department.
 */
async function listTracks(department) {
  if (!department) throw new AppError('department is required', 400);
  return graduationService.listTracks(department);
}

module.exports = { analyzeRecord, getGraduationStatus, listTracks };
