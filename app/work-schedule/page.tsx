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

    const startMonth = start.getMonth() + 1
    const startDay = start.getDate()
    const endMonth = end.getMonth() + 1
    const endDay = end.getDate()

    return `${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`
  }

  const getDayLabel = (date: string) => {
    const dayDate = new Date(date)
    const month = dayDate.getMonth() + 1
    const day = dayDate.getDate()
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
    const dayName = dayNames[dayDate.getDay()]

    return { dayName, dateStr: `${month}/${day}` }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">근무표</h1>
            <p className="text-gray-600">팀별 주간 근무 일정을 확인하세요</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!weeklySchedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">근무표</h1>
            <p className="text-gray-600">팀별 주간 근무 일정을 확인하세요</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  // 관리자 여부 확인
  const isAdmin = currentUser?.role === "관리자"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            근무표
          </h1>
        </div>
        {isAdmin && (
          <Link href="/work-schedule/manage">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              근무표 관리
            </Button>
          </Link>
        )}
      </div>

      {/* 주차 네비게이션 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
              <div className="text-lg font-semibold">
                {formatDateRange(weeklySchedule.weekStart, weeklySchedule.weekEnd)}
              </div>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {!isCurrentWeek() && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const today = supabaseWorkScheduleStorage.getCurrentWeekStart()
                  setCurrentWeekStart(today)
                  await loadWeeklySchedule(today)
                }}
              >
                🔄
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 근무표 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>주간 근무 일정</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-900 min-w-[100px] sticky left-0 bg-gray-50"></th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = supabaseWorkScheduleStorage.addWeeks(weeklySchedule.weekStart, 0)
                    const currentDate = new Date(date)
                    currentDate.setDate(currentDate.getDate() + i)
                    const dateStr = currentDate.toISOString().split("T")[0]
                    const { dayName, dateStr: displayDate } = getDayLabel(dateStr)

                    return (
                      <th
                        key={i}
                        className={`text-center p-4 font-semibold min-w-[120px] ${
                          isToday(dateStr) ? "bg-yellow-50 text-yellow-800" : "text-gray-900"
                        }`}
                      >
                        <div>{dayName}</div>
                        <div className="text-sm font-normal">{displayDate}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {weeklySchedule.teams.map((team) => (
                  <tr key={team.teamId} className="border-b">
                    <td className="p-4 font-medium text-gray-900 sticky left-0 bg-white border-r">{team.teamName}</td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const date = supabaseWorkScheduleStorage.addWeeks(weeklySchedule.weekStart, 0)
                      const currentDate = new Date(date)
                      currentDate.setDate(currentDate.getDate() + dayIndex)
                      const dateStr = currentDate.toISOString().split("T")[0]

                      return (
                        <td
                          key={dayIndex}
                          className={`p-2 text-center min-w-[120px] ${isToday(dateStr) ? "bg-yellow-50" : ""}`}
                        >
                          <div className="space-y-1">
                            {team.members.map((member) => {
                              const dailySchedule = member.schedule[dayIndex]
                              if (!dailySchedule || dailySchedule.workTypeId === "none") {
                                return null
                              }

                              return (
                                <div key={member.memberId} className="text-xs mb-1">
                                  <div
                                    className={`flex items-center justify-center ${
                                      isCurrentUser(member.memberId) ? "text-blue-600" : "text-gray-700"
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
                                            ? `${dailySchedule.workTypeColor} text-xs px-1 py-0 flex-shrink-0`
                                            : "text-xs px-1 py-0 flex-shrink-0"
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
        </CardContent>
      </Card>

      {weeklySchedule.teams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 팀이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
