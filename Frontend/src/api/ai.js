import api from './client'

/**
 * AI / Agent API
 *
 * 백엔드 라우트 (Backend/src/routes):
 *   POST /ai/roadmap                → 로드맵 생성
 *   POST /agent/plan                → 전체 파이프라인 실행
 *   GET  /agent/session/:sessionId  → 세션 조회
 *   GET  /agent/demo                → 데모 시나리오
 *
 * 로드맵 저장/조회/삭제는 사용자 프로필에 귀속되어 /profile/:userId/roadmap 으로 처리.
 */

/** AI 로드맵 생성 */
export const generateRoadmap = (data) => api.post('/ai/roadmap', data)

/** Agent 전체 파이프라인 실행 */
export const runAgent = (data) => api.post('/agent/plan', data)

/** Agent 세션 조회 */
export const getAgentSession = (sessionId) =>
  api.get(`/agent/session/${encodeURIComponent(sessionId)}`)

/** Agent 데모 시나리오 */
export const runAgentDemo = () => api.get('/agent/demo')

// ─── 로드맵 저장 (profile 하위) ───

/** 로드맵 저장 */
export const saveRoadmap = (userId, data) =>
  api.post(`/profile/${encodeURIComponent(userId)}/roadmap`, data)

/** 최근 저장된 로드맵 조회 */
export const getLatestRoadmap = (userId) =>
  api.get(`/profile/${encodeURIComponent(userId)}/roadmap`)

/** 로드맵 히스토리 조회 (최근 10개) */
export const getRoadmapHistory = (userId) =>
  api.get(`/profile/${encodeURIComponent(userId)}/roadmaps`)

// ─── deprecated: 백엔드에 해당 엔드포인트 없음 ───
// getPrerequisiteChain, getCareerRecommendations, deleteRoadmap 은 백엔드 미구현이라 제거.
