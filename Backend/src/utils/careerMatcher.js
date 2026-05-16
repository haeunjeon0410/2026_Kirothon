/**
 * Career Tag Matcher
 *
 * Matches courses to career goals using a weighted keyword dictionary.
 * Scoring is designed so career-aligned courses clearly outrank unrelated ones.
 *
 * Scoring model:
 *   - Each keyword has a weight (1-3) based on specificity
 *   - Multiple keyword matches stack
 *   - Bonus for matching multiple career goals simultaneously
 *   - No graduation-category boost here (that's handled in the priority formula)
 */

/**
 * Career tag dictionary with weighted keywords.
 * Weight 3 = highly specific (strong signal)
 * Weight 2 = moderately specific
 * Weight 1 = loosely related
 */
const CAREER_TAGS = {
  data_analytics: [
    { kw: '데이터분석', w: 3 },
    { kw: '머신러닝', w: 3 },
    { kw: '비즈니스애널리틱스', w: 3 },
    { kw: '빅데이터', w: 3 },
    { kw: '데이터', w: 2 },
    { kw: '분석', w: 2 },
    { kw: '통계', w: 2 },
    { kw: '경영과학', w: 2 },
    { kw: '경영정보', w: 2 },
    { kw: '네트워크분석', w: 2 },
    { kw: '핀테크', w: 2 },
    { kw: '정보시스템', w: 1 },
    { kw: '정보처리', w: 1 },
    { kw: '계량', w: 1 },
    { kw: '워크숍', w: 1 },
    { kw: '캡스톤', w: 1 },
  ],
  finance: [
    { kw: '재무관리', w: 3 },
    { kw: '재무회계', w: 3 },
    { kw: '자본시장', w: 3 },
    { kw: '투자', w: 3 },
    { kw: '금융', w: 3 },
    { kw: '핀테크', w: 2 },
    { kw: '재무', w: 2 },
    { kw: '회계', w: 2 },
    { kw: '관리회계', w: 2 },
    { kw: '세법', w: 1 },
    { kw: '세무', w: 1 },
    { kw: '자본', w: 1 },
  ],
  consulting: [
    { kw: '경영전략', w: 3 },
    { kw: '컨설팅', w: 3 },
    { kw: '전략', w: 2 },
    { kw: '의사결정', w: 2 },
    { kw: '문제해결', w: 2 },
    { kw: '경영과학', w: 1 },
    { kw: '조직', w: 1 },
  ],
  marketing: [
    { kw: '마케팅', w: 3 },
    { kw: '브랜드', w: 3 },
    { kw: '소비자', w: 3 },
    { kw: '광고', w: 2 },
    { kw: '시장', w: 2 },
    { kw: '컨벤션', w: 1 },
    { kw: '커뮤니케이션', w: 1 },
  ],
  hr: [
    { kw: '인적자원', w: 3 },
    { kw: '인사', w: 3 },
    { kw: '조직행동', w: 3 },
    { kw: '리더십', w: 2 },
    { kw: '조직', w: 2 },
    { kw: '노동', w: 1 },
  ],
  operations: [
    { kw: '생산', w: 3 },
    { kw: '운영관리', w: 3 },
    { kw: '공급망', w: 3 },
    { kw: 'SCM', w: 3 },
    { kw: '품질', w: 2 },
    { kw: '서비스운영', w: 2 },
    { kw: '운영', w: 1 },
  ],
  entrepreneur: [
    { kw: '창업', w: 3 },
    { kw: '벤처', w: 3 },
    { kw: '스타트업', w: 3 },
    { kw: '기업가', w: 3 },
    { kw: '소셜비즈니스', w: 2 },
    { kw: '사회적기업', w: 2 },
    { kw: '비즈니스모델', w: 1 },
  ],
  international: [
    { kw: '국제경영', w: 3 },
    { kw: '글로벌', w: 2 },
    { kw: '국제', w: 2 },
    { kw: '무역', w: 2 },
    { kw: '해외', w: 2 },
    { kw: '지역비즈니스', w: 1 },
  ],
  it_business: [
    { kw: '경영정보시스템', w: 3 },
    { kw: '정보시스템', w: 3 },
    { kw: '디지털', w: 2 },
    { kw: '경영정보', w: 2 },
    { kw: 'IT', w: 2 },
    { kw: '데이터', w: 1 },
    { kw: '정보처리', w: 1 },
  ],
  accounting: [
    { kw: '재무회계', w: 3 },
    { kw: '관리회계', w: 3 },
    { kw: '세무', w: 3 },
    { kw: '감사', w: 3 },
    { kw: '회계', w: 2 },
    { kw: '세법', w: 2 },
    { kw: '고급회계', w: 2 },
    { kw: '국제조세', w: 1 },
  ],
};

/**
 * Compute relevance score of a course given a list of career tags.
 *
 * Scoring:
 *   - Sum of matched keyword weights across all selected careers
 *   - Bonus: +3 if course matches 2+ career goals simultaneously
 *   - No category boost (handled separately in priority formula)
 *
 * Returns: { score: number, matchedCareers: string[] }
 */
function scoreCourse(course, careerGoals = []) {
  if (!course || !course.name || careerGoals.length === 0) {
    return { score: 0, matchedCareers: [] };
  }

  const name = course.name;
  let totalScore = 0;
  const matchedCareers = new Set();

  for (const career of careerGoals) {
    const tags = CAREER_TAGS[career];
    if (!tags) continue;

    let careerScore = 0;
    for (const { kw, w } of tags) {
      if (name.includes(kw)) {
        careerScore += w;
      }
    }

    if (careerScore > 0) {
      matchedCareers.add(career);
      totalScore += careerScore;
    }
  }

  // Multi-career synergy bonus
  if (matchedCareers.size >= 2) {
    totalScore += 3;
  }

  return { score: totalScore, matchedCareers: Array.from(matchedCareers) };
}

/**
 * Rank a list of courses by relevance to the given career goals.
 * Returns courses with attached relevanceScore and matchedCareers.
 */
function rankCoursesByCareer(courses, careerGoals = []) {
  return courses
    .map((c) => {
      const { score, matchedCareers } = scoreCourse(c, careerGoals);
      return { ...c, relevanceScore: score, matchedCareers };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * List supported career tags.
 */
function listCareerTags() {
  return Object.keys(CAREER_TAGS);
}

module.exports = {
  CAREER_TAGS,
  scoreCourse,
  rankCoursesByCareer,
  listCareerTags,
};
