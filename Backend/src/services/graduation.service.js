const fs = require('fs');
const path = require('path');

/**
 * Graduation Requirement Engine
 *
 * Supports multiple academic tracks:
 *   - singleMajor (단일전공)
 *   - doubleMajor (복수전공)
 *   - minor (부전공)
 *   - advancedMajor (심화전공)
 *   - linkedMajor (연계전공)
 *
 * Provides:
 *   - Dynamic rule loading per department
 *   - Multi-track graduation evaluation
 *   - Remaining credits calculation by category
 *   - Graduation eligibility check
 *   - Additional semester risk prediction
 *   - Combinable with second major/minor departments
 */

const REQ_FILE = path.resolve(__dirname, '../data/graduationRequirements.json');

let _requirements = null;

// ─── Rule Loader ─────────────────────────────────────────────────────────────

/**
 * Load graduation requirements from JSON. Cached after first call.
 */
function loadRequirements() {
  if (_requirements) return _requirements;
  if (!fs.existsSync(REQ_FILE)) {
    _requirements = {};
    return _requirements;
  }
  let content = fs.readFileSync(REQ_FILE, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  _requirements = JSON.parse(content);
  return _requirements;
}

/**
 * Force reload (for tests or hot-reload).
 */
function reload() {
  _requirements = null;
  return loadRequirements();
}

/**
 * Get the full requirement config for a department.
 */
function getDepartmentConfig(department) {
  const all = loadRequirements();
  const normalized = department ? department.normalize('NFC') : department;
  return all[department] || all[normalized] || null;
}

/**
 * Get a specific track's requirements.
 */
function getTrackRequirements(department, track) {
  const config = getDepartmentConfig(department);
  if (!config || !config.tracks) return null;
  return config.tracks[track] || null;
}

/**
 * List available tracks for a department.
 */
function listTracks(department) {
  const config = getDepartmentConfig(department);
  if (!config || !config.tracks) return [];
  return Object.entries(config.tracks).map(([key, val]) => ({
    trackId: key,
    label: val.label,
    totalCredits: val.totalCredits,
    notes: val.notes || '',
  }));
}

// ─── Academic Profile Model ──────────────────────────────────────────────────

/**
 * Build a student academic profile from input.
 *
 * @param {Object} input
 *   - department: string (primary major)
 *   - track: string (singleMajor | doubleMajor | minor | advancedMajor | linkedMajor)
 *   - secondDepartment?: string (for doubleMajor/linkedMajor)
 *   - minorDepartment?: string (for minor track)
 *   - year: number
 *   - completedCourses: Array<{name, category, credits, department?}>
 * @returns {Object} Normalized academic profile
 */
function buildProfile(input = {}) {
  const {
    department = '',
    track = 'singleMajor',
    secondDepartment = null,
    minorDepartment = null,
    year = 1,
    completedCourses = [],
  } = input;

  // Classify credits by category
  const creditsByCategory = {};
  let totalCredits = 0;
  for (const c of completedCourses) {
    const cat = c.category || '미분류';
    creditsByCategory[cat] = (creditsByCategory[cat] || 0) + (c.credits || 0);
    totalCredits += c.credits || 0;
  }

  return {
    department,
    track,
    secondDepartment,
    minorDepartment,
    year,
    completedCourses,
    totalCredits,
    creditsByCategory,
    completedSemesters: (year - 1) * 2,
  };
}

// ─── Graduation Requirement Calculator ───────────────────────────────────────

/**
 * Evaluate graduation status for a student profile.
 *
 * @param {Object} profile - from buildProfile()
 * @returns {Object} Full graduation evaluation result
 */
function evaluate(profile) {
  const { department, track } = profile;
  const config = getDepartmentConfig(department);

  if (!config) {
    return {
      department,
      track,
      canGraduate: false,
      reason: `No graduation requirements defined for ${department}`,
      totalCreditsRequired: 0,
      totalCreditsEarned: profile.totalCredits,
      categories: [],
      mandatoryCoursesStatus: [],
      semesterRisk: null,
    };
  }

  const trackReq = config.tracks[track];
  if (!trackReq) {
    return {
      department,
      track,
      canGraduate: false,
      reason: `Track '${track}' not defined for ${department}. Available: ${Object.keys(config.tracks).join(', ')}`,
      totalCreditsRequired: 0,
      totalCreditsEarned: profile.totalCredits,
      categories: [],
      mandatoryCoursesStatus: [],
      semesterRisk: null,
    };
  }

  // Map course categories to requirement categories
  const categoryMapping = config.categoryMapping || {};
  const mappedCredits = mapCreditsToRequirements(profile.creditsByCategory, categoryMapping);

  // Evaluate each category
  const categoryResults = evaluateCategories(trackReq.categories, mappedCredits);

  // Check mandatory courses
  const completedNames = new Set(profile.completedCourses.map((c) => c.name));
  const mandatoryStatus = (trackReq.mandatoryCourses || []).map((name) => ({
    courseName: name,
    completed: completedNames.has(name),
  }));

  // Total credits check
  const totalRequired = trackReq.totalCredits || 0;
  const totalFulfilled = profile.totalCredits >= totalRequired;

  // Overall eligibility
  const allCategoriesFulfilled = categoryResults.every((r) => r.fulfilled);
  const allMandatoryTaken = mandatoryStatus.every((m) => m.completed);
  const canGraduate = totalFulfilled && allCategoriesFulfilled && allMandatoryTaken;

  // Remaining credits calculation
  const totalRemaining = calculateTotalRemaining(categoryResults, totalRequired, profile.totalCredits);

  // Semester risk prediction
  const semesterRisk = predictSemesterRisk(profile, totalRemaining, config);

  return {
    department,
    track,
    trackLabel: trackReq.label,
    canGraduate,
    totalCreditsRequired: totalRequired,
    totalCreditsEarned: profile.totalCredits,
    totalCreditsRemaining: Math.max(0, totalRequired - profile.totalCredits),
    categories: categoryResults,
    mandatoryCoursesStatus: mandatoryStatus,
    unmetConditions: buildUnmetConditions(categoryResults, mandatoryStatus, totalFulfilled, totalRequired, profile.totalCredits),
    semesterRisk,
  };
}

/**
 * Map raw course categories (Korean) to requirement category keys.
 */
function mapCreditsToRequirements(creditsByCategory, categoryMapping) {
  const mapped = {};
  for (const [rawCat, credits] of Object.entries(creditsByCategory)) {
    const reqKey = categoryMapping[rawCat] || rawCat;
    mapped[reqKey] = (mapped[reqKey] || 0) + credits;
  }
  return mapped;
}

/**
 * Evaluate each requirement category against earned credits.
 */
function evaluateCategories(categories, mappedCredits) {
  if (!categories) return [];
  return Object.entries(categories).map(([key, cat]) => {
    const earned = mappedCredits[key] || 0;
    const required = cat.credits || 0;
    const remaining = Math.max(0, required - earned);
    return {
      categoryId: key,
      label: cat.label || key,
      description: cat.description || '',
      required,
      earned,
      remaining,
      fulfilled: earned >= required,
      progress: required > 0 ? Math.min(100, Math.round((earned / required) * 100)) : 100,
    };
  });
}

/**
 * Calculate total remaining credits needed (sum of all category shortfalls).
 */
function calculateTotalRemaining(categoryResults, totalRequired, totalEarned) {
  const categoryRemaining = categoryResults.reduce((sum, r) => sum + r.remaining, 0);
  const totalGap = Math.max(0, totalRequired - totalEarned);
  // The actual remaining is the larger of: total gap or sum of category gaps
  return Math.max(categoryRemaining, totalGap);
}

/**
 * Build a list of human-readable unmet conditions.
 */
function buildUnmetConditions(categoryResults, mandatoryStatus, totalFulfilled, totalRequired, totalEarned) {
  const conditions = [];

  if (!totalFulfilled) {
    conditions.push({
      type: 'TOTAL_CREDITS',
      message: `총 이수학점 부족: ${totalEarned}/${totalRequired} (${totalRequired - totalEarned}학점 부족)`,
    });
  }

  for (const cat of categoryResults) {
    if (!cat.fulfilled) {
      conditions.push({
        type: 'CATEGORY_CREDITS',
        categoryId: cat.categoryId,
        message: `${cat.label} 부족: ${cat.earned}/${cat.required} (${cat.remaining}학점 부족)`,
      });
    }
  }

  const missingMandatory = mandatoryStatus.filter((m) => !m.completed);
  if (missingMandatory.length > 0) {
    conditions.push({
      type: 'MANDATORY_COURSES',
      message: `필수과목 미이수: ${missingMandatory.map((m) => m.courseName).join(', ')}`,
      courses: missingMandatory.map((m) => m.courseName),
    });
  }

  return conditions;
}

// ─── Semester Risk Prediction ────────────────────────────────────────────────

/**
 * Predict whether the student can graduate on time or needs additional semesters.
 *
 * @param {Object} profile - student profile
 * @param {number} totalRemaining - total credits still needed
 * @param {Object} config - department config
 * @returns {Object} risk assessment
 */
function predictSemesterRisk(profile, totalRemaining, config) {
  const standardSemesters = config.standardSemesters || 8;
  const maxCreditsPerSemester = config.semesterCreditsMax || 18;
  const minCreditsPerSemester = config.semesterCreditsMin || 12;
  const maxSemesters = config.maxSemesters || 12;

  const completedSemesters = profile.completedSemesters || 0;
  const remainingSemesters = Math.max(0, standardSemesters - completedSemesters);

  // Can the student finish within standard semesters?
  const maxPossibleCredits = remainingSemesters * maxCreditsPerSemester;
  const minSemestersNeeded = Math.ceil(totalRemaining / maxCreditsPerSemester);
  const comfortableSemestersNeeded = Math.ceil(totalRemaining / minCreditsPerSemester);

  const onTrack = totalRemaining <= maxPossibleCredits;
  const needsExtraSemesters = !onTrack;
  const extraSemestersNeeded = needsExtraSemesters
    ? Math.ceil((totalRemaining - maxPossibleCredits) / maxCreditsPerSemester)
    : 0;

  // Average credits per remaining semester
  const avgCreditsNeeded = remainingSemesters > 0
    ? Math.round(totalRemaining / remainingSemesters)
    : totalRemaining;

  let riskLevel;
  if (totalRemaining === 0) {
    riskLevel = 'none';
  } else if (onTrack && avgCreditsNeeded <= 15) {
    riskLevel = 'low';
  } else if (onTrack && avgCreditsNeeded <= maxCreditsPerSemester) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    riskLevel,
    onTrack,
    remainingSemesters,
    standardSemesters,
    completedSemesters,
    totalCreditsRemaining: totalRemaining,
    avgCreditsPerSemester: avgCreditsNeeded,
    maxCreditsPerSemester,
    minSemestersNeeded,
    extraSemestersNeeded,
    message: buildRiskMessage(riskLevel, avgCreditsNeeded, remainingSemesters, extraSemestersNeeded),
  };
}

function buildRiskMessage(riskLevel, avg, remaining, extra) {
  switch (riskLevel) {
    case 'none':
      return '모든 졸업 요건을 충족했습니다.';
    case 'low':
      return `정상 졸업 가능: 남은 ${remaining}학기 동안 평균 ${avg}학점 이수 필요`;
    case 'medium':
      return `졸업 가능하나 학기당 ${avg}학점 이수 필요 (빡빡한 일정)`;
    case 'high':
      return `추가 ${extra}학기 필요 예상. 학기당 최대 학점 이수해도 정규 학기 내 졸업 어려움`;
    default:
      return '';
  }
}

// ─── Convenience: Legacy-compatible evaluate ─────────────────────────────────

/**
 * Simple evaluation for backward compatibility.
 * Accepts department + completedCourses array (no profile needed).
 * Defaults to singleMajor track.
 */
function evaluateSimple(department, completedCourses, options = {}) {
  const profile = buildProfile({
    department,
    track: options.track || 'singleMajor',
    secondDepartment: options.secondDepartment || null,
    minorDepartment: options.minorDepartment || null,
    year: options.year || 1,
    completedCourses,
  });
  return evaluate(profile);
}

module.exports = {
  loadRequirements,
  reload,
  getDepartmentConfig,
  getTrackRequirements,
  listTracks,
  buildProfile,
  evaluate,
  evaluateSimple,
  predictSemesterRisk,
};
