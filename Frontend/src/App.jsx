import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Roadmap from './pages/Roadmap'
import Timetable from './pages/Timetable'
import Curriculum from './pages/Curriculum'
import Preview from './pages/Preview'
import { useUser } from './context/UserContext'

/**
 * 인증되지 않은 사용자(= UserContext 에 user.id 가 없는 상태)는
 * 보호된 라우트 진입을 막고 로그인 화면(/)으로 리다이렉트한다.
 */
function RequireAuth({ children }) {
  const { user } = useUser()
  const location = useLocation()
  const userId = user?.id || user?.email

  if (!userId) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* 시연용 미리보기 (인증 불필요) */}
      <Route path="/preview" element={<Preview />} />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/roadmap"
        element={
          <RequireAuth>
            <Roadmap />
          </RequireAuth>
        }
      />
      <Route
        path="/timetable"
        element={
          <RequireAuth>
            <Timetable />
          </RequireAuth>
        }
      />
      <Route
        path="/curriculum"
        element={
          <RequireAuth>
            <Curriculum />
          </RequireAuth>
        }
      />
      {/* 알 수 없는 경로는 로그인으로 보냄 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
