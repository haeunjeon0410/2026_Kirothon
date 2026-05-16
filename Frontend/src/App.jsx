import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Roadmap from './pages/Roadmap'
import Timetable from './pages/Timetable'
import Curriculum from './pages/Curriculum'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/timetable" element={<Timetable />} />
      <Route path="/curriculum" element={<Curriculum />} />
    </Routes>
  )
}

export default App
