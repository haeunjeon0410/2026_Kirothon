import api from './client'

/**
 * 시간표 API
 *
 * 백엔드 라우트:
 *   POST /timetable/generate            → 충돌 없는 시간표 생성
 *   POST /profile/:userId/timetable     → 시간표 저장
 *   GET  /profile/:userId/timetable     → 최근 시간표 조회
 *   GET  /profile/:userId/timetables    → 시간표 히스토리
 */

/**
 * AI 시간표 생성
 * @param {object} data { department, courses, preferences, year?, maxCredits? }
 */
export const generateTimetable = (data) => api.post('/timetable/generate', data)

/** 시간표 저장 */
export const saveTimetable = (userId, data) =>
  api.post(`/profile/${encodeURIComponent(userId)}/timetable`, data)

/** 최근 저장된 시간표 조회 */
export const getLatestTimetable = (userId) =>
  api.get(`/profile/${encodeURIComponent(userId)}/timetable`)

/** 시간표 히스토리 조회 */
export const getTimetableHistory = (userId) =>
  api.get(`/profile/${encodeURIComponent(userId)}/timetables`)

// ─── 하위 호환 alias ───
export const getTimetable = getLatestTimetable
