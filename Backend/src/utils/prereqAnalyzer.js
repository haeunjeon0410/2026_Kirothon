/**
 * Prerequisite Analyzer
 *
 * The department JSON files do not include explicit prerequisite fields.
 * This module infers prerequisite relationships from course naming patterns
 * and recommended year, plus an optional override map for known dependencies.
 *
 * Rules (lightweight, deterministic):
 *  1. Numeric suffix chain: "X1" -> "X2" -> "X3" (X2 requires X1)
 *  2. "고급X" requires "X" (advanced requires base)
 *  3. Higher recommended year courses depend on same-name lower-year courses
 *  4. Manual overrides take precedence
 */

/**
 * Detect numeric suffix on a course name.
 * "경영데이터분석2" -> { base: "경영데이터분석", level: 2 }
 * "경영데이터분석2:머신러닝을활용한비즈니스모델개발" -> { base: "경영데이터분석", level: 2 }
 * "경영과학1" -> { base: "경영과학", level: 1 }
 * Returns null if no numeric suffix found.
 */
function detectNumberedSeries(name) {
  // Strip subtitle after colon for series detection
  const head = name.split(':')[0].trim();
  const m = head.match(/^(.+?)(\d+)([^\d]*)$/);
  if (!m) return null;
  const [, base, levelStr, tail] = m;
  if (tail && tail.length > 4) return null;
  return { base: base.trim(), level: parseInt(levelStr, 10), tail: tail || '' };
}

/**
 * Detect "고급X" advanced-version pattern.
 */
function detectAdvancedPattern(name) {
  if (name.startsWith('고급')) {
    return { base: name.slice(2).trim() };
  }
  return null;
}

/**
 * Build a prerequisite map for an array of courses.
 * Returns: { [courseCode]: string[] }  (codes of prerequisite courses)
 *
 * @param {Array} courses - normalized course objects with courseCode, name
 * @param {Object} overrides - optional map of explicit prereqs by courseCode
 */
function buildPrereqMap(courses, overrides = {}) {
  const byCode = new Map(courses.map((c) => [c.courseCode, c]));
  const byName = new Map(courses.map((c) => [c.name, c]));

  // Build a head-prefix index for matching titles like "X1:subtitle" -> "X1"
  const byHead = new Map();
  for (const c of courses) {
    const head = c.name.split(':')[0].trim();
    if (!byHead.has(head)) byHead.set(head, c);
  }

  const prereqs = {};

  for (const course of courses) {
    const list = new Set();

    // Rule 1: numeric series
    const numbered = detectNumberedSeries(course.name);
    if (numbered && numbered.level > 1) {
      for (let lvl = numbered.level - 1; lvl >= 1; lvl--) {
        const candidateHead = `${numbered.base}${lvl}${numbered.tail}`;
        const found = byName.get(candidateHead) || byHead.get(candidateHead);
        if (found && found.courseCode !== course.courseCode) {
          list.add(found.courseCode);
          break;
        }
      }
    }

    // Rule 2: advanced pattern
    const advanced = detectAdvancedPattern(course.name);
    if (advanced) {
      const found = byName.get(advanced.base) || byHead.get(advanced.base);
      if (found && found.courseCode !== course.courseCode) {
        list.add(found.courseCode);
      }
    }

    // Rule 4: manual overrides win
    if (overrides[course.courseCode]) {
      for (const code of overrides[course.courseCode]) {
        if (byCode.has(code)) list.add(code);
      }
    }

    prereqs[course.courseCode] = Array.from(list);
  }

  return prereqs;
}

/**
 * Compute prerequisite chain depth for each course.
 * Depth 0 = no prerequisites. Higher depth = longer chain.
 */
function computeDepthMap(prereqMap) {
  const depths = {};

  function depth(code, visiting = new Set()) {
    if (depths[code] !== undefined) return depths[code];
    if (visiting.has(code)) return 0; // circular guard
    visiting.add(code);
    const prs = prereqMap[code] || [];
    if (prs.length === 0) {
      depths[code] = 0;
      return 0;
    }
    const max = Math.max(...prs.map((p) => depth(p, visiting)));
    depths[code] = max + 1;
    return depths[code];
  }

  for (const code of Object.keys(prereqMap)) depth(code);
  return depths;
}

/**
 * Determine which courses are immediately takeable given completed course codes.
 */
function getAvailableCourses(courses, prereqMap, completedCodes) {
  const completedSet = new Set(completedCodes);
  return courses.filter((c) => {
    if (completedSet.has(c.courseCode)) return false;
    const prs = prereqMap[c.courseCode] || [];
    return prs.every((p) => completedSet.has(p));
  });
}

/**
 * Identify blocked courses (have unsatisfied prereqs).
 */
function getBlockedCourses(courses, prereqMap, completedCodes) {
  const completedSet = new Set(completedCodes);
  return courses
    .filter((c) => !completedSet.has(c.courseCode))
    .map((c) => {
      const prs = prereqMap[c.courseCode] || [];
      const unsatisfied = prs.filter((p) => !completedSet.has(p));
      return unsatisfied.length > 0
        ? { courseCode: c.courseCode, name: c.name, unsatisfiedPrereqs: unsatisfied }
        : null;
    })
    .filter(Boolean);
}

module.exports = {
  detectNumberedSeries,
  detectAdvancedPattern,
  buildPrereqMap,
  computeDepthMap,
  getAvailableCourses,
  getBlockedCourses,
};
