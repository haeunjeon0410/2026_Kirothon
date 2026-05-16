/**
 * Timetable Preference Optimization Service
 *
 * Scores timetable solutions against user preferences and selects the best one.
 * All scoring is deterministic and explainable.
 *
 * Supported preferences:
 *   - preferredFreeDays: string[]     (e.g. ["FRI"] - want these days free)
 *   - avoidMorningClasses: boolean    (avoid classes before 10:00)
 *   - avoidEveningClasses: boolean    (avoid classes after 17:00)
 *   - compactSchedule: boolean        (minimize gaps between classes)
 *   - preferredLunchBreak: boolean    (keep 12:00-13:00 free)
 *   - maxCreditsPerSemester: number   (soft cap, penalize if exceeded)
 *   - preferredDays: string[]         (prefer classes on these days)
 *   - avoidDays: string[]             (avoid classes on these days)
 */

const { toMinutes } = require('../utils/timetableSolver');

// ─── Preference Weights ──────────────────────────────────────────────────────

const WEIGHTS = {
  preferredFreeDays: 25,
  avoidMorningClasses: 15,
  avoidEveningClasses: 15,
  compactSchedule: 20,
  preferredLunchBreak: 10,
  maxCreditsPerSemester: 10,
  preferredDays: 10,
  avoidDays: 20,
};

const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

// ─── Scoring Engine ──────────────────────────────────────────────────────────

/**
 * Score a single timetable solution against user preferences.
 *
 * @param {Array} schedule - array of scheduled entries with .slots
 * @param {Object} preferences - user preference object
 * @returns {Object} { score, maxScore, percentage, details: [{preference, score, maxScore, satisfied, reason}] }
 */
function scoreSchedule(schedule, preferences = {}) {
  if (!schedule || schedule.length === 0) {
    return { score: 0, maxScore: MAX_SCORE, percentage: 0, details: [] };
  }

  const allSlots = schedule.flatMap((entry) =>
    (entry.slots || []).map((s) => ({ ...s, courseName: entry.courseName }))
  );

  const details = [];
  let totalScore = 0;
  let totalMaxScore = 0;

  // 1. Preferred free days
  if (preferences.preferredFreeDays && preferences.preferredFreeDays.length > 0) {
    const result = scoreFreeDays(allSlots, preferences.preferredFreeDays);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 2. Avoid morning classes
  if (preferences.avoidMorningClasses) {
    const result = scoreMorningAvoidance(allSlots);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 3. Avoid evening classes
  if (preferences.avoidEveningClasses) {
    const result = scoreEveningAvoidance(allSlots);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 4. Compact schedule
  if (preferences.compactSchedule) {
    const result = scoreCompactness(allSlots);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 5. Preferred lunch break
  if (preferences.preferredLunchBreak) {
    const result = scoreLunchBreak(allSlots);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 6. Max credits per semester
  if (preferences.maxCreditsPerSemester) {
    const totalCredits = schedule.reduce((s, e) => s + (e.credits || 0), 0);
    const result = scoreCreditsLimit(totalCredits, preferences.maxCreditsPerSemester);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 7. Preferred days
  if (preferences.preferredDays && preferences.preferredDays.length > 0) {
    const result = scorePreferredDays(allSlots, preferences.preferredDays);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // 8. Avoid days
  if (preferences.avoidDays && preferences.avoidDays.length > 0) {
    const result = scoreAvoidDays(allSlots, preferences.avoidDays);
    details.push(result);
    totalScore += result.score;
    totalMaxScore += result.maxScore;
  }

  // If no preferences were specified, give a perfect score
  if (totalMaxScore === 0) {
    return { score: 100, maxScore: 100, percentage: 100, details: [] };
  }

  const percentage = Math.round((totalScore / totalMaxScore) * 100);

  return { score: totalScore, maxScore: totalMaxScore, percentage, details };
}

// ─── Individual Scorers ──────────────────────────────────────────────────────

function scoreFreeDays(slots, freeDays) {
  const maxScore = WEIGHTS.preferredFreeDays;
  const daysUsed = new Set(slots.map((s) => s.day));
  const violations = freeDays.filter((d) => daysUsed.has(d));
  const ratio = 1 - violations.length / freeDays.length;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'preferredFreeDays',
    score,
    maxScore,
    satisfied: violations.length === 0,
    reason: violations.length === 0
      ? `${freeDays.join(', ')} 공강 유지됨`
      : `${violations.join(', ')}에 수업 배정됨 (희망 공강일)`,
  };
}

function scoreMorningAvoidance(slots) {
  const maxScore = WEIGHTS.avoidMorningClasses;
  const morningThreshold = toMinutes('10:00');
  const morningSlots = slots.filter((s) => toMinutes(s.startTime) < morningThreshold);
  const total = slots.length || 1;
  const ratio = 1 - morningSlots.length / total;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'avoidMorningClasses',
    score,
    maxScore,
    satisfied: morningSlots.length === 0,
    reason: morningSlots.length === 0
      ? '오전 10시 이전 수업 없음'
      : `${morningSlots.length}개 수업이 오전 10시 이전에 배정됨`,
  };
}

function scoreEveningAvoidance(slots) {
  const maxScore = WEIGHTS.avoidEveningClasses;
  const eveningThreshold = toMinutes('17:00');
  const eveningSlots = slots.filter((s) => toMinutes(s.startTime) >= eveningThreshold);
  const total = slots.length || 1;
  const ratio = 1 - eveningSlots.length / total;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'avoidEveningClasses',
    score,
    maxScore,
    satisfied: eveningSlots.length === 0,
    reason: eveningSlots.length === 0
      ? '오후 5시 이후 수업 없음'
      : `${eveningSlots.length}개 수업이 오후 5시 이후에 배정됨`,
  };
}

function scoreCompactness(slots) {
  const maxScore = WEIGHTS.compactSchedule;
  const byDay = groupByDay(slots);
  let totalGap = 0;
  let dayCount = 0;

  for (const [, daySlots] of Object.entries(byDay)) {
    if (daySlots.length < 2) continue;
    dayCount++;
    const sorted = daySlots.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      const gap = toMinutes(sorted[i].startTime) - toMinutes(sorted[i - 1].endTime);
      if (gap > 0) totalGap += gap;
    }
  }

  // Score: less gap = higher score. 0 gap = perfect. 180+ min total gap = 0 score.
  const maxGap = 180;
  const ratio = Math.max(0, 1 - totalGap / maxGap);
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'compactSchedule',
    score,
    maxScore,
    satisfied: totalGap <= 30,
    reason: totalGap === 0
      ? '수업 간 공백 없음 (최적 밀집 배치)'
      : `수업 간 총 ${totalGap}분 공백 (${dayCount}일 기준)`,
  };
}

function scoreLunchBreak(slots) {
  const maxScore = WEIGHTS.preferredLunchBreak;
  const lunchStart = toMinutes('12:00');
  const lunchEnd = toMinutes('13:00');

  const byDay = groupByDay(slots);
  let daysWithLunchConflict = 0;
  let totalDays = 0;

  for (const [, daySlots] of Object.entries(byDay)) {
    totalDays++;
    const hasLunchConflict = daySlots.some((s) => {
      const start = toMinutes(s.startTime);
      const end = toMinutes(s.endTime);
      return start < lunchEnd && end > lunchStart;
    });
    if (hasLunchConflict) daysWithLunchConflict++;
  }

  const ratio = totalDays > 0 ? 1 - daysWithLunchConflict / totalDays : 1;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'preferredLunchBreak',
    score,
    maxScore,
    satisfied: daysWithLunchConflict === 0,
    reason: daysWithLunchConflict === 0
      ? '모든 수업일에 점심시간(12-13시) 확보됨'
      : `${daysWithLunchConflict}일에 점심시간 수업 겹침`,
  };
}

function scoreCreditsLimit(totalCredits, maxCredits) {
  const maxScore = WEIGHTS.maxCreditsPerSemester;
  const over = Math.max(0, totalCredits - maxCredits);
  const ratio = over === 0 ? 1 : Math.max(0, 1 - over / 6);
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'maxCreditsPerSemester',
    score,
    maxScore,
    satisfied: over === 0,
    reason: over === 0
      ? `학기 학점 ${totalCredits}/${maxCredits} (제한 이내)`
      : `학기 학점 ${totalCredits}/${maxCredits} (${over}학점 초과)`,
  };
}

function scorePreferredDays(slots, preferredDays) {
  const maxScore = WEIGHTS.preferredDays;
  const preferredSet = new Set(preferredDays);
  const onPreferred = slots.filter((s) => preferredSet.has(s.day)).length;
  const total = slots.length || 1;
  const ratio = onPreferred / total;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'preferredDays',
    score,
    maxScore,
    satisfied: ratio >= 0.8,
    reason: `${onPreferred}/${total} 수업이 선호 요일(${preferredDays.join(',')})에 배정됨`,
  };
}

function scoreAvoidDays(slots, avoidDays) {
  const maxScore = WEIGHTS.avoidDays;
  const avoidSet = new Set(avoidDays);
  const onAvoided = slots.filter((s) => avoidSet.has(s.day)).length;
  const total = slots.length || 1;
  const ratio = 1 - onAvoided / total;
  const score = Math.round(maxScore * ratio);

  return {
    preference: 'avoidDays',
    score,
    maxScore,
    satisfied: onAvoided === 0,
    reason: onAvoided === 0
      ? `회피 요일(${avoidDays.join(',')})에 수업 없음`
      : `${onAvoided}개 수업이 회피 요일(${avoidDays.join(',')})에 배정됨`,
  };
}

// ─── Ranking & Selection ─────────────────────────────────────────────────────

/**
 * Rank multiple timetable solutions by preference score and select the best.
 *
 * @param {Array} solutions - array of solver results (each has .schedule)
 * @param {Object} preferences - user preferences
 * @returns {Object} { best, alternatives, ranking }
 */
function rankSolutions(solutions, preferences = {}) {
  if (!solutions || solutions.length === 0) {
    return { best: null, alternatives: [], ranking: [] };
  }

  const scored = solutions.map((sol, idx) => {
    const evaluation = scoreSchedule(sol.schedule, preferences);
    return { index: idx, solution: sol, ...evaluation };
  });

  scored.sort((a, b) => b.percentage - a.percentage);

  const best = scored[0];
  const alternatives = scored.slice(1, 4); // top 3 alternatives

  return {
    best: {
      schedule: best.solution.schedule,
      tbd: best.solution.tbd,
      timetableScore: best.percentage,
      satisfiedPreferences: best.details.filter((d) => d.satisfied),
      violatedPreferences: best.details.filter((d) => !d.satisfied),
      optimizationReasoning: generateReasoning(best),
    },
    alternatives: alternatives.map((alt) => ({
      timetableScore: alt.percentage,
      satisfiedCount: alt.details.filter((d) => d.satisfied).length,
      violatedCount: alt.details.filter((d) => !d.satisfied).length,
    })),
    totalCandidates: solutions.length,
  };
}

/**
 * Generate human-readable optimization reasoning.
 */
function generateReasoning(scored) {
  const parts = [];

  if (scored.percentage === 100) {
    parts.push('모든 선호 조건을 만족하는 최적 시간표입니다.');
  } else if (scored.percentage >= 80) {
    parts.push('대부분의 선호 조건을 만족하는 우수한 시간표입니다.');
  } else if (scored.percentage >= 50) {
    parts.push('일부 선호 조건에 타협이 필요한 시간표입니다.');
  } else {
    parts.push('선호 조건 충족이 어려운 시간표입니다. 조건 완화를 권장합니다.');
  }

  const satisfied = scored.details.filter((d) => d.satisfied);
  const violated = scored.details.filter((d) => !d.satisfied);

  if (satisfied.length > 0) {
    parts.push(`충족된 조건: ${satisfied.map((d) => d.reason).join('; ')}`);
  }
  if (violated.length > 0) {
    parts.push(`미충족 조건: ${violated.map((d) => d.reason).join('; ')}`);
  }

  return parts.join(' ');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByDay(slots) {
  const byDay = {};
  for (const s of slots) {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  }
  return byDay;
}

module.exports = {
  scoreSchedule,
  rankSolutions,
  generateReasoning,
  WEIGHTS,
};
