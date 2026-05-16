const datasetService = require('../../services/dataset.service');

/**
 * Step 3: Detect missing required courses
 * Identifies all courses in the dataset that the student has not completed,
 * separating required vs elective.
 */
async function detectMissing(context) {
  const { department, completedCodes } = context.analyzeHistory;
  const allCourses = datasetService.getCoursesByDepartment(department);
  const completedSet = new Set(completedCodes);

  const missing = allCourses.filter((c) => !completedSet.has(c.courseCode));

  const required = missing.filter((c) => c.category === '전공필수' || c.category === '교양필수');
  const elective = missing.filter((c) => c.category === '전공선택' || c.category === '교양선택');

  const shape = (c) => ({
    courseCode: c.courseCode,
    name: c.name,
    category: c.category,
    credits: c.credits,
    recommendedYear: c.recommendedYear,
  });

  return {
    totalMissing: missing.length,
    requiredMissing: required.map(shape),
    electiveMissing: elective.map(shape),
  };
}

module.exports = detectMissing;
