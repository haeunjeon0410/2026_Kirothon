import api from './client'

/** AI 로드맵 생성 */
export const generateRoadmap = (data) => api.post('/ai/roadmap/generate', data)

/** 선수과목 체인 분석 */
export const getPrerequisiteChain = (courseId) => api.get(`/ai/prerequisites/${courseId}`)

/** 진로 기반 과목 추천 */
export const getCareerRecommendations = (data) => api.post('/ai/career-recommend', data)

/** 로드맵 저장 */
export const saveRoadmap = (data) => api.post('/ai/roadmap/save', data)

/** 로드맵 삭제 */
export const deleteRoadmap = (roadmapId) => api.delete(`/ai/roadmap/${roadmapId}`)

/** Agent 전체 실행 */
export const runAgent = (data) => api.post('/agent/run', data)

/** Agent 세션 조회 */
export const getAgentSession = (sessionId) => api.get(`/agent/session/${sessionId}`)
