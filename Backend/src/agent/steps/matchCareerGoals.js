const datasetService = require('../../services/dataset.service');
const { rankCoursesByCareer, listCareerTags } = require('../../utils/careerMatcher');

/**
 * Step 5: Match career goals to courses
 * Scores all not-yet-completed courses by career relevance.
 */
async function matchCareerGoals(context) {
  const { department, completedCodes, careerGoals } = context.analyzeHistory;
  const { immediatelyAvailable } = context.analyzePrereqs;

  const allCourses = datasetService.getCoursesByDepartment(department);
  const candidates = allCourses.filter((c) => !completedCodes.includes(c.courseCode));

  if (!careerGoals || careerGoals.length === 0) {
    return {
      matched: false,
      careerGoals: [],
      supportedCareers: listCareerTags(),
      recommendations: [],
      reason: 'No career goals provided',
    };
  }

  const ranked = rankCoursesByCareer(candidates, careerGoals);

  // Highlight courses that are both relevant AND immediately available
  const availableSet = new Set(immediatelyAvailable);
  const top = ranked
    .map((c) => ({
      courseCode: c.courseCode,
      name: c.name,
      category: c.category,
      credits: c.credits,
      relevanceScore: c.relevanceScore,
      matchedCareers: c.matchedCareers,
      immediatelyAvailable: availableSet.has(c.courseCode),
    }))
    .filter((c) => c.relevanceScore > 0)
    .slice(0, 15);

  return {
    matched: true,
    careerGoals,
    supportedCareers: listCareerTags(),
    recommendations: top,
  };
}

module.exports = matchCareerGoals;
