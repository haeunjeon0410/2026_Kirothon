import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MAJORS from '../data/majors'
import { useUser } from '../context/UserContext'
import { uploadTranscript, saveProfile } from '../api'

/**
 * 회원가입 4단계 플로우
 *   1) 이메일 입력 (필수)
 *   2) 학과 / 학년 / 진로 입력 (학과·학년 필수, 진로 선택)
 *   3) 졸업이수표 PDF 업로드 (성공해야 다음, 스킵 가능)
 *   4) 완료 → /home
 *
 * 업로드는 로그인 이전에 수행되며, step 4 에서 login() 호출 시
 * 인식된 completedCourseNames 까지 함께 컨텍스트에 적재한다.
 */

const TRACK_BY_TYPE = {
  복수전공: 'doubleMajor',
  연계전공: 'linkedMajor',
  자율설계전공: 'doubleMajor',
  부전공: 'minor',
  심화전공: 'advancedMajor',
  해당없음: 'singleMajor',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const [step, setStep] = useState(1)

  // step 1
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  // step 2
  const [majorTypes, setMajorTypes] = useState([])
  const [majorSearch, setMajorSearch] = useState('')
  const [selectedMajor, setSelectedMajor] = useState(null)
  const [majorOpen, setMajorOpen] = useState(false)
  const [year, setYear] = useState('2학년')
  const [semester, setSemester] = useState('1학기')
  const [doubleMajor, setDoubleMajor] = useState('')
  const [linkedMajor, setLinkedMajor] = useState('')
  const [career, setCareer] = useState('')

  // step 3
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [skippedUpload, setSkippedUpload] = useState(false)
  const fileInputRef = useRef(null)

  // step 4
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState('')

  const navigate = useNavigate()
  const { login } = useUser()

  const filteredMajors = MAJORS.filter((m) =>
    m.text.toLowerCase().includes(majorSearch.toLowerCase())
  )

  const toggleMajorType = (type) =>
    setMajorTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )

  // ─── 단계별 진행 가능 여부 ───
  const emailValid = EMAIL_RE.test(email.trim())
  const step1Ready = emailValid
  const step2Ready = !!selectedMajor && !!year
  const step3Ready = uploadResult || skippedUpload

  const buildTrack = () => {
    for (const t of majorTypes) {
      if (TRACK_BY_TYPE[t] && TRACK_BY_TYPE[t] !== 'singleMajor') return TRACK_BY_TYPE[t]
    }
    return 'singleMajor'
  }

  const buildCareerGoals = () =>
    career
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)

  // ─── 이수표 업로드 ───
  const handlePickFile = () => {
    setUploadError('')
    setUploadSuccess('')
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      setUploadError('PDF 파일만 업로드할 수 있어요.')
      return
    }
    if (!selectedMajor?.text) {
      setUploadError('이전 단계에서 본전공을 먼저 선택해주세요.')
      return
    }

    try {
      setUploading(true)
      setUploadError('')
      setUploadSuccess('')
      const yearNum = parseInt(year, 10) || 1
      const result = await uploadTranscript(file, {
        department: selectedMajor.text,
        year: yearNum,
        track: buildTrack(),
        careerGoals: buildCareerGoals(),
        runPipeline: true,
      })
      const matched = result?.parsing?.totalMatched || 0
      const extracted = result?.parsing?.totalExtracted || 0
      if (matched === 0) {
        setUploadError(
          extracted === 0
            ? 'PDF에서 과목을 추출하지 못했어요. 다른 파일로 시도하거나 ‘건너뛰기’ 를 누르세요.'
            : `과목을 ${extracted}개 추출했지만 ‘${selectedMajor.text}’ 데이터셋과 일치하는 항목이 없어요. 본전공을 다시 확인해주세요.`
        )
        setUploadResult(null)
      } else {
        setUploadResult(result)
        setUploadSuccess(`${matched}개 과목을 인식했어요!`)
      }
    } catch (err) {
      setUploadError(
        err?.error?.message ||
          err?.message ||
          (typeof err === 'string' ? err : '학점이수표 분석에 실패했어요.')
      )
      setUploadResult(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSkipUpload = () => {
    setSkippedUpload(true)
    setUploadResult(null)
    setUploadError('')
    setUploadSuccess('')
  }

  // ─── 회원가입 마무리 ───
  const finalizeSignup = async () => {
    if (!emailValid) {
      setStep(1)
      return
    }
    if (!selectedMajor) {
      setStep(2)
      return
    }

    const yearNum = parseInt(year, 10) || 1
    const semesterNum = parseInt(semester, 10) || 1
    const careerGoals = buildCareerGoals()
    const track = buildTrack()
    const completedCourseNames = uploadResult?.completedCourseNames || []

    setFinishing(true)
    setFinishError('')
    try {
      // 백엔드 프로필 upsert. 실패해도 로컬 진입은 막지 않음.
      try {
        await saveProfile(email.trim(), {
          mainMajor: selectedMajor.text,
          doubleMajor: doubleMajor || null,
          linkedMajor: linkedMajor || null,
          track,
          currentYear: yearNum,
          currentSemester: semesterNum,
          careerGoals,
          completedCourseNames,
        })
      } catch (profileErr) {
        console.warn('[signup] saveProfile failed', profileErr)
      }

      login({
        id: email.trim(),
        name: name.trim() || email.trim().split('@')[0],
        email: email.trim(),
        major: selectedMajor.text,
        majorCode: selectedMajor.value,
        year: yearNum,
        semester: semesterNum,
        majorTypes,
        doubleMajor,
        linkedMajor,
        career,
        careerGoals,
        track,
        completedCourseNames,
        createdAt: new Date().toISOString(),
      })
      navigate('/home')
    } catch (err) {
      setFinishError(
        err?.error?.message ||
          err?.message ||
          '계정 정보를 저장하는 중 문제가 발생했어요.'
      )
    } finally {
      setFinishing(false)
    }
  }

  // 다음 버튼 공통 동작
  const goNext = () => {
    if (step === 1 && step1Ready) setStep(2)
    else if (step === 2 && step2Ready) setStep(3)
    else if (step === 3 && step3Ready) setStep(4)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-blue-50 flex items-center justify-center">
      <div className="flex w-[900px] min-h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* 브랜드 패널 */}
        <div className="w-[340px] bg-gradient-to-br from-green-700 to-green-400 flex flex-col items-center justify-center p-12 text-white">
          <div className="text-5xl mb-3">🌿</div>
          <div className="text-3xl font-extrabold tracking-tight mb-2">쑥맵</div>
          <div className="text-sm opacity-85 text-center leading-relaxed">
            복잡한 졸업요건,
            <br />
            AI가 쉽게 정리해드릴게요
          </div>
          <div className="mt-9 w-full space-y-2.5">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">
              🎓 복전·연계전공 졸업요건 한눈에
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">
              🤖 진로 맞춤 AI 커리큘럼 추천
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/15 rounded-xl text-sm">
              📅 AI 시간표 자동 설계
            </div>
          </div>
        </div>

        {/* 폼 패널 */}
        <div className="flex-1 p-11 overflow-y-auto">
          <h2 className="text-xl font-bold text-green-900 mb-1">시작하기</h2>
          <p className="text-sm text-gray-400 mb-6">
            정보를 입력하면 맞춤 로드맵을 설계해드려요
          </p>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center mb-6">
            {[
              { i: 1, label: '계정' },
              { i: 2, label: '전공/진로' },
              { i: 3, label: '이수표' },
              { i: 4, label: '완료' },
            ].map(({ i, label }, idx, arr) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                      step > i
                        ? 'bg-green-300 text-white'
                        : step === i
                          ? 'bg-green-700 text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {i}
                  </div>
                  <span
                    className={`text-[10px] ${
                      step === i ? 'text-green-700 font-semibold' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`w-9 h-0.5 mx-1.5 mb-4 ${
                      step > i ? 'bg-green-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ═══ STEP 1: 이메일 ═══ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    숙명여대 이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@sookmyung.ac.kr"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500 focus:shadow-sm transition"
                  />
                  {!email ? (
                    <p className="text-[11px] text-gray-300 mt-1.5">
                      이메일이 사용자 식별자로 사용돼요.
                    </p>
                  ) : !emailValid ? (
                    <p className="text-[11px] text-red-500 mt-1.5">
                      올바른 이메일 형식이 아니에요.
                    </p>
                  ) : (
                    <p className="text-[11px] text-green-600 mt-1.5">사용 가능한 이메일이에요.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    이름 <span className="text-gray-300 text-xs">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 비워두면 이메일 앞부분으로 표시돼요"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500 focus:shadow-sm transition"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={goNext}
                  disabled={!step1Ready}
                  className="w-full py-3.5 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: 전공/학년/진로 ═══ */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    본전공 <span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    현재 재학 학기 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500"
                    >
                      <option>1학년</option>
                      <option>2학년</option>
                      <option>3학년</option>
                      <option>4학년</option>
                    </select>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-green-500"
                    >
                      <option>1학기</option>
                      <option>2학기</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  추가 전공 유형{' '}
                  <span className="text-xs text-gray-300 font-normal">(복수 선택 가능)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['복수전공', '연계전공', '자율설계전공', '부전공', '심화전공', '해당없음'].map(
                    (type) => (
                      <label
                        key={type}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
                          majorTypes.includes(type)
                            ? 'bg-green-700 border-green-700 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={majorTypes.includes(type)}
                          onChange={() => toggleMajorType(type)}
                        />
                        {type}
                      </label>
                    )
                  )}
                </div>
              </div>

              {majorTypes.includes('복수전공') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 font-medium">복수전공</span>
                  <select
                    value={doubleMajor}
                    onChange={(e) => setDoubleMajor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-600"
                  >
                    <option value="">전공 선택</option>
                    <option>경영학부</option>
                    <option>경제학부</option>
                    <option>소비자경제학과</option>
                  </select>
                </div>
              )}
              {majorTypes.includes('연계전공') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 font-medium">연계전공</span>
                  <select
                    value={linkedMajor}
                    onChange={(e) => setLinkedMajor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-600"
                  >
                    <option value="">전공 선택</option>
                    <option>빅데이터사이언스</option>
                    <option>인공지능</option>
                    <option>핀테크</option>
                  </select>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  🎯 관심 진로나 희망 직무를 자유롭게 입력해주세요. (선택)
                  <br />
                  AI가 맞춤 커리큘럼을 추천해드려요.
                </p>
                <textarea
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                  placeholder="예) 데이터 분석가, 백엔드 개발자, 마케터..."
                  className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white resize-none h-[70px] outline-none focus:border-green-600"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  ← 이전
                </button>
                <button
                  onClick={goNext}
                  disabled={!step2Ready}
                  className="flex-[2] py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  다음 →
                </button>
              </div>
              {!step2Ready && (
                <p className="text-[11px] text-gray-300">
                  본전공과 학년을 선택해야 다음으로 갈 수 있어요.
                </p>
              )}
            </div>
          )}

          {/* ═══ STEP 3: 이수표 업로드 ═══ */}
          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="text-sm font-semibold text-gray-700 mb-1.5">
                  📄 졸업이수표 업로드
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  학점이수표 PDF를 올리면 AI가 즉시 분석해 졸업 가능 여부, 부족 학점, 추천 시간표를 만들어드려요.
                </p>

                <button
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="w-full py-8 border-2 border-dashed border-green-300 rounded-xl bg-white hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-3xl">{uploading ? '⏳' : '📤'}</span>
                  <span className="text-sm font-bold text-green-700">
                    {uploading
                      ? '분석 중... 잠시만 기다려주세요'
                      : uploadResult
                        ? '다른 파일 다시 올리기'
                        : 'PDF 파일 선택하기'}
                  </span>
                  <span className="text-[11px] text-gray-400">최대 10MB / PDF만 가능</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadError && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600">
                    {uploadError}
                  </div>
                )}
                {uploadSuccess && uploadResult && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-xs bg-green-50 border border-green-200 text-green-700">
                    ✅ {uploadSuccess}
                    <div className="text-[11px] text-green-600 mt-1">
                      추출 {uploadResult.parsing?.totalExtracted || 0}개 · 매칭{' '}
                      {uploadResult.parsing?.totalMatched || 0}개
                    </div>
                  </div>
                )}
                {skippedUpload && !uploadResult && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-xs bg-gray-50 border border-gray-200 text-gray-500">
                    이수표 업로드를 건너뛰었어요. 홈 화면에서 언제든 다시 올릴 수 있어요.
                  </div>
                )}
              </div>

              <button
                onClick={handleSkipUpload}
                disabled={uploading}
                className="w-full py-2.5 bg-gray-100 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                지금은 건너뛰고 나중에 업로드할게요
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  ← 이전
                </button>
                <button
                  onClick={goNext}
                  disabled={!step3Ready}
                  className="flex-[2] py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: 완료 ═══ */}
          {step === 4 && (
            <div className="animate-fade-in text-center py-8">
              <div className="text-6xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">설정 완료!</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-7">
                {uploadResult
                  ? `${uploadResult.parsing?.totalMatched || 0}개 과목을 분석했어요. 맞춤 로드맵을 준비했습니다.`
                  : '입력하신 정보를 바탕으로 맞춤 로드맵을 준비했어요.'}
              </p>
              {finishError && (
                <div className="mb-4 px-3 py-2 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600">
                  {finishError}
                </div>
              )}
              <button
                onClick={finalizeSignup}
                disabled={finishing}
                className="px-11 py-3.5 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-2xl text-base font-bold shadow-lg shadow-green-700/30 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {finishing ? '저장 중...' : '홈으로 이동 →'}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={finishing}
                className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                ← 이수표 단계로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 본전공 선택 모달 */}
      {majorOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setMajorOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-[420px] max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">본전공 선택</h3>
                <button
                  onClick={() => setMajorOpen(false)}
                  className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition text-sm"
                >
                  ✕
                </button>
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
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  검색 결과가 없습니다
                </div>
              ) : (
                filteredMajors.map((m) => (
                  <div
                    key={m.value}
                    className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer transition ${
                      selectedMajor?.value === m.value
                        ? 'bg-green-50 text-green-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedMajor(m)
                      setMajorOpen(false)
                      setMajorSearch('')
                    }}
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
