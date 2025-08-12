"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Download } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import { supabaseWorkMileageStorage } from "@/lib/supabase-work-mileage-storage"
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">나의 근태 관리</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">나의 근태 관리</h1>
        <div className="flex items-center gap-2">
          {/* 월 선택 */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 월별 요약 */}
      {monthlySummary && mileageSummary && (
        <div className="space-y-4">
          {/* 상단 6개 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{monthlySummary.work_days}</div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 근무일수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{monthlySummary.late_days}</div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 지각횟수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xl font-bold text-red-600">
                  {formatMinutes(mileageSummary.lateMinutes)}
                </div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 지각(분)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xl font-bold text-orange-600">
                  {formatMinutes(mileageSummary.earlyLeaveMinutes)}
                </div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 조기퇴근(분)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xl font-bold text-blue-600">
                  {formatMinutes(mileageSummary.overtimeMinutes)}
                </div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 초과근무(분)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className={`text-xl font-bold ${
                  mileageSummary.monthlyChange >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {mileageSummary.monthlyChange < 0 ? "-" : "+"}
                  {formatMinutes(Math.abs(mileageSummary.monthlyChange))}
                </div>
                <div className="text-sm text-gray-600">{parseInt(selectedMonth.split('-')[1])}월 마일리지</div>
                {/* 근무/조정 구분 표시 */}
                {(mileageSummary.workBasedChange !== 0 || mileageSummary.adminAdjustChange !== 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    {mileageSummary.workBasedChange !== 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">📊 근무</span>
                        <span className={mileageSummary.workBasedChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {mileageSummary.workBasedChange < 0 ? "-" : "+"}
                          {formatMinutes(Math.abs(mileageSummary.workBasedChange || 0))}
                        </span>
                      </div>
                    )}
                    {mileageSummary.adminAdjustChange !== 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">✏️ 조정</span>
                        <span className={mileageSummary.adminAdjustChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {mileageSummary.adminAdjustChange < 0 ? "-" : "+"}
                          {formatMinutes(Math.abs(mileageSummary.adminAdjustChange || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* 근무 마일리지 상세 카드 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">📍 {format(new Date(), "M월 d일")} 실시간 마일리지 현황</span>
                <span className={`text-lg font-bold ${
                  mileageSummary.currentBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {mileageSummary.currentBalance < 0 ? "-" : "+"}
                  {formatMinutes(Math.abs(mileageSummary.currentBalance))}
                </span>
              </div>
              {/* 전체 잔액 근무/조정 구분 */}
              {mileageDetail && (mileageDetail.workBased !== 0 || mileageDetail.adminAdjust !== 0) && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex gap-4">
                  {mileageDetail.workBased !== 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-500">📊 근무</span>
                      <span className={mileageDetail.workBased >= 0 ? "text-green-600" : "text-red-600"}>
                        {mileageDetail.workBased < 0 ? "-" : "+"}
                        {formatMinutes(Math.abs(mileageDetail.workBased))}
                      </span>
                    </div>
                  )}
                  {mileageDetail.adminAdjust !== 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-500">✏️ 조정</span>
                      <span className={mileageDetail.adminAdjust >= 0 ? "text-green-600" : "text-red-600"}>
                        {mileageDetail.adminAdjust < 0 ? "-" : "+"}
                        {formatMinutes(Math.abs(mileageDetail.adminAdjust))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 근태 기록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            나의 근태 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">날짜</th>
                  <th className="text-left p-2">근무유형</th>
                  <th className="text-left p-2">출근</th>
                  <th className="text-left p-2">퇴근</th>
                  <th className="text-left p-2">지각</th>
                  <th className="text-left p-2">조기퇴근</th>
                  <th className="text-left p-2">초과근무</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {format(new Date(record.work_date), "M/d (E)", { locale: ko })}
                    </td>
                    <td className="p-2">
                      {record.work_type_name ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded text-sm"
                            style={{
                              backgroundColor: record.work_type_bgcolor || "#e5e7eb",
                              color: record.work_type_fontcolor || "#000000",
                            }}
                          >
                            {record.work_type_name}
                          </span>
                          {/* 부분 휴가인 경우 실제 근무시간 표시 */}
                          {record.is_leave && record.deduction_days !== null && record.deduction_days !== undefined && record.deduction_days < 1 && 
                           record.scheduled_start_time && record.scheduled_end_time && (
                            <span className="text-xs text-gray-500">
                              (근무: {formatTime(record.scheduled_start_time)} - {formatTime(record.scheduled_end_time)})
                            </span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2">
                      <span className={record.is_late ? "text-red-600 font-medium" : ""}>
                        {formatTime(record.check_in_time)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={record.is_early_leave ? "text-orange-600 font-medium" : ""}>
                        {formatTime(record.check_out_time)}
                      </span>
                    </td>
                    <td className="p-2">
                      {record.scheduled_start_time && record.late_minutes > 0 && (
                        <span className="text-red-600">
                          {formatMinutes(record.late_minutes)}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {record.scheduled_end_time && record.early_leave_minutes > 0 && (
                        <span className="text-orange-600">
                          {formatMinutes(record.early_leave_minutes)}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {record.overtime_minutes > 0 && (
                        <span className={!record.scheduled_end_time ? "text-purple-600 font-medium" : "text-blue-600"}>
                          {formatMinutes(record.overtime_minutes)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {attendanceRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {selectedMonth}월 근태 기록이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}