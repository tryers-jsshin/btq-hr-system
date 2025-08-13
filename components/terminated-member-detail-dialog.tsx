"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]

interface TerminatedMemberDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
}

export function TerminatedMemberDetailDialog({
  open,
  onOpenChange,
  member,
}: TerminatedMemberDetailDialogProps) {
  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] !w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[#0a0b0c]">
            퇴사자 상세 정보
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
                <span className="text-[#0a0b0c]">{member.role || "일반직원"}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#f3f4f6]" />

          {/* 퇴사 정보 섹션 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-red-500 rounded-full" />
              <h3 className="text-sm font-semibold text-[#0a0b0c]">퇴사 정보</h3>
            </div>
            
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-3">
              {member.termination_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">퇴사일</span>
                  <span className="text-red-900 font-medium">
                    {new Date(member.termination_date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric"
                    })}
                  </span>
                </div>
              )}

              {member.termination_reason && (
                <div className="flex justify-between items-start text-sm">
                  <span className="text-red-700 flex-shrink-0">퇴사 사유</span>
                  <span className="text-red-900 text-right ml-4">
                    {member.termination_reason}
                  </span>
                </div>
              )}

              {/* 근무 기간 계산 */}
              {member.termination_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">근무 기간</span>
                  <span className="text-red-900 font-medium">
                    {calculateWorkDuration(member.join_date, member.termination_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 근무 기간 계산 함수
function calculateWorkDuration(joinDate: string, terminationDate: string): string {
  const start = new Date(joinDate)
  const end = new Date(terminationDate)
  
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()
  
  if (days < 0) {
    months--
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += lastMonth.getDate()
  }
  
  if (months < 0) {
    years--
    months += 12
  }
  
  const parts = []
  if (years > 0) parts.push(`${years}년`)
  if (months > 0) parts.push(`${months}개월`)
  if (days > 0) parts.push(`${days}일`)
  
  return parts.length > 0 ? parts.join(" ") : "0일"
}