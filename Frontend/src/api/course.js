import api from './client'

/**
 * 강의/학과 데이터 API
 *
 * 백엔드 라우트 (Backend/src/routes/course.routes.js):
 *   GET /courses/departments       → 사용 가능한 학과 목록
 *   GET /courses/major/:major      → 특정 학과의 전체 과목
 *
 * NOTE: 전체 강의 검색 / 강의 상세 엔드포인트는 백엔드에 미구현.
 */

/** 사용 가능한 학과 목록 */
export const getDepartments = () => api.get('/courses/departments')

/** 학과별 전체 과목 조회 */
export const getCoursesByMajor = (major) =>
  api.get(`/courses/major/${encodeURIComponent(major)}`)

// ─── 하위 호환 alias ───
export const getCoursesByDepartment = getCoursesByMajor
