import api from './client'

/**
 * 학업/졸업 분석 API
 *
 * - 학점이수표 업로드: POST /upload/transcript (multipart/form-data)
 *   * file 외에 department 가 필수. year/track/careerGoals/preferences 도 함께 전송 가능.
 * - 이수 현황 분석: POST /academic/analyze
 *   body: { department, completedCourseNames }
 * - 졸업 가능 여부: GET /academic/graduation-status/:userId?...
 * - 학과 트랙 목록: GET /academic/tracks/:department
 */

/**
 * 학점이수표 업로드 및 자동 분석 파이프라인 실행
 * @param {File} file PDF 파일
 * @param {object} options
 * @param {string} options.department 학과명 (필수, ex: '경영학부')
 * @param {number} [options.year=1]
 * @param {string} [options.track='singleMajor']
 * @param {string[]} [options.careerGoals=[]]
 * @param {object} [options.preferences]
 * @param {boolean} [options.runPipeline=true]
 *
 * NOTE: Content-Type 헤더를 명시하지 않는다.
 *   axios 가 FormData 를 감지하면 자동으로 boundary 가 포함된
 *   'multipart/form-data; boundary=...' 헤더를 붙여준다.
 *   우리가 직접 헤더를 박으면 boundary 가 누락돼 서버 multer 가 파일을 인식하지 못한다.
 */
export const uploadTranscript = (file, options = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('department', options.department || '')
  if (options.year !== undefined) formData.append('year', String(options.year))
  if (options.track) formData.append('track', options.track)
  if (options.careerGoals) formData.append('careerGoals', JSON.stringify(options.careerGoals))
  if (options.preferences) formData.append('preferences', JSON.stringify(options.preferences))
  if (options.runPipeline !== undefined) {
    formData.append('runPipeline', options.runPipeline ? 'true' : 'false')
  }
  return api.post('/upload/transcript', formData)
}

/** 학점이수표 파싱만 (파이프라인 미실행) */
export const parseTranscriptOnly = (file, options = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('department', options.department || '')
  return api.post('/upload/transcript/parse-only', formData)
}

/** 이수 현황 분석 */
export const analyzeCredits = (data) => api.post('/academic/analyze', data)

/**
 * 졸업 가능 여부 분석 (졸업요건/부족학점/추가학기 위험 등을 한번에 반환)
 * @param {string} userId
 * @param {object} [params] department, completedCourseNames(comma-sep), track, year, secondDepartment, minorDepartment
 */
export const getGraduationStatus = (userId, params) =>
  api.get(`/academic/graduation-status/${encodeURIComponent(userId)}`, { params })

/** 학과별 졸업 트랙 목록 */
export const getGraduationTracks = (department) =>
  api.get(`/academic/tracks/${encodeURIComponent(department)}`)

// ─── 하위 호환 alias ───
export const getGraduationTrack = getGraduationTracks
