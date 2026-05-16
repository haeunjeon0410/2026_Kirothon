import api from './client'

/**
 * 사용자 학업 프로필 API
 *
 * 백엔드는 /profile/:userId 엔드포인트로 upsert 방식 동작.
 * userId 는 UserContext 의 user.id (이메일 사용) 를 그대로 넘긴다.
 *
 * 백엔드 schema 매핑 (Backend/src/services/profile.service.js):
 *   mainMajor, doubleMajor, minor, linkedMajor, advancedMajor,
 *   track, currentSemester, currentYear,
 *   careerGoals: string[], completedCourseNames: string[],
 *   timetablePreferences: object | null
 */

/** 사용자 학업 프로필 생성/수정 (upsert) */
export const saveProfile = (userId, data) =>
  api.put(`/profile/${encodeURIComponent(userId)}`, data)

/** 사용자 학업 프로필 조회 */
export const getProfile = (userId) =>
  api.get(`/profile/${encodeURIComponent(userId)}`)

// ─── 하위 호환 alias (기존 호출부가 점진적으로 옮겨갈 수 있도록) ───
export const initUser = saveProfile
export const getUser = getProfile
export const updateUser = saveProfile
export const getAcademicProfile = getProfile
export const updateAcademicProfile = saveProfile
