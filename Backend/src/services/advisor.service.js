const openai = require('./openai.service');

/**
 * Academic Advisor Service
 *
 * Uses OpenAI to generate natural-language explanations and advice
 * grounded in the deterministic pipeline outputs.
 *
 * Architecture:
 *   - The deterministic engine (graduation, prereqs, roadmap, timetable) is the source of truth
 *   - OpenAI receives structured pipeline outputs as context
 *   - OpenAI generates explanations, not decisions
 *   - All responses include fallback text if OpenAI is unavailable
 *
 * Capabilities:
 *   - explainRoadmap: Why courses are ordered this way
 *   - explainGraduationRisks: What the student should worry about
 *   - provideStrategyAdvice: High-level academic planning guidance
 *   - summarizeTimetableTradeoffs: What was gained/lost in schedule optimization
 *   - generateAdvisorResponse: Full conversational advisor message
 */

const SYSTEM_PROMPT = `You are SookMap, an AI academic advisor for Korean university students.
You provide warm, supportive, and actionable academic guidance in Korean.
You are given structured data from a deterministic academic planning engine.
Your role is to EXPLAIN the data, not to override it.
Never contradict the structured data. Use it as ground truth.
Be concise but thorough. Use bullet points for clarity.
Always respond in Korean unless the student writes in English.`;

// ─── Roadmap Explanation ─────────────────────────────────────────────────────

/**
 * Explain why the roadmap is structured the way it is.
 */
async function explainRoadmap(pipelineResult) {
  const context = buildRoadmapContext(pipelineResult);
  const userPrompt = `다음은 학생의 학업 로드맵 분석 결과입니다. 왜 이렇게 과목이 배치되었는지 학생에게 설명해주세요.

${context}

다음을 포함해서 설명해주세요:
1. 왜 특정 과목이 먼저 배치되었는지 (졸업필수, 선수과목 체인, 커리어 관련성)
2. 학기별 학점 배분의 이유
3. 주의해야 할 점이나 조언`;

  const response = await openai.chat({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 800,
    temperature: 0.6,
  });

  return response || generateFallbackRoadmapExplanation(pipelineResult);
}

// ─── Graduation Risk Explanation ─────────────────────────────────────────────

/**
 * Explain graduation risks in human-friendly language.
 */
async function explainGraduationRisks(pipelineResult) {
  const graduation = pipelineResult.graduation;
  const risks = pipelineResult.risks;

  if (!graduation && !risks) {
    return '졸업 요건 분석 데이터가 없습니다.';
  }

  const context = `졸업 상태:
- 졸업 가능 여부: ${graduation?.canGraduate ? '가능' : '불가능'}
- 트랙: ${graduation?.track || '단일전공'}
- 총 이수학점: ${graduation?.totalCreditsEarned || 0}/${graduation?.totalCreditsRequired || 0}
- 미충족 조건: ${JSON.stringify(graduation?.unmetConditions || [])}
- 학기 리스크: ${JSON.stringify(graduation?.semesterRisk || {})}

위험 요소:
${JSON.stringify(risks?.warnings || [])}`;

  const userPrompt = `다음은 학생의 졸업 요건 분석 결과입니다. 학생이 이해하기 쉽게 현재 상황과 위험 요소를 설명해주세요.

${context}

다음을 포함해서 설명해주세요:
1. 현재 졸업까지 남은 것들
2. 가장 시급한 문제
3. 구체적인 해결 방안`;

  const response = await openai.chat({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 600,
    temperature: 0.6,
  });

  return response || generateFallbackGraduationExplanation(pipelineResult);
}

// ─── Strategy Advice ─────────────────────────────────────────────────────────

/**
 * Provide high-level academic strategy advice based on the full pipeline result.
 */
async function provideStrategyAdvice(pipelineResult) {
  const context = `학과: ${pipelineResult.analysis?.department || ''}
학년: ${pipelineResult.analysis?.year || ''}
커리어 목표: ${JSON.stringify(pipelineResult.analysis?.careerGoals || [])}
이수 학점: ${pipelineResult.analysis?.totalCreditsEarned || 0}
졸업 가능: ${pipelineResult.graduation?.canGraduate ? '예' : '아니오'}
추천 과목 상위 5개: ${JSON.stringify((pipelineResult.recommendedCourses?.courses || []).slice(0, 5).map(c => c.courseName))}
리스크: ${JSON.stringify((pipelineResult.risks?.warnings || []).map(w => w.message))}`;

  const userPrompt = `다음은 학생의 전체 학업 분석 결과입니다. 학생에게 전략적 학업 조언을 제공해주세요.

${context}

다음을 포함해서 조언해주세요:
1. 이번 학기 가장 중요한 행동 3가지
2. 커리어 목표를 위한 과목 선택 전략
3. 졸업까지의 전체적인 전략 방향`;

  const response = await openai.chat({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 800,
    temperature: 0.7,
  });

  return response || generateFallbackStrategyAdvice(pipelineResult);
}

// ─── Timetable Tradeoff Summary ──────────────────────────────────────────────

/**
 * Summarize what was gained and lost in timetable optimization.
 */
async function summarizeTimetableTradeoffs(pipelineResult) {
  const timetable = pipelineResult.timetable;
  if (!timetable) return '시간표 데이터가 없습니다.';

  const context = `시간표 최적화 결과:
- 점수: ${timetable.timetableScore || 0}%
- 배치된 과목 수: ${timetable.totalScheduled || 0}
- 충족된 선호: ${JSON.stringify((timetable.satisfiedPreferences || []).map(p => p.reason))}
- 미충족 선호: ${JSON.stringify((timetable.violatedPreferences || []).map(p => p.reason))}
- 배치 불가 과목: ${JSON.stringify(timetable.unschedulable || [])}
- TBD 과목: ${JSON.stringify(timetable.tbd || [])}`;

  const userPrompt = `다음은 학생의 시간표 최적화 결과입니다. 시간표의 장단점을 학생에게 설명해주세요.

${context}

다음을 포함해서 설명해주세요:
1. 이 시간표의 장점
2. 타협한 부분과 그 이유
3. 시간표를 더 개선하기 위한 제안`;

  const response = await openai.chat({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 600,
    temperature: 0.6,
  });

  return response || generateFallbackTimetableExplanation(pipelineResult);
}

// ─── Full Advisor Response ───────────────────────────────────────────────────

/**
 * Generate a comprehensive conversational advisor response.
 * Combines all aspects into a single cohesive message.
 */
async function generateAdvisorResponse(pipelineResult) {
  const context = buildFullContext(pipelineResult);

  const userPrompt = `다음은 학생의 전체 학업 계획 분석 결과입니다. 학업 상담사로서 종합적인 조언을 제공해주세요.

${context}

다음 구조로 응답해주세요:
1. 📊 현재 상황 요약 (2-3문장)
2. 🎯 이번 학기 핵심 조언 (3가지)
3. ⚠️ 주의사항 (있다면)
4. 💡 커리어 연계 팁 (1-2가지)
5. 🗓️ 시간표 관련 조언 (1-2가지)`;

  const response = await openai.chat({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1200,
    temperature: 0.7,
  });

  return {
    message: response || generateFallbackAdvisorResponse(pipelineResult),
    aiGenerated: response !== null,
    model: response ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'fallback',
  };
}

// ─── Context Builders ────────────────────────────────────────────────────────

function buildRoadmapContext(result) {
  const roadmap = result.roadmap;
  if (!roadmap) return '로드맵 데이터 없음';

  const semesters = (roadmap.semesters || []).map((s) =>
    `학기 ${s.semester}: ${s.totalCredits}학점 - ${(s.courses || []).map(c => `${c.courseName}(${c.category})`).join(', ')}`
  ).join('\n');

  return `학과: ${result.analysis?.department || ''}
커리어 목표: ${JSON.stringify(result.analysis?.careerGoals || [])}
졸업 가능: ${result.graduation?.canGraduate ? '예' : '아니오'}
로드맵:
${semesters}
미배치 과목: ${JSON.stringify(roadmap.unscheduledCourses || [])}`;
}

function buildFullContext(result) {
  return `학과: ${result.analysis?.department || ''}
학년: ${result.analysis?.year || 0}
이수 학점: ${result.analysis?.totalCreditsEarned || 0}
커리어 목표: ${JSON.stringify(result.analysis?.careerGoals || [])}
졸업 가능: ${result.graduation?.canGraduate ? '예' : '아니오'}
졸업 트랙: ${result.graduation?.track || ''}
남은 학점: ${result.graduation?.totalCreditsRemaining || 0}
미충족 조건: ${(result.graduation?.unmetConditions || []).map(c => c.message).join('; ')}
학기 리스크: ${result.graduation?.semesterRisk?.message || '없음'}
추천 과목 TOP 5: ${(result.recommendedCourses?.courses || []).slice(0, 5).map(c => `${c.courseName}(점수:${c.priorityScore})`).join(', ')}
시간표 점수: ${result.timetable?.timetableScore || 0}%
위험 요소: ${(result.risks?.warnings || []).map(w => `[${w.severity}] ${w.message}`).join('; ')}`;
}

// ─── Fallback Generators ─────────────────────────────────────────────────────

function generateFallbackRoadmapExplanation(result) {
  const parts = [];
  const roadmap = result.roadmap;
  if (!roadmap) return '로드맵 설명을 생성할 수 없습니다.';

  parts.push('📋 로드맵 배치 원칙:');
  parts.push('• 전공필수 과목을 우선 배치하여 졸업 요건을 조기에 충족합니다.');
  parts.push('• 선수과목 체인을 고려하여 순서대로 배치했습니다.');
  parts.push('• 커리어 목표와 관련된 과목에 높은 우선순위를 부여했습니다.');

  if (roadmap.semesters && roadmap.semesters.length > 0) {
    const first = roadmap.semesters[0];
    parts.push(`• 다음 학기(${first.semester}학기)에 ${first.totalCredits}학점, ${first.courses?.length || 0}과목을 배치했습니다.`);
  }

  return parts.join('\n');
}

function generateFallbackGraduationExplanation(result) {
  const g = result.graduation;
  if (!g) return '졸업 요건 분석을 수행할 수 없습니다.';

  const parts = [];
  parts.push(`📊 졸업 현황: ${g.totalCreditsEarned || 0}/${g.totalCreditsRequired || 0} 학점 이수`);

  if (g.unmetConditions && g.unmetConditions.length > 0) {
    parts.push('⚠️ 미충족 조건:');
    for (const c of g.unmetConditions) {
      parts.push(`  • ${c.message}`);
    }
  }

  if (g.semesterRisk) {
    parts.push(`🗓️ ${g.semesterRisk.message}`);
  }

  return parts.join('\n');
}

function generateFallbackStrategyAdvice(result) {
  const parts = ['💡 학업 전략 조언:'];
  parts.push('• 전공필수 과목을 우선적으로 이수하세요.');
  parts.push('• 선수과목 체인이 긴 과목은 빨리 시작하세요.');

  if (result.analysis?.careerGoals?.length > 0) {
    parts.push(`• 커리어 목표(${result.analysis.careerGoals.join(', ')})에 맞는 과목을 선택하세요.`);
  }

  if (result.risks?.warnings?.length > 0) {
    parts.push('• 위험 요소를 확인하고 학업 계획을 조정하세요.');
  }

  return parts.join('\n');
}

function generateFallbackTimetableExplanation(result) {
  const t = result.timetable;
  if (!t) return '시간표 분석을 수행할 수 없습니다.';

  const parts = [];
  parts.push(`📅 시간표 최적화 점수: ${t.timetableScore || 0}%`);

  if (t.satisfiedPreferences?.length > 0) {
    parts.push('✓ 충족된 선호:');
    for (const p of t.satisfiedPreferences) parts.push(`  • ${p.reason}`);
  }

  if (t.violatedPreferences?.length > 0) {
    parts.push('✗ 미충족 선호:');
    for (const p of t.violatedPreferences) parts.push(`  • ${p.reason}`);
  }

  return parts.join('\n');
}

function generateFallbackAdvisorResponse(result) {
  const parts = [];
  parts.push(generateFallbackGraduationExplanation(result));
  parts.push('');
  parts.push(generateFallbackStrategyAdvice(result));
  parts.push('');
  parts.push(generateFallbackTimetableExplanation(result));
  return parts.join('\n');
}

module.exports = {
  explainRoadmap,
  explainGraduationRisks,
  provideStrategyAdvice,
  summarizeTimetableTradeoffs,
  generateAdvisorResponse,
  isAvailable: () => openai.isAvailable(),
};
