import api from './client'

/** 학점이수표 업로드 및 분석 (multipart/form-data) */
export const uploadTranscript = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/academic/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 이수 현황 분석 */
export const analyzeCredits = () => api.post('/academic/analyze')

/** 졸업 요건 조회 */
export const getGraduationRequirements = () => api.get('/academic/graduation-requirements')

/** 졸업 가능 여부 분석 */
export const getGraduationStatus = () => api.get('/academic/graduation-status')

/** 추가학기 여부 판단 */
export const getExtraSemesterRisk = () => api.get('/academic/extra-semester')

/** 졸업 트랙 조회 */
export const getGraduationTrack = () => api.get('/academic/graduation-track')
