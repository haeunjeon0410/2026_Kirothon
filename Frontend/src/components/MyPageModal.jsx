import { useState } from 'react'
import MAJORS from '../data/majors'

function MyPageModal({ isOpen, onClose }) {
  const [majorSearch, setMajorSearch] = useState('')
  const [majorPickerOpen, setMajorPickerOpen] = useState(false)
  const [selectedMajor, setSelectedMajor] = useState(MAJORS.find(m => m.value === '20100255')) // 컴퓨터과학전공
  const [year, setYear] = useState('2')
  const [semester, setSemester] = useState('1')
  const [majorTypes, setMajorTypes] = useState([])
  const [career, setCareer] = useState('')

  const filteredMajors = MAJORS.filter(m => m.text.toLowerCase().includes(majorSearch.toLowerCase()))

  const toggleMajorType = (type) => {
    setMajorTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[480px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-400 text-white font-bold flex items-center justify-center">전</div>
            <div>
              <div className="text-base font-bold text-gray-800">전민서</div>
              <div className="text-xs text-gray-400">jeonminseo@sookmyung.ac.kr</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition text-sm">✕</button>
        </div>

        {/* 폼 */}
        <div className="p-5 space-y-5">

          {/* 본전공 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">본전공</label>
            <button
              type="button"
              onClick={() => setMajorPickerOpen(true)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-left hover:border-green-500 transition flex items-center justify-between"
            >
              <span className="text-gray-800 font-medium">{selectedMajor?.text || '전공을 선택하세요'}</span>
              <span className="text-gray-300 text-xs">▼</span>
            </button>
          </div>

          {/* 재학 학기 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">현재 재학 학기</label>
            <div className="flex gap-3">
              <select value={year} onChange={e => setYear(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:border-green-500 transition">
                <option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option><option value="4">4학년</option>
              </select>
              <select value={semester} onChange={e => setSemester(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:border-green-500 transition">
                <option value="1">1학기</option><option value="2">2학기</option>
              </select>
            </div>
          </div>

          {/* 추가 전공 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">추가 전공 유형</label>
            <div className="flex flex-wrap gap-2">
              {['복수전공', '연계전공', '자율설계전공', '부전공', '심화전공', '해당없음'].map(type => (
                <label key={type} className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${majorTypes.includes(type) ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-green-300'}`}>
                  <input type="checkbox" className="hidden" checked={majorTypes.includes(type)} onChange={() => toggleMajorType(type)} />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* 관심 진로 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">관심 진로</label>
            <textarea
              value={career}
              onChange={e => setCareer(e.target.value)}
              placeholder="예) 데이터 분석가, 백엔드 개발자..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:border-green-500 transition resize-none h-20"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition">취소</button>
          <button onClick={onClose} className="flex-[2] py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition">저장하고 재분석</button>
        </div>
      </div>

      {/* 전공 선택 모달 (중첩) */}
      {majorPickerOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center" onClick={() => setMajorPickerOpen(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">본전공 변경</h3>
                <button onClick={() => setMajorPickerOpen(false)} className="w-6 h-6 rounded bg-gray-100 text-gray-400 flex items-center justify-center text-xs">✕</button>
              </div>
              <input
                type="text"
                placeholder="전공명 검색"
                value={majorSearch}
                onChange={e => setMajorSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-500 transition"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredMajors.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">검색 결과 없음</div>
              ) : (
                filteredMajors.map(m => (
                  <div
                    key={m.value}
                    className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer transition ${selectedMajor?.value === m.value ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => { setSelectedMajor(m); setMajorPickerOpen(false); setMajorSearch('') }}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyPageModal
