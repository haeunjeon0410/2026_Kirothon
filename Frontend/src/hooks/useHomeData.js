import { useState, useEffect } from 'react'
import { getUser, analyzeCredits, getGraduationStatus, getExtraSemesterRisk } from '../api'
import { getTimetable } from '../api'
import { generateRoadmap } from '../api'

/**
 * Home 화면에 필요한 데이터를 한번에 로드하는 커스텀 훅
 */
export function useHomeData() {
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [graduation, setGraduation] = useState(null)
  const [extraSemester, setExtraSemester] = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true)

        // 병렬로 데이터 로드
        const [userData, creditsData, graduationData, extraData, timetableData] =
          await Promise.allSettled([
            getUser(),
            analyzeCredits(),
            getGraduationStatus(),
            getExtraSemesterRisk(),
            getTimetable(),
          ])

        if (userData.status === 'fulfilled') setUser(userData.value)
        if (creditsData.status === 'fulfilled') setCredits(creditsData.value)
        if (graduationData.status === 'fulfilled') setGraduation(graduationData.value)
        if (extraData.status === 'fulfilled') setExtraSemester(extraData.value)
        if (timetableData.status === 'fulfilled') setTimetable(timetableData.value)

      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  // 로드맵은 별도 생성 (시간이 오래 걸릴 수 있음)
  const generateUserRoadmap = async (params) => {
    try {
      const data = await generateRoadmap(params)
      setRoadmap(data)
      return data
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return {
    user,
    credits,
    graduation,
    extraSemester,
    timetable,
    roadmap,
    loading,
    error,
    generateUserRoadmap,
  }
}
