"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Download, TrendingUp, TrendingDown, Target } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import { supabaseWorkMileageStorage } from "@/lib/supabase-work-mileage-storage"
import { supabaseWorkScheduleStorage } from "@/lib/supabase-work-schedule-storage"
import { supabase } from "@/lib/supabase"
import { CsvParser } from "@/lib/csv-parser"
import type { AttendanceDetail, AttendanceSummary, AttendanceFilter } from "@/types/attendance"
import type { MileageSummary } from "@/lib/supabase-work-mileage-storage"

export default function MyAttendancePage() {
  const [currentUser, setCurrentUser] = useState<{ 
    id: string
    name: string
    role: string
    is_admin?: boolean 
  } | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDetail[]>([])
  const [monthlySummary, setMonthlySummary] = useState<AttendanceSummary | null>(null)
  const [mileageSummary, setMileageSummary] = useState<MileageSummary | null>(null)
  const [mileageDetail, setMileageDetail] = useState<{ total: number; workBased: number; adminAdjust: number } | null>(null)
  const [scheduledDays, setScheduledDays] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  )

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAttendanceData()
    }
  }, [currentUser, selectedMonth])

  const initializeUser = async () => {
    const userData = localStorage.getItem("currentUser")
    if (userData) {
      const user = JSON.parse(userData)
      
      // DB에서 관리자 권한 확인
      const { data: memberData } = await supabase
        .from("members")
        .select("role")
        .eq("id", user.id)
        .single()
      
      const userWithRole = {
        ...user,
        role: memberData?.role || "일반직원",
        is_admin: memberData?.role === "관리자"
      }
      setCurrentUser(userWithRole)
    }
  }

  const loadAttendanceData = async () => {
    if (!currentUser) return
    
    try {
      setLoading(true)
      
      const [year, month] = selectedMonth.split("-")
      const startDate = `${selectedMonth}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${selectedMonth}-${lastDay}`
      
      // 필터 설정 - 항상 본인 기록만
      const filter: AttendanceFilter = {
        start_date: startDate,
        end_date: endDate,
        member_id: currentUser.id
      }
      
      // 근태 기록 조회
      const records = await supabaseAttendanceStorage.getAttendanceRecords(filter)
      
      // 오늘 이전의 기록만 필터링
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const filteredRecords = records.filter(record => {
        const recordDate = new Date(record.work_date)
        return recordDate <= today
      })
      
      setAttendanceRecords(filteredRecords)
      
      // 월별 요약
      const summary = await supabaseAttendanceStorage.getMonthlySummary(
        currentUser.id,
        selectedMonth
      )
      setMonthlySummary(summary)
      
      // 근무 마일리지 요약
      const mileage = await supabaseWorkMileageStorage.getMonthlySummary(
        currentUser.id,
        selectedMonth
      )
      setMileageSummary(mileage)
      
      // 전체 마일리지 잔액 상세
      const detail = await supabaseWorkMileageStorage.getMileageBalanceDetail(
        currentUser.id
      )
      setMileageDetail(detail)
      
      // 근무표에 등록된 근무 예정일수
      const scheduled = await supabaseWorkScheduleStorage.getMonthlyScheduledDays(
        currentUser.id,
        selectedMonth
      )
      setScheduledDays(scheduled)
    } catch (error) {
      console.error("근태 데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = () => {
    if (attendanceRecords.length === 0) {
      alert("내보낼 데이터가 없습니다.")
      return
    }
    
    const csvData = attendanceRecords.map(record => ({
      "사원번호": record.employee_number,
      "이름": record.member_name,
      "팀": record.team_name || "",
      "근무일자": record.work_date,
      "출근": record.check_in_time || "",
      "퇴근": record.check_out_time || "",
      "근무유형": record.work_type_name || "",
      "지각": record.is_late ? "Y" : "N",
      "지각(분)": record.late_minutes.toString(),
      "조기퇴근": record.is_early_leave ? "Y" : "N",
      "조기퇴근(분)": record.early_leave_minutes.toString(),
      "초과근무(분)": record.overtime_minutes.toString(),
    }))
    
    const headers = ["사원번호", "이름", "팀", "근무일자", "출근", "퇴근", "근무유형", "지각", "지각(분)", "조기퇴근", "조기퇴근(분)", "초과근무(분)"]
    const csvContent = CsvParser.formatToCsv(csvData, headers)
    const filename = `나의근태기록_${selectedMonth}_${format(new Date(), "yyyyMMdd")}.csv`
    
    CsvParser.downloadCsv(filename, csvContent)
  }

  const formatTime = (time?: string | null) => {
    if (!time) return "-"
    // HH:mm:ss 형식을 HH:mm으로 변환
    return time.slice(0, 5)
  }

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0분"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}분`
    if (mins === 0) return `${hours}시간`
    return `${hours}시간 ${mins}분`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64 mb-8"></div>
            <div className="h-10 bg-gray-100 rounded mb-6"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded"></div>
              ))}
            </div>
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">나의 근태 관리</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 월 선택 */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-[#f3f4f6] rounded-md text-sm bg-[#fafbfb] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-100"
              />
              
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="flex items-center gap-2 border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] rounded-md h-9 sm:h-10 px-3 sm:px-4 text-sm font-medium transition-colors duration-100"
              >
                <Download className="h-4 w-4" />
                내보내기
              </Button>
            </div>
          </div>
        </div>

        {/* 월별 요약 */}
        {monthlySummary && mileageSummary && (
          <div className="space-y-4 mb-6">
            {/* 상단 6개 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-[#0a0b0c]">{monthlySummary.work_days}</span>
                    <span className="text-lg text-[#a0aec0]">/</span>
                    <span className="text-lg text-[#718096]">{scheduledDays}</span>
                  </div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 근무일수</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#dc2626]">{monthlySummary.late_days}</div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 지각횟수</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-[#dc2626]">
                    {formatMinutes(mileageSummary.lateMinutes)}
                  </div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 지각(분)</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-[#ea580c]">
                    {formatMinutes(mileageSummary.earlyLeaveMinutes)}
                  </div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 조기퇴근(분)</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-[#2563eb]">
                    {formatMinutes(mileageSummary.overtimeMinutes)}
                  </div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 초과근무(분)</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className={`text-xl font-bold ${
                    mileageSummary.monthlyChange >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
                  }`}>
                    {mileageSummary.monthlyChange < 0 ? "-" : "+"}
                    {formatMinutes(Math.abs(mileageSummary.monthlyChange))}
                  </div>
                  <div className="text-sm text-[#718096]">{parseInt(selectedMonth.split('-')[1])}월 마일리지</div>
                </CardContent>
              </Card>
            </div>
            
            {/* 근무 마일리지 상세 카드 */}
            <Card className="bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">
                    <Clock className="h-4 w-4 inline mr-1" />
                    실시간 마일리지 현황
                  </span>
                  <span className={`text-xl font-bold`}>
                    {mileageSummary.currentBalance < 0 ? "-" : "+"}
                    {formatMinutes(Math.abs(mileageSummary.currentBalance))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 근태 기록 테이블 */}
        <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#f3f4f6]">
            <h2 className="text-lg font-semibold text-[#0a0b0c] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#5e6ad2]" />
              나의 근태 기록
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">날짜</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    <span className="hidden sm:inline">근무유형</span>
                    <span className="sm:hidden">유형</span>
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">출근</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">퇴근</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">지각</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    <span className="hidden sm:inline">조기퇴근</span>
                    <span className="sm:hidden">조퇴</span>
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    <span className="hidden sm:inline">초과근무</span>
                    <span className="sm:hidden">초과</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {attendanceRecords.map((record) => {
                  // 근무일인데 출퇴근 누락 체크
                  const isWorkDay = 
                    record.scheduled_start_time && 
                    record.scheduled_end_time &&
                    !record.is_leave &&
                    !record.is_holiday;
                    
                  const hasMissingAttendance = 
                    isWorkDay && 
                    (!record.check_in_time || !record.check_out_time) &&
                    new Date(record.work_date) < new Date().setHours(0,0,0,0);

                  return (
                    <tr 
                      key={record.id} 
                      className={cn(
                        "transition-colors duration-100",
                        hasMissingAttendance 
                          ? "bg-red-50 hover:bg-red-100" 
                          : "hover:bg-[#f7f8f9]"
                      )}
                    >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-[#0a0b0c]">
                      {format(new Date(record.work_date), "yy.M.d(E)", { locale: ko })}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {record.work_type_name ? (
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <span
                            className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium"
                            style={{
                              backgroundColor: record.work_type_bgcolor || "#f3f4f6",
                              color: record.work_type_fontcolor || "#4a5568",
                            }}
                          >
                            {record.work_type_name}
                          </span>
                          {/* 부분 휴가인 경우 실제 근무시간 표시 - 모바일에서는 숨김 */}
                          {record.is_leave && record.deduction_days !== null && record.deduction_days !== undefined && record.deduction_days < 1 && 
                           record.scheduled_start_time && record.scheduled_end_time && (
                            <span className="hidden sm:inline text-xs text-[#718096]">
                              (근무: {formatTime(record.scheduled_start_time)} - {formatTime(record.scheduled_end_time)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-[#718096]">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <span className={`text-xs sm:text-sm ${record.is_late ? "text-[#dc2626] font-medium" : "text-[#4a5568]"}`}>
                        {formatTime(record.check_in_time)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <span className={`text-xs sm:text-sm ${record.is_early_leave ? "text-[#ea580c] font-medium" : "text-[#4a5568]"}`}>
                        {formatTime(record.check_out_time)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {record.scheduled_start_time && record.late_minutes > 0 ? (
                        <span className="text-xs sm:text-sm text-[#dc2626] font-medium">
                          {formatMinutes(record.late_minutes)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-[#718096]">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {record.scheduled_end_time && record.early_leave_minutes > 0 ? (
                        <span className="text-xs sm:text-sm text-[#ea580c] font-medium">
                          {formatMinutes(record.early_leave_minutes)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-[#718096]">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {record.overtime_minutes > 0 ? (
                        <span className={`text-xs sm:text-sm font-medium ${!record.scheduled_end_time ? "text-[#7c3aed]" : "text-[#2563eb]"}`}>
                          {formatMinutes(record.overtime_minutes)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-[#718096]">-</span>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            
            {attendanceRecords.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-[#cbd5e1] mx-auto mb-3" />
                <p className="text-[#4a5568] font-medium">{selectedMonth}월 근태 기록이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}