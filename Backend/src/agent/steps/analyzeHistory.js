const prisma = require('../../utils/prisma');
const datasetService = require('../../services/dataset.service');

/**
 * Step 1: Analyze academic history
 *
 * Input sources (any one):
 *   - context.input.userId         -> load user + completed courses from DB
 *   - context.input.department + context.input.completedCourseNames
 *                                  -> resolve against dataset (no DB needed)
 *
 * Output: normalized history with completed-course objects from the dataset.
 */
async function analyzeHistory(context) {
  const input = context.input || {};
  let department = input.department;
  let completedNames = input.completedCourseNames || [];
  let careerGoals = input.careerGoals || [];
  let year = input.year || 1;
  let userId = input.userId || null;

  // If a userId was provided, hydrate from DB
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { completedCourses: { include: { course: true } } },
    });
    if (user) {
      department = department || user.major;
      year = year || user.year;
      careerGoals = careerGoals.length ? careerGoals : (user.careerGoals || []);
      if (completedNames.length === 0) {
        completedNames = user.completedCourses.map((cc) => cc.course.name);
      }
    }
  }

  // Resolve completed course names against the dataset
  const allDeptCourses = department ? datasetService.getCoursesByDepartment(department) : [];
  const byName = new Map(allDeptCourses.map((c) => [c.name, c]));
  const completedCourses = completedNames
    .map((n) => byName.get(n))
    .filter(Boolean);

  const completedCodes = completedCourses.map((c) => c.courseCode);
  const totalCredits = completedCourses.reduce((s, c) => s + (c.credits || 0), 0);

  const creditsByCategory = {};
  for (const c of completedCourses) {
    creditsByCategory[c.category] = (creditsByCategory[c.category] || 0) + (c.credits || 0);
  }

  return {
    userId,
    department,
    year,
    careerGoals,
    totalCredits,
    creditsByCategory,
    completedCodes,
    completedCourses: completedCourses.map((c) => ({
      courseCode: c.courseCode,
      name: c.name,
      credits: c.credits,
      category: c.category,
    })),
    departmentCourseCount: allDeptCourses.length,
  };
}

module.exports = analyzeHistory;
