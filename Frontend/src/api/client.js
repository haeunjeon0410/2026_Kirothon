import axios from 'axios'

// 백엔드는 라우트 prefix 없이 PORT 3000 에서 동작 (Backend/.env, Backend/src/app.js 참고)
// 운영/배포 시 VITE_API_URL 로 오버라이드.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  // ⚠️ 기본 Content-Type 은 굳이 박지 않는다.
  //   - axios v1+ 는 JSON / FormData / URLSearchParams 를 자동으로 알맞게 직렬화해 헤더를 붙여준다.
  //   - 여기서 'application/json' 을 default 로 두면 multipart 요청 시 boundary 가 누락돼
  //     서버 multer 가 파일을 인식하지 못하는 버그가 생긴다.
})

// 요청 인터셉터: 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: { success, data } 래핑 풀어서 data 만 반환
api.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data
    }
    return body
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export default api
