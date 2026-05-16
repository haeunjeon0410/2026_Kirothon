const datasetService = require('../../services/dataset.service');
const {
  buildPrereqMap,
  computeDepthMap,
  getAvailableCourses,
  getBlockedCourses,
} = require('../../utils/prereqAnalyzer');

/**
 * Step 4: Analyze prerequisite chains
 * Infers prerequisites from course-name patterns in the dataset and
 * computes which courses are immediately takeable vs blocked.
 */
async function analyzePrereqs(context) {
  const { department, completedCodes } = context.analyzeHistory;
  const overrides = (context.input && context.input.prereqOverrides) || {};

  const courses = datasetService.getCoursesByDepartment(department);
  const prereqMap = buildPrereqMap(courses, overrides);
  const depthMap = computeDepthMap(prereqMap);

  const available = getAvailableCourses(courses, prereqMap, completedCodes);
  const blocked = getBlockedCourses(courses, prereqMap, completedCodes);

  // Critical paths: top-N courses with deepest chains still to take
  const criticalPaths = Object.entries(depthMap)
    .filter(([code]) => !completedCodes.includes(code))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, depth]) => {
      const c = courses.find((cc) => cc.courseCode === code);
      return { courseCode: code, name: c ? c.name : code, chainDepth: depth };
    });

  return {
    prereqMap,
    depthMap,
    immediatelyAvailable: available.map((c) => c.courseCode),
    blocked,
    criticalPaths,
  };
}

module.exports = analyzePrereqs;
