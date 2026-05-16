import api from './client'

/** 전체 강의 조회 */
export const getAllCourses = (params) => api.get('/courses', { params })

/** 강의 상세 조회 */
export const getCourseDetail = (courseId) => api.get(`/courses/${courseId}`)

/** 학과별 과목 JSON 조회 */
export const getCoursesByDepartment = (deptCode) => api.get(`/courses/department/${deptCode}`)
