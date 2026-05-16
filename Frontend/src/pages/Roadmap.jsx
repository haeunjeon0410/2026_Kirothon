import { useState } from 'react'
import Navbar from '../components/Navbar'

const csAreas = [
  {
    name: '💻 프로그래밍 기초',
    cols: [
      [{ name: '이산수학', tag: '교선핵심', s: 'done' }, { name: '선형대수학', tag: '교선핵심', s: 'done' }],
      [{ name: '프로그래밍 기초', s: 'done' }],
      [{ name: '자료구조', s: 'done' }, { name: '객체지향프로그래밍', s: 'done' }],
      [{ name: '데이터베이스', s: 'current' }, { name: '컴퓨터네트워크', s: 'current' }],
      [{ name: '캡스톤디자인', s: 'required' }, { name: '클라우드컴퓨팅', s: 'todo' }],
    ],
  },
  {
    name: '⚙️ 시스템 소프트웨어',
    cols: [
      [{ name: '확률과통계', tag: '교선핵심', s: 'done' }],
      [{ name: '알고리즘', s: 'done' }, { name: '운영체제', s: 'done' }],
      [{ name: '컴퓨터구조', s: 'done' }, { name: '시스템프로그래밍', s: 'done' }],
      [{ name: '소프트웨어공학', s: 'required' }],
      [{ name: '졸업논문/프로젝트', s: 'required' }],
    ],
  },
  {
    name: '🤖 AI / 데이터',
    cols: [
      [{ name: '통계학개론', tag: '교선핵심', s: 'done' }],
      [{ name: '수치해석', s: 'done', g: true }, { name: '확률론', s: 'done', g: true }],
      [{ name: '데이터분석입문', s: 'done', g: true }, { name: '파이썬프로그래밍', s: 'done', g: true }],
      [{ name: '머신러닝', s: 'todo', g: true }, { name: '자연어처리', s: 'todo', g: true }, { name: '컴퓨터비전', s: 'todo', g: true }],
      [{ name: '딥러닝', s: 'todo', g: true }, { name: '강화학습', s: 'todo', g: true }],
    ],
  },
]

const headers = ['전공영역', '교양', '전공필수', '2학년', '3학년', '4학년']

const nodeStyle = (s) => {
  switch (s) {
    case 'done': return 'bg-blue-50 border-blue-300 text-blue-900'
    case 'current': return 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200 animate-pulse'
    case 'required': return 'bg-white border-gray-300 text-gray-600'
    case 'todo': return 'bg-white border-gray-200 text-gray-400'
    default: return 'bg-white border-gray-200 text-gray-400'
  }
}

function Roadmap() {
  const [major, setMajor] = useState('cs')

  return (
    <>
      <Navbar />
      <div className="mt-14 p-7 max-w-[1300px] mx-auto">
        <h1 className="text-xl font-extrabold text-green-900 mb-5">🗺️ 로드맵</h1>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setMajor('cs')} className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${major === 'cs' ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-green-300'}`}>컴퓨터과학전공</button>
          <button onClick={() => setMajor('biz')} className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${major === 'biz' ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-green-300'}`}>경영학과 (복수전공)</button>
        </div>

        <div className="flex gap-4 mb-4 flex-wrap items-center">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-7 h-4 rounded border bg-blue-50 border-blue-300 inline-block" />이수 완료</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-7 h-4 rounded border bg-blue-50 border-blue-500 ring-2 ring-blue-200 inline-block" />수강 중</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-7 h-4 rounded border bg-white border-gray-200 inline-block" />미이수</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-7 h-4 rounded border-2 border-dashed border-blue-300 inline-block" />선택과목 그룹</span>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-x-auto pb-6">
          <div className="text-center text-lg font-extrabold text-green-900 py-5 border-b-2 border-green-100">컴퓨터과학전공 전공 로드맵</div>

          {/* 헤더 */}
          <div className="grid grid-cols-[110px_160px_180px_180px_200px_200px] min-w-[1030px] border-b-2 border-gray-200 bg-gray-50">
            {headers.map(h => <div key={h} className="py-3 px-2 text-center text-sm font-bold text-gray-500 border-r border-gray-100 last:border-r-0">{h}</div>)}
          </div>

          {/* 영역 행 */}
          {csAreas.map(area => (
            <div key={area.name} className="grid grid-cols-[110px_160px_180px_180px_200px_200px] min-w-[1030px] border-b-2 border-gray-100">
              <div className="py-5 px-2 flex items-center justify-center bg-lime-50 border-r-2 border-gray-200 text-sm font-extrabold text-green-900 text-center leading-snug">{area.name}</div>
              {area.cols.map((col, ci) => (
                <div key={ci} className={`py-4 px-2 border-r border-gray-100 last:border-r-0 flex flex-col items-center gap-2 ${ci >= 2 ? 'bg-gray-50/50' : ''}`}>
                  {col.some(it => it.g) ? (
                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-2.5 flex flex-col items-center gap-1.5 w-full">
                      {col.map(item => (
                        <div key={item.name} className={`rounded-full px-3 py-1.5 text-xs font-semibold border text-center min-w-[100px] relative ${nodeStyle(item.s)}`}>
                          {item.name}
                          {item.s === 'done' && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">✓</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    col.map(item => (
                      <div key={item.name} className={`rounded-full px-3 py-1.5 text-xs font-semibold border text-center min-w-[100px] relative ${nodeStyle(item.s)}`}>
                        {item.name}
                        {item.tag && <span className="ml-1 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded px-1 py-0.5">{item.tag}</span>}
                        {item.s === 'done' && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">✓</span>}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default Roadmap
