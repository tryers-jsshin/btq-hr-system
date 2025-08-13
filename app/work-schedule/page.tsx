"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Settings } from "lucide-react"
import { supabaseWorkScheduleStorage } from "@/lib/supabase-work-schedule-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import type { Database } from "@/types/database"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

type WeeklyScheduleView = {
  weekStart: string
  weekEnd: string
  teams: {
    teamId: string
    teamName: string
    members: {
      memberId: string
      memberName: string
      schedule: {
        date: string
        workTypeId: string
        workTypeName: string
        workTypeColor: string
        startTime?: string
        endTime?: string
        isEditable: boolean
        isChanged?: boolean
      }[]
    }[]
  }[]
}

export default function WorkSchedule() {
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleView | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState("")
  const [currentUser, setCurrentUser] = useState<Database["public"]["Tables"]["members"]["Row"] | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // 현재 주차로 초기화
      const weekStart = supabaseWorkScheduleStorage.getCurrentWeekStart()
      setCurrentWeekStart(weekStart)
      await loadWeeklySchedule(weekStart)

      // 현재 사용자 정보 가져오기
      const user = await supabaseAuthStorage.getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error("초기 데이터 로드 실패:", error)
      toast({
        title: "데이터 로드 실패",
        description: "초기 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklySchedule = async (weekStart: string) => {
    try {
      const schedule = await supabaseWorkScheduleStorage.getWeeklySchedule(weekStart)
      setWeeklySchedule(schedule)
    } catch (error) {
      console.error("주간 일정 로드 실패:", error)
      toast({
        title: "일정 로드 실패",
        description: "주간 일정을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handlePreviousWeek = async () => {
    const newWeekStart = supabaseWorkScheduleStorage.addWeeks(currentWeekStart, -1)
    setCurrentWeekStart(newWeekStart)
    await loadWeeklySchedule(newWeekStart)
  }

  const handleNextWeek = async () => {
    const newWeekStart = supabaseWorkScheduleStorage.addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    await loadWeeklySchedule(newWeekStart)
  }

  const formatDateRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart)
    const end = new Date(weekEnd)

    const startYear = String(start.getFullYear()).slice(-2)
    const endYear = String(end.getFullYear()).slice(-2)
    const startMonth = start.getMonth() + 1
    const startDay = start.getDate()
    const endMonth = end.getMonth() + 1
    const endDay = end.getDate()

    return `${startYear}/${startMonth}/${startDay} - ${endYear}/${endMonth}/${endDay}`
  }

  const getDayLabel = (date: string) => {
    const dayDate = new Date(date)
    const month = dayDate.getMonth() + 1
    const day = dayDate.getDate()
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
    const dayName = dayNames[dayDate.getDay()]

    return { dayName, dateStr: `${month}/${day}(${dayName})` }
  }

  const isToday = (date: string) => {
    const today = new Date().toISOString().split("T")[0]
    return date === today
  }

  const isCurrentUser = (memberId: string) => {
    return currentUser && currentUser.id === memberId
  }

  const isCurrentWeek = () => {
    const today = supabaseWorkScheduleStorage.getCurrentWeekStart()
    return currentWeekStart === today
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무표</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-[#718096]">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!weeklySchedule) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무표</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-[#718096]">데이터를 불러올 수 없습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  // 관리자 여부 확인
  const isAdmin = currentUser?.role === "관리자"

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">
                근무표
              </h1>
            </div>
            {isAdmin && (
              <Link href="/work-schedule/manage">
                <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  근무표 관리
                </Button>
              </Link>
            )}
          </div>
        </div>

      {/* 근무표 테이블 */}
      <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#f3f4f6]">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousWeek}
                className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm sm:text-base font-semibold text-[#0a0b0c]">
                {formatDateRange(weeklySchedule.weekStart, weeklySchedule.weekEnd)}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextWeek}
                className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentWeek() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const today = supabaseWorkScheduleStorage.getCurrentWeekStart()
                    setCurrentWeekStart(today)
                    await loadWeeklySchedule(today)
                  }}
                  className="border-[#f3f4f6] text-[#5e6ad2] hover:bg-[#fafbfb] h-8 px-3"
                >
                  오늘
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider min-w-[100px] sticky left-0 bg-[#fafbfb]">팀</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = supabaseWorkScheduleStorage.addWeeks(weeklySchedule.weekStart, 0)
                    const currentDate = new Date(date)
                    currentDate.setDate(currentDate.getDate() + i)
                    const dateStr = currentDate.toISOString().split("T")[0]
                    const { dayName, dateStr: displayDate } = getDayLabel(dateStr)

                    return (
                      <th
                        key={i}
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider min-w-[120px] ${
                          isToday(dateStr) ? "bg-[#fef3c7] text-[#d97706]" : "text-[#4a5568]"
                        }`}
                      >
                        <div className="text-xs font-normal">{displayDate}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {weeklySchedule.teams.map((team) => (
                  <tr key={team.teamId} className="hover:bg-[#f7f8f9] transition-colors duration-100">
                    <td className="px-4 py-3 font-medium text-xs text-[#0a0b0c] sticky left-0 bg-white border-r border-[#f3f4f6]">{team.teamName}</td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const date = supabaseWorkScheduleStorage.addWeeks(weeklySchedule.weekStart, 0)
                      const currentDate = new Date(date)
                      currentDate.setDate(currentDate.getDate() + dayIndex)
                      const dateStr = currentDate.toISOString().split("T")[0]

                      return (
                        <td
                          key={dayIndex}
                          className={`p-2 text-center min-w-[120px] ${isToday(dateStr) ? "bg-[#fef3c7]/20" : ""}`}
                        >
                          <div className="space-y-1">
                            {team.members.map((member) => {
                              const dailySchedule = member.schedule[dayIndex]
                              if (!dailySchedule || dailySchedule.workTypeId === "none") {
                                return null
                              }

                              return (
                                <div key={member.memberId} className="mb-1">
                                  <div
                                    className={`flex items-center justify-center ${
                                      isCurrentUser(member.memberId) ? "text-[#5e6ad2]" : "text-[#4a5568]"
                                    }`}
                                  >
                                    <span className="font-medium text-xs truncate mr-2">{member.memberName}</span>
                                    {dailySchedule.workTypeId !== "pending" && (
                                      <Badge
                                        style={{
                                          backgroundColor: dailySchedule.workTypeColor.includes("#")
                                            ? dailySchedule.workTypeColor.split(" ")[0]
                                            : undefined,
                                          color: dailySchedule.workTypeColor.includes("#")
                                            ? dailySchedule.workTypeColor.split(" ")[1]
                                            : undefined,
                                          border: dailySchedule.workTypeColor.includes("#")
                                            ? `1px solid ${dailySchedule.workTypeColor.split(" ")[1]}20`
                                            : undefined,
                                        }}
                                        className={
                                          !dailySchedule.workTypeColor.includes("#")
                                            ? `${dailySchedule.workTypeColor} text-[10px] px-1 py-0 h-4 flex-shrink-0`
                                            : "text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                        }
                                      >
                                        {dailySchedule.workTypeName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {weeklySchedule.teams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#718096]">등록된 팀이 없습니다.</p>
        </div>
      )}
      </div>
    </div>
  )
}
