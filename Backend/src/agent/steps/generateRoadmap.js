const datasetService = require('../../services/dataset.service');

/**
 * Step 6: Generate optimized semester roadmap
 *
 * Distributes remaining courses across semesters with the priority:
 *   1. Required graduation courses (전공필수)
 *   2. Prerequisite-chain critical-path courses (deeper chains first)
 *   3. Career-relevant courses
 *   4. Other electives
 *
 * Constraints:
 *   - Per-semester credit cap (default 18)
 *   - Prerequisites must be satisfied before scheduling
 */
async function generateRoadmap(context) {
  const input = context.input || {};
  const { department, year, completedCodes } = context.analyzeHistory;
  const { prereqMap, depthMap } = context.analyzePrereqs;
  const { recommendations } = context.matchCareerGoals || { recommendations: [] };
  const graduation = context.checkGraduation;

  const maxCredits = input.maxCreditsPerSemester || 18;
  const totalSemesters = 8;
  const completedSemesters = (year - 1) * 2;
  const remainingSemesters = Math.max(1, totalSemesters - completedSemesters);

  const allCourses = datasetService.getCoursesByDepartment(department);

  // Build a relevance score map for quick lookup
  const relevanceMap = {};
  for (const r of recommendations) relevanceMap[r.courseCode] = r.relevanceScore;

  // Determine which courses are still needed
  // Priority categories that should be hit
  const neededCategories = new Set(
    (graduation.requirements || [])
      .filter((r) => !r.fulfilled)
      .map((r) => r.category)
  );

  let pool = allCourses
    .filter((c) => !completedCodes.includes(c.courseCode))
    .map((c) => ({
      ...c,
      depth: depthMap[c.courseCode] || 0,
      relevance: relevanceMap[c.courseCode] || 0,
      priority: computePriority(c, neededCategories, depthMap, relevanceMap),
    }));

  const semesters = [];
  const taken = new Set(completedCodes);

  for (let sem = 0; sem < remainingSemesters && pool.length > 0; sem++) {
    // Filter pool to courses whose prereqs are now satisfied
    const available = pool.filter((c) =>
      (prereqMap[c.courseCode] || []).every((p) => taken.has(p))
    );

    // Sort by priority desc, then by depth desc (start chains early)
    available.sort((a, b) => b.priority - a.priority || b.depth - a.depth);

    const selected = [];
    let credits = 0;
    for (const course of available) {
      if (credits + (course.credits || 0) <= maxCredits) {
        selected.push(course);
        credits += course.credits || 0;
        taken.add(course.courseCode);
      }
    }

    pool = pool.filter((c) => !taken.has(c.courseCode));

    semesters.push({
      semesterNumber: completedSemesters + sem + 1,
      totalCredits: credits,
      courses: selected.map((c) => ({
        courseCode: c.courseCode,
        name: c.name,
        category: c.category,
        credits: c.credits,
        recommendedYear: c.recommendedYear,
        priority: c.priority,
      })),
    });
  }

  return {
    department,
    totalSemestersPlanned: semesters.length,
    semesters,
    unscheduledCourses: pool.map((c) => ({
      courseCode: c.courseCode,
      name: c.name,
      category: c.category,
    })),
  };
}

/**
 * Compute scheduling priority for a course.
 * Higher = take sooner.
 */
function computePriority(course, neededCategories, depthMap, relevanceMap) {
  let p = 0;
  // Required graduation category gets a strong boost
  if (course.category === '전공필수') p += 100;
  if (neededCategories.has(course.category)) p += 50;
  // Critical path - deep chains start early
  p += (depthMap[course.courseCode] || 0) * 10;
  // Career relevance
  p += (relevanceMap[course.courseCode] || 0) * 5;
  // Recommended year - earlier years preferred when student is early
  if (course.recommendedYear) p += (5 - course.recommendedYear);
  return p;
}

module.exports = generateRoadmap;
