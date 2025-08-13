"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[#0a0b0c]">
            구성원 상세 정보
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 기본 정보 섹션 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#5e6ad2] rounded-full" />
              <h3 className="text-sm font-semibold text-[#0a0b0c]">기본 정보</h3>
            </div>
            
            <div className="bg-[#fafbfb] rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">이름</span>
                <span className="text-[#0a0b0c] font-medium">{member.name}</span>
              </div>

              {member.employee_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#718096]">사번</span>
                  <span className="text-[#0a0b0c]">{member.employee_number}</span>
                </div>
              )}

              {member.team_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#718096]">소속팀</span>
                  <span className="text-[#0a0b0c]">{member.team_name}</span>
                </div>
              )}

              {member.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#718096]">연락처</span>
                  <span className="text-[#0a0b0c]">{member.phone}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">입사일</span>
                <span className="text-[#0a0b0c]">
                  {new Date(member.join_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric"
                  })}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">역할</span>
                <span className="text-[#0a0b0c]">
                  {member.role === "관리자" ? (
                    <Badge className="bg-[#5e6ad2] text-white text-xs px-2 py-0.5">관리자</Badge>
                  ) : (
                    "일반직원"
                  )}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#f3f4f6]" />

          {/* 주간 근무 스케줄 섹션 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#5e6ad2] rounded-full" />
              <h3 className="text-sm font-semibold text-[#0a0b0c]">주간 근무 스케줄</h3>
            </div>
            <div className="bg-[#fafbfb] rounded-lg p-4 border border-[#f3f4f6]">

              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const workTypeInfo = getWorkTypeInfo(member.weekly_schedule[day.key])
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
      </DialogContent>
    </Dialog>
  )
}
