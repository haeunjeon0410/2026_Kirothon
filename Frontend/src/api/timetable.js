import api from './client'

/** AI 시간표 생성 */
export const generateTimetable = (preferences) => api.post('/timetable/generate', preferences)

/** 시간 충돌 검사 */
export const checkConflicts = (courses) => api.post('/timetable/conflicts', { courses })

/** 시간표 저장 */
export const saveTimetable = (data) => api.post('/timetable/save', data)

/** 시간표 조회 */
export const getTimetable = (semesterId) => api.get(`/timetable${semesterId ? `?semester=${semesterId}` : ''}`)

/** 시간표 삭제 */
export const deleteTimetable = (timetableId) => api.delete(`/timetable/${timetableId}`)
