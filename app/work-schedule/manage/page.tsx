"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, Calendar, Edit, AlertTriangle, Plus, Trash2 } from "lucide-react"
import { supabaseWorkScheduleStorage } from "@/lib/supabase-work-schedule-storage"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import { WorkScheduleEditDialog } from "@/components/work-schedule-edit-dialog"
import { WorkScheduleBulkCreateDialog } from "@/components/work-schedule-bulk-create-dialog"
import { WorkScheduleBulkDeleteDialog } from "@/components/work-schedule-bulk-delete-dialog"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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

interface ScheduleChange {
  memberId: string
  memberName: string
  date: string
  oldWorkTypeId: string
  newWorkTypeId: string
  dayName: string
}

export default function WorkScheduleManage() {
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleView | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState("")
  const [workTypes, setWorkTypes] = useState<Database["public"]["Tables"]["work_types"]["Row"][]>([])
  const [changes, setChanges] = useState<ScheduleChange[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<{
    memberId: string
    memberName: string
    date: string
    currentWorkTypeId: string
    dayName: string
  } | null>(null)
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

      // 근무 유형 목록 로드
      const workTypeList = await supabaseWorkTypeStorage.getWorkTypes()
      setWorkTypes(workTypeList)
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
    setChanges([]) // 주차 변경 시 변경사항 초기화
  }

  const handleNextWeek = async () => {
    const newWeekStart = supabaseWorkScheduleStorage.addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    await loadWeeklySchedule(newWeekStart)
    setChanges([]) // 주차 변경 시 변경사항 초기화
  }

  const handleEditSchedule = (memberId: string, memberName: string, date: string, currentWorkTypeId: string) => {
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
    const dayName = dayNames[new Date(date).getDay()]

    setEditingMember({
      memberId,
      memberName,
      date,
      currentWorkTypeId,
      dayName,
    })
    setEditDialogOpen(true)
  }

  const handleScheduleChange = (newWorkTypeId: string) => {
    if (!editingMember) return

    const existingChangeIndex = changes.findIndex(
      (change) => change.memberId === editingMember.memberId && change.date === editingMember.date,
    )

    const newChange: ScheduleChange = {
      memberId: editingMember.memberId,
      memberName: editingMember.memberName,
      date: editingMember.date,
      oldWorkTypeId: editingMember.currentWorkTypeId,
      newWorkTypeId,
      dayName: editingMember.dayName,
    }

    if (existingChangeIndex >= 0) {
      // 기존 변경사항 업데이트
      const updatedChanges = [...changes]
      updatedChanges[existingChangeIndex] = newChange
      setChanges(updatedChanges)
    } else {
      // 새로운 변경사항 추가
      setChanges([...changes, newChange])
    }

    // 화면에 즉시 반영하기 위해 weeklySchedule 업데이트
    if (weeklySchedule) {
      const updatedSchedule = { ...weeklySchedule }
      updatedSchedule.teams = updatedSchedule.teams.map((team) => ({
        ...team,
        members: team.members.map((member) => {
          if (member.memberId === editingMember.memberId) {
            const updatedMember = { ...member }
            updatedMember.schedule = member.schedule.map((daily) => {
              if (daily.date === editingMember.date) {
                const workType = workTypes.find((wt) => wt.id === newWorkTypeId)
                let workTypeName = "미정"
                let workTypeColor = "bg-gray-200 text-gray-600"
                let startTime: string | undefined
                let endTime: string | undefined

                if (newWorkTypeId === "off") {
                  workTypeName = "오프"
                  workTypeColor = "bg-gray-200 text-gray-600"
                } else if (workType) {
                  workTypeName = workType.name
                  startTime = workType.start_time
                  endTime = workType.end_time
                  // 동적 색상 적용
                  workTypeColor = `${workType.bgcolor} ${workType.fontcolor}`
                }

                return {
                  ...daily,
                  workTypeId: newWorkTypeId,
                  workTypeName,
                  workTypeColor,
                  startTime,
                  endTime,
                  isChanged: true,
                }
              }
              return daily
            })
            return updatedMember
          }
          return member
        }),
      }))
      setWeeklySchedule(updatedSchedule)
    }

    setEditDialogOpen(false)
  }

  const handleBulkCreate = async (data: {
    memberIds: string[]
    startDate: string
    endDate: string
  }) => {
    try {
      const generatedCount = await supabaseWorkScheduleStorage.bulkCreateSchedule(
        data.memberIds,
        data.startDate,
        data.endDate,
      )

      toast({
        title: "근무표가 일괄 생성되었습니다",
        description: `${data.memberIds.length}명의 구성원에 대해 ${generatedCount}개의 근무 일정이 생성되었습니다.`,
      })

      // 현재 주차 다시 로드
      await loadWeeklySchedule(currentWeekStart)
    } catch (error) {
      console.error("근무표 일괄 생성 실패:", error)
      toast({
        title: "근무표 생성 실패",
        description: "근무표 일괄 생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDelete = async (data: {
    memberIds: string[]
    startDate: string
    endDate: string
  }) => {
    try {
      const deletedCount = await supabaseWorkScheduleStorage.bulkDeleteSchedule(
        data.memberIds,
        data.startDate,
        data.endDate,
      )

      toast({
        title: "근무표가 일괄 삭제되었습니다",
        description: `${data.memberIds.length}명의 구성원에 대해 ${deletedCount}개의 근무 일정이 삭제되었습니다.`,
      })

      // 현재 주차 다시 로드
      await loadWeeklySchedule(currentWeekStart)
    } catch (error) {
      console.error("근무표 일괄 삭제 실패:", error)
      toast({
        title: "근무표 삭제 실패",
        description: "근무표 일괄 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleSaveChanges = async () => {
    if (changes.length === 0) return

    try {
      console.log("Saving changes:", changes)

      const updates = changes.map((change) => ({
        memberId: change.memberId,
        date: change.date,
        workTypeId: change.newWorkTypeId,
      }))

      console.log("Mapped updates:", updates)

      await supabaseWorkScheduleStorage.batchUpdateSchedule(updates)

      toast({
        title: "근무 일정이 저장되었습니다",
        description: `${changes.length}개의 변경사항이 성공적으로 저장되었습니다.`,
      })

      setChanges([])
      await loadWeeklySchedule(currentWeekStart) // 저장 후 다시 로드
    } catch (error) {
      console.error("근무 일정 저장 실패:", error)

      let errorMessage = "근무 일정 저장에 실패했습니다."

      if (error instanceof Error) {
        errorMessage = `저장 실패: ${error.message}`
      }

      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleCancelChanges = async () => {
    setChanges([])
    await loadWeeklySchedule(currentWeekStart) // 변경사항 취소 후 다시 로드
    toast({
      title: "변경사항이 취소되었습니다",
      description: "모든 변경사항이 취소되었습니다.",
    })
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

  const getWorkTypeName = (workTypeId: string) => {
    if (workTypeId === "off") return "오프"
    if (workTypeId === "leave") return "연차"
    if (workTypeId === "vacation") return "연차"
    if (workTypeId === "vacation_morning") return "오전반차"
    if (workTypeId === "vacation_afternoon") return "오후반차"
    const workType = workTypes.find((wt) => wt.id === workTypeId)
    return workType?.name || "미정"
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
            <h1 className="text-2xl font-bold text-gray-900">근무표 관리</h1>
            <p className="text-gray-600">직원들의 근무 일정을 관리하세요</p>
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
            <h1 className="text-2xl font-bold text-gray-900">근무표 관리</h1>
            <p className="text-gray-600">직원들의 근무 일정을 관리하세요</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            근무표 관리
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setBulkCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            근무표 일괄 생성
          </Button>
          <Button onClick={() => setBulkDeleteDialogOpen(true)} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            근무표 일괄 삭제
          </Button>
          <Link href="/work-schedule">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              조회 모드
            </Button>
          </Link>
        </div>
      </div>

      {/* 변경사항 알림 */}
      {changes.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {changes.length}개의 변경사항이 있습니다. 저장 버튼을 클릭하여 적용하세요.
            <div className="mt-2 space-y-1">
              {changes.slice(0, 3).map((change, index) => (
                <div key={index} className="text-sm">
                  • {change.memberName} - {change.dayName}: {getWorkTypeName(change.oldWorkTypeId)} →{" "}
                  {getWorkTypeName(change.newWorkTypeId)}
                </div>
              ))}
              {changes.length > 3 && <div className="text-sm text-gray-500">외 {changes.length - 3}개...</div>}
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                  setChanges([]) // 주차 변경 시 변경사항 초기화
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
          <CardTitle>주간 근무 일정 관리</CardTitle>
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
                        className={`text-center p-4 font-semibold min-w-[140px] ${
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
                          className={`p-2 text-center min-w-[140px] ${isToday(dateStr) ? "bg-yellow-50" : ""}`}
                        >
                          <div className="space-y-2">
                            {team.members.map((member) => {
                              const dailySchedule = member.schedule[dayIndex]
                              if (!dailySchedule || dailySchedule.workTypeId === "none") {
                                return null
                              }

                              return (
                                <div
                                  key={member.memberId}
                                  className={`border rounded-lg p-2 text-xs ${
                                    dailySchedule.isChanged ? "border-orange-400 bg-orange-50" : "border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className="font-medium text-gray-700 text-xs truncate mr-2">
                                      {member.memberName}
                                    </span>
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
                                        {dailySchedule.isChanged && "*"}
                                      </Badge>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 flex-shrink-0"
                                      disabled={
                                        !dailySchedule.isEditable || dailySchedule.workTypeId.includes("vacation")
                                      }
                                      onClick={() =>
                                        handleEditSchedule(
                                          member.memberId,
                                          member.memberName,
                                          dateStr,
                                          dailySchedule.workTypeId,
                                        )
                                      }
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
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

      {/* 편집 다이얼로그 */}
      <WorkScheduleEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        member={editingMember}
        workTypes={workTypes}
        onSave={handleScheduleChange}
      />

      {/* 일괄 생성 다이얼로그 */}
      <WorkScheduleBulkCreateDialog
        open={bulkCreateDialogOpen}
        onOpenChange={setBulkCreateDialogOpen}
        onGenerate={handleBulkCreate}
      />

      {/* 일괄 삭제 다이얼로그 */}
      <WorkScheduleBulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onDelete={handleBulkDelete}
      />
    </div>
  )
}
