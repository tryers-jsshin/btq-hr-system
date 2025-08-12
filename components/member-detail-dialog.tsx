"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, Calendar, Hash, Building } from 'lucide-react'
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]
type WorkType = Database["public"]["Tables"]["work_types"]["Row"]

interface MemberDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
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

export function MemberDetailDialog({ open, onOpenChange, member }: MemberDetailDialogProps) {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])

  useEffect(() => {
    const loadWorkTypes = async () => {
      try {
        const workTypeList = await supabaseWorkTypeStorage.getWorkTypes()
        setWorkTypes(workTypeList)
      } catch (error) {
        console.error("근무 유형 로드 실패:", error)
      }
    }
    loadWorkTypes()
  }, [])

  if (!member) return null

  const getWorkTypeInfo = (workTypeId: string) => {
    if (workTypeId === "") {
      return { name: "미설정", bgcolor: "#f3f4f6", fontcolor: "#6b7280" }
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

  const getWorkingDaysCount = () => {
    const schedule = member.weekly_schedule
    const workingDays = Object.values(schedule).filter((day) => day !== "off" && day !== "").length
    return workingDays
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            구성원 상세 정보
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>기본 정보</span>
                {member.role === "관리자" && <Badge className="bg-orange-500">관리자</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <User className="h-4 w-4 mr-2" />
                    이름
                  </div>
                  <div className="text-lg font-semibold">{member.name}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <Hash className="h-4 w-4 mr-2" />
                    사원번호
                  </div>
                  <div className="text-lg font-mono">{member.employee_number}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <Building className="h-4 w-4 mr-2" />
                    소속팀
                  </div>
                  <Badge variant="secondary">{member.team_name}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <Phone className="h-4 w-4 mr-2" />
                    전화번호
                  </div>
                  <div>{member.phone}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  입사일
                </div>
                <div>{new Date(member.join_date).toLocaleDateString("ko-KR")}</div>
              </div>
            </CardContent>
          </Card>

          {/* 주간 근무 스케줄 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주간 근무 스케줄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">주 {getWorkingDaysCount()}일 근무</div>

                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day) => {
                    const workTypeInfo = getWorkTypeInfo(member.weekly_schedule[day.key])
                    return (
                      <div key={day.key} className="text-center">
                        <div className="text-xs font-medium text-gray-500 mb-2">{day.label}</div>
                        <div
                          className="p-2 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: workTypeInfo.bgcolor, color: workTypeInfo.fontcolor }}
                        >
                          <div>{workTypeInfo.name}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
