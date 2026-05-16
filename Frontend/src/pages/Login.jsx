import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MAJORS from '../data/majors'
import { useUser } from '../context/UserContext'

function Login() {
  const [step, setStep] = useState(0) // 0: 구글 로그인, 1~4: 정보 입력
  const [majorTypes, setMajorTypes] = useState([])
  const [majorSearch, setMajorSearch] = useState('')
  const [selectedMajor, setSelectedMajor] = useState(null)
  const [majorOpen, setMajorOpen] = useState(false)
  const [year, setYear] = useState('2학년')
  const [semester, setSemester] = useState('1학기')
  const [doubleMajor, setDoubleMajor] = useState('')
  const [linkedMajor, setLinkedMajor] = useState('')
  const [career, setCareer] = useState('')
  const navigate = useNavigate()
  const { login } = useUser()

  const filteredMajors = MAJORS.filter(m => m.text.toLowerCase().includes(majorSearch.toLowerCase()))

  const toggleMajorType = (type) => {
    setMajorTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const goStep = (n) => {
    if (n === 5) {
      // 모든 정보를 Context + localStorage에 저장
      login({
        name: '전민서', // TODO: Google OAuth에서 받아올 이름
        email: 'minseoj03@sookmyung.ac.kr',
        major: selectedMajor?.text || '',
        majorCode: selectedMajor?.value || '',
        year: parseInt(year),
        semester: parseInt(semester),
        majorTypes,
        doubleMajor,
        linkedMajor,
        career,
        createdAt: new Date().toISOString(),
      })
      navigate('/home')
      return
    }
    setStep(n)
  }

  const handleGoogleLogin = () => {
    // TODO: 실제 Google OAuth 연동 시 여기에 구현
    // window.location.href = '/api/auth/google'
    setStep(1)
  }

  // Step 0: 구글 로그인 화면
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-blue-50 flex items-center justify-center">
        <div className="w-[420px] bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h1 className="text-2xl font-extrabold text-green-900 mb-1">쑥맵</h1>
          <p className="text-sm text-gray-400 mb-2">졸업까지 나만의 길을 찾아요</p>
          <p className="text-xs text-gray-300 leading-relaxed mb-8">AI가 학점이수표를 분석해<br/>최적의 수강 로드맵을 설계해드려요</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-green-400 hover:shadow-md transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            구글 계정으로 로그인하기
          </button>

          <p className="text-[11px] text-gray-300 mt-4">숙명여대 계정(@sookmyung.ac.kr)만 이용 가능합니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-blue-50 flex items-center justify-center">
      <div className="flex w-[900px] min-h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* 브랜드 패널 */}
        <div className="w-[340px] bg-gradient-to-br from-green-700 to-green-400 flex flex-col items-center justify-center p-12 text-white">
          <div className="text-5xl mb-3">🌿</div>
          <div className="text-3xl font-extrabold tracking-tight mb-2">쑥맵</div>
          <div className="text-sm opacity-85 text-center leading-relaxed">복잡한 졸업요건,<br/>AI가 쉽게 정리해드릴게요</div>
          <div className="mt-9 w-full space-y-2.5">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">🎓 복전·연계전공 졸업요건 한눈에</div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">🤖 진로 맞춤 AI 커리큘럼 추천</div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">📅 AI 시간표 자동 설계</div>
          </div>
        </div>

        {/* 폼 패널 */}
        <div className="flex-1 p-11 overflow-y-auto">
          <h2 className="text-xl font-bold text-green-900 mb-1">시작하기</h2>
          <p className="text-sm text-gray-400 mb-6">정보를 입력하면 맞춤 로드맵을 설계해드려요</p>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${step > i ? 'bg-green-300 text-white' : step === i ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-400'}`}>{i}</div>
                  <span className={`text-[10px] ${step === i ? 'text-green-700 font-semibold' : 'text-gray-300'}`}>{['기본정보', '전공선택', '진로입력'][i - 1]}</span>
                </div>
                {i < 3 && <div className={`w-10 h-0.5 mx-1.5 mb-4 ${step > i ? 'bg-green-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">본전공 <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setMajorOpen(true)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none text-left hover:border-green-500 hover:shadow-sm transition flex items-center justify-between"
                  >
                    {selectedMajor ? (
                      <span className="text-gray-800 font-medium">{selectedMajor.text}</span>
                    ) : (
                      <span className="text-gray-400">전공을 선택하세요</span>
                    )}
                    <span className="text-gray-300 text-xs">▼</span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">현재 재학 학기 <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select value={year} onChange={e => setYear(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500 focus:shadow-sm transition appearance-none cursor-pointer">
                      <option>1학년</option><option>2학년</option><option>3학년</option><option>4학년</option>
                    </select>
                    <select value={semester} onChange={e => setSemester(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500 focus:shadow-sm transition appearance-none cursor-pointer">
                      <option>1학기</option><option>2학기</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button onClick={() => goStep(2)} className="w-full py-3.5 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition">다음 →</button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">추가 전공 유형 <span className="text-xs text-gray-300 font-normal">(복수 선택 가능)</span></label>
                <div className="flex flex-wrap gap-2">
                  {['복수전공', '연계전공', '자율설계전공', '부전공', '심화전공', '해당없음'].map(type => (
                    <label key={type} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${majorTypes.includes(type) ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'}`}>
                      <input type="checkbox" className="hidden" checked={majorTypes.includes(type)} onChange={() => toggleMajorType(type)} />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              {majorTypes.includes('복수전공') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 font-medium">복수전공</span>
                  <select value={doubleMajor} onChange={e => setDoubleMajor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-600"><option value="">전공 선택</option><option>경영학부</option><option>컴퓨터과학전공</option><option>경제학부</option></select>
                </div>
              )}
              {majorTypes.includes('연계전공') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 font-medium">연계전공</span>
                  <select value={linkedMajor} onChange={e => setLinkedMajor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-600"><option value="">전공 선택</option><option>빅데이터사이언스</option><option>인공지능</option><option>핀테크</option></select>
                </div>
              )}
              <div className="flex gap-2.5 mt-5">
                <button onClick={() => goStep(1)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">← 이전</button>
                <button onClick={() => goStep(3)} className="flex-[2] py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition">다음 →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="animate-fade-in space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-600 leading-relaxed mb-2">🎯 관심 진로나 희망 직무를 자유롭게 입력해주세요.<br/>AI가 맞춤 커리큘럼을 추천해드려요.</p>
                <textarea value={career} onChange={e => setCareer(e.target.value)} placeholder="예) 데이터 분석가, 백엔드 개발자, 마케터..." className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white resize-none h-[70px] outline-none focus:border-green-600" />
              </div>
              <button onClick={() => goStep(4)} className="w-full py-2.5 bg-gray-100 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:bg-gray-200 transition">🤷 모르겠어요 / 나중에 입력할게요</button>
              <p className="text-[11px] text-gray-300">건너뛰면 필수 이수과목 기반으로 로드맵을 설계해드려요</p>
              <div className="flex gap-2.5 mt-5">
                <button onClick={() => goStep(2)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">← 이전</button>
                <button onClick={() => goStep(4)} className="flex-[2] py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition">완료 →</button>
              </div>
            </div>
          )}

          {/* STEP 4 완료 */}
          {step === 4 && (
            <div className="animate-fade-in text-center py-8">
              <div className="text-6xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">설정 완료!</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-7">입력하신 정보를 바탕으로<br/>맞춤 로드맵을 준비했어요.</p>
              <button onClick={() => goStep(5)} className="px-11 py-3.5 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-2xl text-base font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition">홈으로 이동 →</button>
            </div>
          )}
        </div>
      </div>

      {/* 본전공 선택 모달 */}
      {majorOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setMajorOpen(false)}>
          <div className="bg-white rounded-2xl w-[420px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">본전공 선택</h3>
                <button onClick={() => setMajorOpen(false)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition text-sm">✕</button>
              </div>
              <input
                type="text"
                placeholder="전공명을 검색하세요"
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-600 focus:bg-white transition"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredMajors.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">검색 결과가 없습니다</div>
              ) : (
                filteredMajors.map(m => (
                  <div
                    key={m.value}
                    className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer transition ${selectedMajor?.value === m.value ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => { setSelectedMajor(m); setMajorOpen(false); setMajorSearch('') }}
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

export default Login
