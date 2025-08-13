"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]
type WorkType = Database["public"]["Tables"]["work_types"]["Row"]
type MemberFormData = Omit<
  Database["public"]["Tables"]["members"]["Insert"],
  "id" | "created_at" | "updated_at" | "password"
>

interface MemberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: Member | null
  onSave: (data: MemberFormData) => void
}

const DAYS = [
  { key: "monday", label: "월요일" },
  { key: "tuesday", label: "화요일" },
  { key: "wednesday", label: "수요일" },
  { key: "thursday", label: "목요일" },
  { key: "friday", label: "금요일" },
  { key: "saturday", label: "토요일" },
  { key: "sunday", label: "일요일" },
] as const

export function MemberFormDialog({ open, onOpenChange, member, onSave }: MemberFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    team_id: "",
    team_name: "",
    role: "일반직원" as "일반직원" | "관리자",
    join_date: "",
    phone: "",
    weekly_schedule: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: "",
    },
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [workTypes, setWorkTypes] = useState<any[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamList, workTypeList] = await Promise.all([
          supabaseTeamStorage.getTeams(),
          supabaseWorkTypeStorage.getWorkTypes(),
        ])
        setTeams(teamList)
        setWorkTypes(workTypeList)
      } catch (error) {
        console.error("데이터 로드 실패:", error)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        employee_number: member.employee_number,
        team_id: member.team_id || "",
        team_name: member.team_name || "",
        role: member.role,
        join_date: member.join_date,
        phone: member.phone,
        weekly_schedule: member.weekly_schedule,
      })
    } else {
      setFormData({
        name: "",
        employee_number: "",
        team_id: "",
        team_name: "",
        role: "일반직원",
        join_date: "",
        phone: "",
        weekly_schedule: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
        },
      })
    }
    setErrors({})
  }, [member, open])

  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "이름을 입력해주세요"
    }

    if (!formData.employee_number.trim()) {
      newErrors.employee_number = "사원번호를 입력해주세요"
    } else {
      try {
        const employeeNumberExists = await supabaseMemberStorage.isEmployeeNumberExists(
          formData.employee_number.trim(),
          member?.id,
        )
        if (employeeNumberExists) {
          newErrors.employee_number = "이미 등록된 사원번호입니다"
        }
      } catch (error) {
        console.error("사원번호 중복 확인 실패:", error)
      }
    }

    if (!formData.team_id) {
      newErrors.team_id = "팀을 선택해주세요"
    }

    if (!formData.join_date) {
      newErrors.join_date = "입사일을 선택해주세요"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "전화번호를 입력해주세요"
    }

    // 주간 스케줄 검증
    const emptyScheduleDays = DAYS.filter(
      day => !formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule]
    )
    if (emptyScheduleDays.length > 0) {
      newErrors.weekly_schedule = "모든 요일의 근무 유형을 선택해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTeamChange = (teamId: string) => {
    const selectedTeam = teams.find((team) => team.id === teamId)
    setFormData((prev) => ({
      ...prev,
      team_id: teamId,
      team_name: selectedTeam?.name || "",
    }))
  }

  const handleScheduleChange = (day: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      weekly_schedule: {
        ...prev.weekly_schedule,
        [day]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isValid = await validateForm()
    if (!isValid) return

    const submitData: MemberFormData = {
      name: formData.name,
      employee_number: formData.employee_number,
      team_id: formData.team_id,
      team_name: formData.team_name,
      role: formData.role,
      join_date: formData.join_date,
      phone: formData.phone,
      weekly_schedule: formData.weekly_schedule,
    }

    onSave(submitData)
    onOpenChange(false)
  }

  // 스케줄 미리보기 섹션에서 색상 로직 변경
  const getWorkTypeInfo = (workTypeId: string) => {
    if (workTypeId === "") {
      return { name: "-", bgcolor: "#f3f4f6", fontcolor: "#6b7280" }
    }

    const workType = workTypes.find((wt) => wt.id === workTypeId)
    if (!workType) {
      return { name: "알 수 없음", bgcolor: "#6b7280", fontcolor: "#ffffff" }
    }

    return {
      name: workType.name,
      bgcolor: workType.bgcolor,
      fontcolor: workType.fontcolor,
    }
  }

  // formatPhoneNumber 함수를 컴포넌트 내부에 추가
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "")

    // 길이에 따라 형식 적용
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
    }
  }

  // 전화번호 입력 필드의 onChange 핸들러를 수정
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[#0a0b0c]">
            {member ? "구성원 정보 수정" : "새 구성원 추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* 기본 정보 섹션 */}
            <div>
              <h3 className="text-sm font-semibold text-[#0a0b0c] mb-4 flex items-center">
                <span className="w-1 h-4 bg-[#5e6ad2] rounded-full mr-2"></span>
                기본 정보
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-[#4a5568]">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="홍길동"
                      className={`h-10 ${errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#e5e7eb] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"}`}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee_number" className="text-sm font-medium text-[#4a5568]">사원번호 *</Label>
                    <Input
                      id="employee_number"
                      value={formData.employee_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, employee_number: e.target.value }))}
                      placeholder="EMP001"
                      className={`h-10 ${errors.employee_number ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#e5e7eb] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"}`}
                    />
                    {errors.employee_number && <p className="text-xs text-red-500">{errors.employee_number}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#4a5568]">팀 *</Label>
                    <Select value={formData.team_id} onValueChange={handleTeamChange}>
                      <SelectTrigger className={`h-10 ${errors.team_id ? "border-red-500 focus:border-red-500" : !formData.team_id ? "border-orange-300" : "border-[#e5e7eb] focus:border-[#5e6ad2]"}`}>
                        <SelectValue placeholder="팀 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.team_id && <p className="text-xs text-red-500">{errors.team_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="join_date" className="text-sm font-medium text-[#4a5568]">입사일 *</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !formData.join_date && "text-[#718096]",
                            errors.join_date ? "border-red-500 focus:border-red-500" : "border-[#e5e7eb] hover:bg-[#fafbfb] focus:border-[#5e6ad2]"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.join_date ? (
                            format(new Date(formData.join_date), "yyyy년 MM월 dd일", { locale: ko })
                          ) : (
                            <span>날짜를 선택하세요</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.join_date ? new Date(formData.join_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData((prev) => ({ ...prev, join_date: format(date, "yyyy-MM-dd") }))
                              setCalendarOpen(false)
                            }
                          }}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.join_date && <p className="text-xs text-red-500">{errors.join_date}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-[#4a5568]">전화번호 *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="010-1234-5678"
                      className={`h-10 ${errors.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#e5e7eb] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"}`}
                      maxLength={13}
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#4a5568]">역할</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, role: value as "일반직원" | "관리자" }))
                      }
                    >
                      <SelectTrigger className="h-10 border-[#e5e7eb] focus:border-[#5e6ad2]">
                        <SelectValue placeholder="역할 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="일반직원">일반직원</SelectItem>
                        <SelectItem value="관리자">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* 주간 근무 스케줄 섹션 */}
            <div>
              <h3 className="text-sm font-semibold text-[#0a0b0c] mb-4 flex items-center">
                <span className="w-1 h-4 bg-[#5e6ad2] rounded-full mr-2"></span>
                주간 근무 스케줄
              </h3>
              {errors.weekly_schedule && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.weekly_schedule}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
                {DAYS.map((day) => (
                  <div key={day.key} className="space-y-2">
                    <Label className="text-xs font-medium text-[#4a5568]">{day.label}</Label>
                    <Select
                      value={formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule]}
                      onValueChange={(value) => handleScheduleChange(day.key, value)}
                    >
                      <SelectTrigger className={`h-9 text-xs ${!formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule] ? "border-orange-300" : "border-[#e5e7eb] focus:border-[#5e6ad2]"}`}>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {workTypes
                          .filter((workType) => !workType.is_leave)
                          .map((workType) => (
                            <SelectItem key={workType.id} value={workType.id}>
                              {workType.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* 스케줄 미리보기 */}
              <div className="mt-6 p-4 bg-[#fafbfb] rounded-lg border border-[#f3f4f6]">
                <h4 className="text-sm font-medium text-[#4a5568] mb-3">주간 스케줄 미리보기</h4>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day) => {
                    const workTypeInfo = getWorkTypeInfo(
                      formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule],
                    )
                    return (
                      <div key={day.key} className="text-center">
                        <div className="text-xs font-medium text-[#718096] mb-2">{day.label.slice(0, 1)}</div>
                        <div
                          className="py-2 px-0.5 rounded-md text-[10px] font-medium transition-all"
                          style={{ backgroundColor: workTypeInfo.bgcolor, color: workTypeInfo.fontcolor }}
                        >
                          {workTypeInfo.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
            >
              취소
            </Button>
            <Button 
              type="submit"
              className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
            >
              {member ? "변경사항 저장" : "구성원 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
