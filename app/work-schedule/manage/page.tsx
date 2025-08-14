"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Calendar, Edit, AlertTriangle, Plus, Trash2, Loader2, RotateCcw } from "lucide-react"
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
  const [processing, setProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [processingProgress, setProcessingProgress] = useState(0)
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

                if (workType) {
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
    setProcessing(true)
    setProcessingMessage("근무표를 일괄 생성하고 있습니다...")
    setProcessingProgress(30)
    
    try {
      const result = await supabaseWorkScheduleStorage.bulkCreateSchedule(
        data.memberIds,
        data.startDate,
        data.endDate,
      )

      setProcessingProgress(70)
      setProcessingMessage("근태 및 마일리지를 업데이트하고 있습니다...")
      
      // 완료까지 잠시 대기 (UI 피드백)
      await new Promise(resolve => setTimeout(resolve, 500))
      setProcessingProgress(100)

      let description = `${data.memberIds.length}명의 구성원에 대해 ${result.created}개의 근무 일정이 생성되었습니다.`
      
      if (result.skippedLeave > 0) {
        description += `\n연차로 인해 ${result.skippedLeave}개의 일정이 보호되어 건너뛰었습니다.`
      }

      toast({
        title: "근무표가 일괄 생성되었습니다",
        description,
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
    } finally {
      setProcessing(false)
      setProcessingMessage("")
      setProcessingProgress(0)
    }
  }

  const handleBulkDelete = async (data: {
    memberIds: string[]
    startDate: string
    endDate: string
  }) => {
    setProcessing(true)
    setProcessingMessage("근무표를 일괄 삭제하고 있습니다...")
    setProcessingProgress(30)
    
    try {
      const result = await supabaseWorkScheduleStorage.bulkDeleteSchedule(
        data.memberIds,
        data.startDate,
        data.endDate,
      )

      setProcessingProgress(70)
      setProcessingMessage("근태 및 마일리지를 업데이트하고 있습니다...")
      
      // 완료까지 잠시 대기 (UI 피드백)
      await new Promise(resolve => setTimeout(resolve, 500))
      setProcessingProgress(100)

      let description = `${data.memberIds.length}명의 구성원에 대해 ${result.deleted}개의 근무 일정이 삭제되었습니다.`
      
      if (result.protectedLeave > 0) {
        description += `\n연차로 인해 ${result.protectedLeave}개의 일정이 보호되어 삭제되지 않았습니다.`
      }

      toast({
        title: "근무표가 일괄 삭제되었습니다",
        description,
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
    } finally {
      setProcessing(false)
      setProcessingMessage("")
      setProcessingProgress(0)
    }
  }

  const handleSaveChanges = async () => {
    if (changes.length === 0) return

    setProcessing(true)
    setProcessingMessage(`${changes.length}개의 변경사항을 저장하고 있습니다...`)
    setProcessingProgress(30)

    try {
      console.log("Saving changes:", changes)

      const updates = changes.map((change) => ({
        memberId: change.memberId,
        date: change.date,
        workTypeId: change.newWorkTypeId,
      }))

      console.log("Mapped updates:", updates)

      await supabaseWorkScheduleStorage.batchUpdateSchedule(updates)

      setProcessingProgress(70)
      setProcessingMessage("근태 및 마일리지를 업데이트하고 있습니다...")
      
      // 완료까지 잠시 대기 (UI 피드백)
      await new Promise(resolve => setTimeout(resolve, 500))
      setProcessingProgress(100)

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
    } finally {
      setProcessing(false)
      setProcessingMessage("")
      setProcessingProgress(0)
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

  const getWorkTypeName = (workTypeId: string) => {
    const workType = workTypes.find((wt) => wt.id === workTypeId)
    return workType?.name || "미정"
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
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무표 관리</h1>
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
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무표 관리</h1>
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">
                근무표 관리
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setBulkCreateDialogOpen(true)} 
                className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
                disabled={processing}
              >
                <Plus className="h-4 w-4 mr-2" />
                근무표 일괄 생성
              </Button>
              <Button 
                onClick={() => setBulkDeleteDialogOpen(true)} 
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                disabled={processing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                근무표 일괄 삭제
              </Button>
              <Link href="/work-schedule">
                <Button variant="outline" className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  조회 모드
                </Button>
              </Link>
            </div>
          </div>
        </div>

      {/* 변경사항 알림 */}
      {changes.length > 0 && (
        <Alert className="bg-[#fef3c7] border-[#fbbf24] mb-6">
          <AlertTriangle className="h-4 w-4 text-[#d97706]" />
          <AlertDescription className="text-[#92400e]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {changes.length}개의 변경사항이 있습니다.
                <div className="mt-2 space-y-1">
                  {changes.slice(0, 3).map((change, index) => (
                    <div key={index} className="text-sm">
                      • {change.memberName} - {change.dayName}: {getWorkTypeName(change.oldWorkTypeId)} →{" "}
                      {getWorkTypeName(change.newWorkTypeId)}
                    </div>
                  ))}
                  {changes.length > 3 && <div className="text-sm text-gray-500">외 {changes.length - 3}개...</div>}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelChanges}
                  className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
                  disabled={processing}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white"
                  disabled={processing}
                >
                  저장
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                disabled={processing}
                title="이전 주"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm sm:text-base font-semibold text-[#0a0b0c] min-w-[140px] text-center">
                {formatDateRange(weeklySchedule.weekStart, weeklySchedule.weekEnd)}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextWeek}
                className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] h-8 w-8 p-0"
                disabled={processing}
                title="다음 주"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isCurrentWeek() ? "ghost" : "outline"}
                size="sm"
                onClick={async () => {
                  if (!isCurrentWeek()) {
                    const today = supabaseWorkScheduleStorage.getCurrentWeekStart()
                    setCurrentWeekStart(today)
                    await loadWeeklySchedule(today)
                    setChanges([])
                  }
                }}
                className={
                  isCurrentWeek() 
                    ? "h-8 w-8 p-0 text-[#a0aec0] cursor-default hover:bg-transparent" 
                    : "border-[#f3f4f6] text-[#5e6ad2] hover:bg-[#fafbfb] h-8 w-8 p-0"
                }
                disabled={processing || isCurrentWeek()}
                title={isCurrentWeek() ? "현재 주" : "오늘이 포함된 주로 이동"}
              >
                <RotateCcw className={isCurrentWeek() ? "h-4 w-4" : "h-4 w-4"} />
              </Button>
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
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider min-w-[140px] ${
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
                          className={`p-2 text-center min-w-[140px] ${isToday(dateStr) ? "bg-[#fef3c7]/20" : ""}`}
                        >
                          <div className="space-y-2">
                            {team.members.map((member) => {
                              const dailySchedule = member.schedule[dayIndex]
                              if (!dailySchedule || dailySchedule.workTypeId === "none") {
                                return null
                              }

                              return (
                                <button
                                  key={member.memberId}
                                  className={`border rounded-lg p-2 text-xs w-full transition-all duration-100 ${
                                    dailySchedule.isChanged 
                                      ? "border-[#fb923c] bg-[#fed7aa]/30" 
                                      : "border-[#f3f4f6]"
                                  } ${
                                    dailySchedule.isEditable
                                      ? "hover:border-[#5e6ad2] hover:bg-[#5e6ad2]/5 cursor-pointer"
                                      : "opacity-50 cursor-not-allowed"
                                  }`}
                                  disabled={!dailySchedule.isEditable}
                                  onClick={() =>
                                    dailySchedule.isEditable &&
                                    handleEditSchedule(
                                      member.memberId,
                                      member.memberName,
                                      dateStr,
                                      dailySchedule.workTypeId,
                                    )
                                  }
                                  type="button"
                                >
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className="font-medium text-[#4a5568] text-xs truncate mr-2">
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
                                            ? `${dailySchedule.workTypeColor} text-[10px] px-1 py-0 h-4 flex-shrink-0`
                                            : "text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                        }
                                      >
                                        {dailySchedule.workTypeName}
                                        {dailySchedule.isChanged && "*"}
                                      </Badge>
                                    )}
                                  </div>
                                </button>
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

      {/* 프로그레스 오버레이 */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#5e6ad2] mr-3" />
                <p className="text-sm font-medium text-[#0a0b0c]">{processingMessage}</p>
              </div>
              <Progress value={processingProgress} className="h-2" />
              <p className="text-xs text-[#718096] mt-2">{processingProgress}% 완료</p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
