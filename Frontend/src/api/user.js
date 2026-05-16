import api from './client'

/** 사용자 초기 설정 */
export const initUser = (data) => api.post('/user/init', data)

/** 사용자 정보 조회 */
export const getUser = () => api.get('/user')

/** 사용자 정보 수정 */
export const updateUser = (data) => api.patch('/user', data)

/** 사용자 학업 프로필 조회 */
export const getAcademicProfile = () => api.get('/user/academic-profile')

/** 사용자 학업 프로필 수정 */
export const updateAcademicProfile = (data) => api.patch('/user/academic-profile', data)
