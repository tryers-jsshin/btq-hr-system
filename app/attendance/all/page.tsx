"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Upload, Download, Trash2, Coins } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import { supabaseWorkMileageStorage } from "@/lib/supabase-work-mileage-storage"
import { supabase } from "@/lib/supabase"
import { CsvParser } from "@/lib/csv-parser"
import { AttendanceUploadDialog } from "@/components/attendance-upload-dialog"
import { AttendanceModifyDialog } from "@/components/attendance-modify-dialog"
import { AttendanceDeleteDialog } from "@/components/attendance-delete-dialog"
import { MileageAdjustDialog } from "@/components/mileage-adjust-dialog"
import type { AttendanceDetail, AttendanceFilter } from "@/types/attendance"

export default function AllAttendancePage() {
  const [currentUser, setCurrentUser] = useState<{ 
    id: string
    name: string
    role: string
    is_admin?: boolean 
  } | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDetail[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  )
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [memberList, setMemberList] = useState<{ id: string, name: string }[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showModifyDialog, setShowModifyDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMileageDialog, setShowMileageDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceDetail | null>(null)
  const [selectedMember, setSelectedMember] = useState<{ id: string, name: string, balance: number } | null>(null)

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAttendanceData()
    }
  }, [currentUser, selectedMonth])

  useEffect(() => {
    // 필터링 및 정렬 적용
    let filtered = [...attendanceRecords]
    
    // 이름 필터링
    if (selectedMemberFilter !== "all") {
      filtered = filtered.filter(record => record.member_id === selectedMemberFilter)
    }
    
    // 날짜 오름차순 정렬 (기본값)
    filtered.sort((a, b) => {
      const dateCompare = a.work_date.localeCompare(b.work_date)
      if (dateCompare !== 0) return dateCompare
      // 같은 날짜면 이름순
      return a.member_name.localeCompare(b.member_name)
    })
    
    setFilteredRecords(filtered)
  }, [attendanceRecords, selectedMemberFilter])

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
      
      // 관리자가 아니면 나의 근태 관리로 리다이렉트
      if (memberData?.role !== "관리자") {
        window.location.href = "/attendance/my"
      }
    }
  }

  const loadAttendanceData = async () => {
    if (!currentUser || !currentUser.is_admin) return
    
    try {
      setLoading(true)
      
      const [year, month] = selectedMonth.split("-")
      const startDate = `${selectedMonth}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${selectedMonth}-${lastDay}`
      
      // 필터 설정 - 전체 구성원
      const filter: AttendanceFilter = {
        start_date: startDate,
        end_date: endDate,
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
      
      // 멤버 리스트 추출 (중복 제거)
      const uniqueMembers = Array.from(
        new Map(filteredRecords.map(record => [record.member_id, { 
          id: record.member_id, 
          name: record.member_name 
        }])).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
      
      setMemberList(uniqueMembers)
    } catch (error) {
      console.error("근태 데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = async () => {
    await loadAttendanceData()
    setShowUploadDialog(false)
  }

  const handleModifyComplete = async () => {
    await loadAttendanceData()
    setShowModifyDialog(false)
    setSelectedRecord(null)
  }

  const handleDeleteComplete = async () => {
    await loadAttendanceData()
    setShowDeleteDialog(false)
    setSelectedRecord(null)
  }

  const handleMileageAdjust = async (memberId: string, memberName: string) => {
    // 현재 마일리지 잔액 조회
    const balance = await supabaseWorkMileageStorage.getMileageBalance(memberId)
    setSelectedMember({ id: memberId, name: memberName, balance })
    setShowMileageDialog(true)
  }

  const handleMileageComplete = async () => {
    setShowMileageDialog(false)
    setSelectedMember(null)
  }

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      alert("내보낼 데이터가 없습니다.")
      return
    }
    
    const csvData = filteredRecords.map(record => ({
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
    const filename = `전체근태기록_${selectedMonth}_${format(new Date(), "yyyyMMdd")}.csv`
    
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">구성원 근태 관리</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 구성원 필터 */}
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="px-3 py-2 border border-[#f3f4f6] rounded-md text-sm bg-[#fafbfb] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-100"
              >
                <option value="all">전체 ({memberList.length}명)</option>
                {memberList.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              
              {/* 월 선택 */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setSelectedMemberFilter("all") // 월 변경 시 필터 초기화
                }}
                className="px-3 py-2 border border-[#f3f4f6] rounded-md text-sm bg-[#fafbfb] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-100"
              />
            </div>
          </div>
        </div>

        {/* 근태 기록 테이블 */}
        <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#f3f4f6]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0a0b0c] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#5e6ad2]" />
                전체 구성원 근태 기록
              </h2>
              {/* CSV 버튼 - 데스크탑에서만 표시 */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(true)}
                  size="sm"
                  className="flex items-center gap-2 border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] rounded-md h-8 px-3 text-xs font-medium transition-colors duration-100"
                >
                  <Upload className="h-3 w-3" />
                  CSV 업로드
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCsv}
                  size="sm"
                  className="flex items-center gap-2 border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] rounded-md h-8 px-3 text-xs font-medium transition-colors duration-100"
                >
                  <Download className="h-3 w-3" />
                  내보내기
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">날짜</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">이름</th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">팀</th>
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
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {filteredRecords.map((record) => {
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-[#0a0b0c] font-medium">
                      {record.member_name}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-[#718096]">
                      {record.team_name || "-"}
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 가상 레코드가 아니거나, 출퇴근 기록이 하나라도 있는 경우만 수정 가능 */}
                        {(!record.id.startsWith('virtual_') || record.check_in_time || record.check_out_time) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowModifyDialog(true)
                            }}
                            className="h-7 px-2 text-xs text-[#5e6ad2] hover:bg-[#f3f4f6] font-medium"
                          >
                            수정
                          </Button>
                        )}
                        {/* 가상 레코드는 삭제 불가 */}
                        {!record.id.startsWith('virtual_') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#dc2626] hover:text-[#dc2626] hover:bg-[#fef2f2] h-7 px-2"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {record.is_modified && (
                          <Badge className="ml-2 bg-[#f3f4f6] text-[#718096] border-[#e5e7eb] text-[10px] px-1.5 py-0 h-4">
                            수정됨
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            
            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-[#cbd5e1] mx-auto mb-3" />
                <p className="text-[#4a5568] font-medium">
                  {attendanceRecords.length === 0 
                    ? `${selectedMonth}월 근태 기록이 없습니다.`
                    : `선택한 구성원의 ${selectedMonth}월 근태 기록이 없습니다.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

      {/* CSV 업로드 다이얼로그 */}
      <AttendanceUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onComplete={handleUploadComplete}
        uploadedBy={currentUser?.name || ""}
      />

      {/* 근태 수정 다이얼로그 */}
      {selectedRecord && (
        <AttendanceModifyDialog
          open={showModifyDialog}
          onOpenChange={setShowModifyDialog}
          record={selectedRecord}
          onComplete={handleModifyComplete}
          modifiedBy={currentUser?.name || ""}
        />
      )}

      {/* 근태 삭제 다이얼로그 */}
      {selectedRecord && (
        <AttendanceDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          record={selectedRecord}
          onComplete={handleDeleteComplete}
        />
      )}

      {/* 마일리지 조정 다이얼로그 */}
      {selectedMember && (
        <MileageAdjustDialog
          open={showMileageDialog}
          onOpenChange={setShowMileageDialog}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          currentBalance={selectedMember.balance}
          onComplete={handleMileageComplete}
          adjustedBy={currentUser?.id || ""}
        />
      )}
      </div>
    </div>
  )
}