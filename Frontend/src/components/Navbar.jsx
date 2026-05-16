import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import MyPageModal from './MyPageModal'

function Navbar() {
  const [mypageOpen, setMypageOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
        <NavLink className="flex items-center gap-2 text-lg font-extrabold text-green-700 mr-9" to="/home">
          <span className="text-2xl">🌿</span>쑥맵
        </NavLink>
        <div className="flex gap-1 flex-1">
          <NavLink to="/home" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'}`}>홈</NavLink>
          <NavLink to="/timetable" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'}`}>시간표</NavLink>
          <NavLink to="/curriculum" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'}`}>커리큘럼 기반 학업 현황</NavLink>
          <NavLink to="/roadmap" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-500 hover:bg-green-50 hover:text-green-700'}`}>로드맵</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMypageOpen(true)} className="text-xs text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 hover:text-gray-600 transition">마이페이지</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-400 text-white text-sm font-bold flex items-center justify-center cursor-pointer" onClick={() => setMypageOpen(true)}>전</div>
        </div>
      </nav>

      <MyPageModal isOpen={mypageOpen} onClose={() => setMypageOpen(false)} />
    </>
  )
}

export default Navbar
