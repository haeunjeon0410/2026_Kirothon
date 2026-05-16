import { useState } from 'react'
import Navbar from '../components/Navbar'

/**
 * ═══════════════════════════════════════════════════════════
 * 커리큘럼 기반 학업 현황 페이지
 * ═══════════════════════════════════════════════════════════
 * 
 * [필수] 학점이수표 업로드 - 현재까지의 이수 현황 PDF 업로드
 * [필수] 이수 학점 분석 - 전필/전선/교필/교선 자동 분류
 * [핵심] 대학별 졸업 요건 적용 - 단과대별 졸업 기준 반영
 * [핵심] 전공별 졸업 요건 적용 - 본전공 및 다중전공 졸업 기준 적용
 * [필수] 졸업 요건 분석 - 부족 학점 및 미이수 필수 과목 계산
 * [필수] 졸업 가능 여부 분석 - 현재 이수 상태 기반 졸업 가능 여부 판단
 * [핵심] 추가학기 가능성 판단 - 현재 상태 및 로드맵 기준 추가학기 필요 여부 예측
 * [필수] 추가학기 팝업 알림 - 추가학기 가능성이 있을 경우 경고 팝업 표시
 * 
 * ═══════════════════════════════════════════════════════════
 * 백엔드 API 설계
 * ═══════════════════════════════════════════════════════════
 * 
 * [1] POST /api/transcript/upload
 *     - 학점이수표 PDF 업로드
 *     - OCR/파싱으로 이수 과목 추출
 *     - Request: FormData (file)
 *     - Response: { courses: [...], totalCredits, parsedAt }
 * 
 * [2] GET /api/graduation/analysis?userId={id}
 *     - 졸업 요건 분석 결과
 *     - Response: {
 *         totalCredits: { earned, required },
 *         categories: {
 *           majorRequired: { earned, required, missing: [...] },
 *           majorElective: { earned, required },
 *           liberalRequired: { earned, required, missing: [...] },
 *           liberalElective: { earned, required },
 *         },
 *         graduationPossible: boolean,
 *         extraSemesterRisk: boolean,
 *         extraSemesterReason: string | null,
 *         warnings: string[],
 *       }
 * 
 * [3] GET /api/graduation/requirements?major={code}&college={code}
 *     - 대학별/전공별 졸업 요건 조회
 *     - Response: { requirements: [...], totalRequired, rules: [...] }
 * 
 * ═══════════════════════════════════════════════════════════
 */

// ─── 더미 데이터 (백엔드 연결 시 API 응답으로 교체) ───
const graduationData = {
  totalCredits: { earned: 62, required: 130 },
  categories: [
    { label: '전공필수', earned: 18, required: 30, color: 'blue' },
    { label: '전공선택', earned: 20, required: 30, color: 'green' },
    { label: '교양필수', earned: 8, required: 12, color: 'yellow' },
    { label: '교양선택', earned: 16, required: 28, color: 'purple' },
  ],
  graduationPossible: true,
  expectedGraduation: '2026-2',
  extraSemesterRisk: true,
  extraSemesterReason: '복수전공 학점 부족 (현재 21/39학점)',
}

const missingCourses = [
  { name: '소프트웨어공학', type: '전공필수', credit: 3, year: '3학년', reason: '졸업 필수' },
  { name: '캡스톤디자인', type: '전공필수', credit: 3, year: '4학년', reason: '졸업 필수' },
  { name: '글쓰기와 표현', type: '교양필수', credit: 2, year: '1학년', reason: '교양 필수' },
]

const currentCourses = [
  { name: '데이터베이스', type: '전공필수', credit: 3 },
  { name: '컴퓨터네트워크', type: '전공선택', credit: 3 },
  { name: '알고리즘', type: '전공필수', credit: 3 },
  { name: '소프트웨어공학', type: '전공필수', credit: 3 },
  { name: '영어회화', type: '교양필수', credit: 2 },
]

function Curriculum() {
  const [tab, setTab] = useState('overview')
  const [showExtraSemesterAlert, setShowExtraSemesterAlert] = useState(graduationData.extraSemesterRisk)

  // ─── TODO: 백엔드 API 연결 ───
  // useEffect(() => {
  //   // 졸업 요건 분석 데이터 로드
  //   fetch(`/api/graduation/analysis?userId=${userId}`)
  //     .then(res => res.json())
  //     .then(data => {
  //       setGraduationData(data)
  //       if (data.extraSemesterRisk) setShowExtraSemesterAlert(true)
  //     })
  // }, [])
  //
  // // 학점이수표 업로드 핸들러
  // const handleUpload = async (file) => {
  //   const formData = new FormData()
  //   formData.append('transcript', file)
  //   const res = await fetch('/api/transcript/upload', { method: 'POST', body: formData })
  //   const data = await res.json()
  //   // 업로드 후 분석 결과 갱신
  //   refreshAnalysis()
  // }

  return (
    <>
      <Navbar />
      <div className="mt-14 p-8 max-w-[1100px] mx-auto">

        {/* 추가학기 경고 팝업 */}
        {showExtraSemesterAlert && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800 mb-1">추가학기 가능성 감지</h3>
              <p className="text-xs text-red-600 leading-relaxed">{graduationData.extraSemesterReason}</p>
              <p className="text-xs text-red-400 mt-1">현재 로드맵 기준으로 추가학기가 필요할 수 있어요. 로드맵을 확인해보세요.</p>
            </div>
            <button onClick={() => setShowExtraSemesterAlert(false)} className="text-red-300 hover:text-red-500 text-sm">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-green-900 mb-1">📊 커리큘럼 기반 학업 현황</h1>
            <p className="text-sm text-gray-400">2025년 1학기 기준 · 컴퓨터과학전공</p>
          </div>
          {/* TODO: 학점이수표 업로드 버튼 (백엔드 연결 시 활성화) */}
          <button className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700 transition">
            📄 이수표 업로드
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit mb-6">
          {[
            { key: 'overview', label: '전체 요약' },
            { key: 'graduation', label: '졸업 요건' },
            { key: 'courses', label: '이수 과목' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-green-50 hover:text-green-700'}`}>{t.label}</button>
          ))}
        </div>

        {/* ═══ 전체 요약 탭 ═══ */}
        {tab === 'overview' && (
          <>
            {/* 졸업 가능 여부 배너 */}
            <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${graduationData.graduationPossible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-3xl">{graduationData.graduationPossible ? '🎓' : '⚠️'}</div>
              <div>
                <h3 className={`text-sm font-bold ${graduationData.graduationPossible ? 'text-green-800' : 'text-red-800'}`}>
                  {graduationData.graduationPossible ? '졸업 가능' : '졸업 요건 미충족'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  예상 졸업: <strong>{graduationData.expectedGraduation}</strong> · 남은 학점: {graduationData.totalCredits.required - graduationData.totalCredits.earned}학점
                </p>
              </div>
            </div>

            {/* 학점 카드 */}
            <div className="grid grid-cols-4 gap-3.5 mb-6">
              {graduationData.categories.map(c => {
                const pct = Math.round((c.earned / c.required) * 100)
                const remaining = c.required - c.earned
                return (
                  <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">{c.label}</div>
                    <div className="text-2xl font-extrabold text-green-700">{c.earned}</div>
                    <div className="text-xs text-gray-300 mt-0.5 mb-3">/ {c.required}학점</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`text-[11px] font-bold mt-2 ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {remaining > 0 ? `${remaining}학점 남음` : '✓ 충족'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 미이수 필수 과목 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">⚠️ 미이수 필수 과목</h2>
                <span className="text-[11px] font-bold bg-red-50 text-red-500 px-2.5 py-1 rounded-lg">{missingCourses.length}과목</span>
              </div>
              <div className="space-y-2">
                {missingCourses.map(c => (
                  <div key={c.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">필수</span>
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{c.type}</span>
                      <span>{c.credit}학점</span>
                      <span>권장 {c.year}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 현재 수강 중 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">📚 현재 수강 중</h2>
                <span className="text-[11px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">2025-1 · 14학점</span>
              </div>
              <div className="space-y-2">
                {currentCourses.map(c => (
                  <div key={c.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">수강중</span>
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{c.type}</span>
                      <span>{c.credit}학점</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ 졸업 요건 탭 ═══ */}
        {tab === 'graduation' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-4">🎓 졸업 요건 상세</h2>
            {/*
             * TODO: 백엔드 연결
             * GET /api/graduation/requirements?major={code}&college={code}
             * 대학별/전공별 졸업 요건 데이터 표시
             * - 총 이수 학점
             * - 전공필수/전공선택 최소 학점
             * - 교양필수/교양선택 최소 학점
             * - 복수전공/부전공 요건
             * - 졸업논문/캡스톤 요건
             * - 어학 요건 등
             */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">총 졸업 학점</span>
                <span className="text-sm font-bold text-gray-800">130학점 이상</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">전공필수</span>
                <span className="text-sm font-bold text-gray-800">30학점 이상</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">전공선택</span>
                <span className="text-sm font-bold text-gray-800">30학점 이상</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">교양필수</span>
                <span className="text-sm font-bold text-gray-800">12학점 이상</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">교양선택</span>
                <span className="text-sm font-bold text-gray-800">28학점 이상</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-600">캡스톤디자인</span>
                <span className="text-sm font-bold text-red-500">미이수 ✗</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 이수 과목 탭 ═══ */}
        {tab === 'courses' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">📋 전체 이수 과목</h2>
              <span className="text-xs text-gray-400">총 62학점 이수</span>
            </div>
            {/*
             * TODO: 백엔드 연결
             * 학점이수표 업로드 후 파싱된 전체 이수 과목 목록 표시
             * POST /api/transcript/upload → 파싱 결과
             * 각 과목: { name, type, credit, semester, grade }
             */}
            <p className="text-sm text-gray-400 text-center py-12">
              📄 학점이수표를 업로드하면<br/>전체 이수 과목이 여기에 표시됩니다.
            </p>
          </div>
        )}

      </div>
    </>
  )
}

export default Curriculum
