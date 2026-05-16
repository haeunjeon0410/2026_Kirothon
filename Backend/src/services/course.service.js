const datasetService = require('./dataset.service');
const { buildPrereqMap, getAvailableCourses } = require('../utils/prereqAnalyzer');

/**
 * Course service - dataset-backed lookups for course catalog endpoints.
 */

/**
 * Get all courses for a given major/department, sorted by category and year.
 */
function getCoursesByMajor(major) {
  const courses = datasetService.getCoursesByDepartment(major);
  return [...courses].sort((a, b) => {
    const catDiff = categoryRank(a.category) - categoryRank(b.category);
    if (catDiff !== 0) return catDiff;
    return (a.recommendedYear || 99) - (b.recommendedYear || 99);
  });
}

/**
 * Get all courses a student can take next given completed course codes.
 */
function getAvailableForStudent(major, completedCodes = []) {
  const courses = datasetService.getCoursesByDepartment(major);
  const prereqMap = buildPrereqMap(courses);
  return getAvailableCourses(courses, prereqMap, completedCodes);
}

function categoryRank(c) {
  const ranks = { '전공필수': 1, '교양필수': 2, '전공선택': 3, '교양선택': 4 };
  return ranks[c] || 99;
}

module.exports = { getCoursesByMajor, getAvailableForStudent };
