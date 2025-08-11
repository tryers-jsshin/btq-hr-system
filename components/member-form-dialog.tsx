"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      monday: "off",
      tuesday: "off",
      wednesday: "off",
      thursday: "off",
      friday: "off",
      saturday: "off",
      sunday: "off",
    },
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])

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
          monday: "off",
          tuesday: "off",
          wednesday: "off",
          thursday: "off",
          friday: "off",
          saturday: "off",
          sunday: "off",
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
      return { name: "미설정", bgcolor: "#f3f4f6", fontcolor: "#6b7280" }
    }
    if (workTypeId === "off") {
      return { name: "오프", bgcolor: "#e5e7eb", fontcolor: "#4b5563" }
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "구성원 수정" : "구성원 추가"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="이름을 입력하세요"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_number">사원번호</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, employee_number: e.target.value }))}
                    placeholder="사원번호를 입력하세요"
                    className={errors.employee_number ? "border-red-500" : ""}
                  />
                  {errors.employee_number && <p className="text-sm text-red-500">{errors.employee_number}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>팀</Label>
                  <Select value={formData.team_id} onValueChange={handleTeamChange}>
                    <SelectTrigger className={errors.team_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="팀을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.team_id && <p className="text-sm text-red-500">{errors.team_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="join_date">입사일</Label>
                  <Input
                    id="join_date"
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, join_date: e.target.value }))}
                    className={errors.join_date ? "border-red-500" : ""}
                  />
                  {errors.join_date && <p className="text-sm text-red-500">{errors.join_date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="010-1234-5678"
                    className={errors.phone ? "border-red-500" : ""}
                    maxLength={13}
                  />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>역할</Label>
                  <RadioGroup
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, role: value as "일반직원" | "관리자" }))
                    }
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="일반직원" id="employee" />
                      <Label htmlFor="employee">일반직원</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="관리자" id="admin" />
                      <Label htmlFor="admin">관리자</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주간 근무 스케줄 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주간 근무 스케줄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((day) => (
                  <div key={day.key} className="space-y-2">
                    <Label>{day.label}</Label>
                    <Select
                      value={formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule]}
                      onValueChange={(value) => handleScheduleChange(day.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">오프</SelectItem>
                        {workTypes
                          .filter((workType) => workType.deduction_days === null || workType.deduction_days === undefined)
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
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">스케줄 미리보기</h4>
                <div className="grid grid-cols-7 gap-2 text-sm">
                  {DAYS.map((day) => {
                    const workTypeInfo = getWorkTypeInfo(
                      formData.weekly_schedule[day.key as keyof typeof formData.weekly_schedule],
                    )
                    return (
                      <div key={day.key} className="text-center">
                        <div className="font-medium text-gray-600 mb-1">{day.label.slice(0, 1)}</div>
                        <div
                          className="p-1 rounded text-xs"
                          style={{ backgroundColor: workTypeInfo.bgcolor, color: workTypeInfo.fontcolor }}
                        >
                          {workTypeInfo.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">{member ? "수정" : "저장"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
