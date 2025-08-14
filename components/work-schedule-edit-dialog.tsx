"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Calendar } from "lucide-react"
import type { Database } from "@/types/database"

interface WorkScheduleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    memberId: string
    memberName: string
    date: string
    currentWorkTypeId: string
    dayName: string
  } | null
  workTypes: Database["public"]["Tables"]["work_types"]["Row"][]
  onSave: (workTypeId: string) => void
}

export function WorkScheduleEditDialog({ open, onOpenChange, member, workTypes, onSave }: WorkScheduleEditDialogProps) {
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState("")
  const [isLeaveSchedule, setIsLeaveSchedule] = useState(false)

  useEffect(() => {
    if (member) {
      setSelectedWorkTypeId(member.currentWorkTypeId)
      
      // 연차 유형인지 확인 (deduction_days가 있는 휴가 유형)
      const currentWorkType = workTypes.find(wt => wt.id === member.currentWorkTypeId)
      const isLeave = currentWorkType && currentWorkType.deduction_days !== null && currentWorkType.deduction_days !== undefined
      setIsLeaveSchedule(isLeave)
    }
  }, [member, open, workTypes])

  if (!member) return null

  // 연차가 아닌 근무 유형만 필터링 (is_leave가 true가 아닌 것들)
  const regularWorkTypes = workTypes.filter(wt => 
    wt.is_leave !== true
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  }

  const getWorkTypeInfo = (workTypeId: string) => {
    const workType = workTypes.find((wt) => wt.id === workTypeId)
    if (!workType) {
      return { name: "미정", time: "-", bgcolor: "#f3f4f6", fontcolor: "#4a5568" }
    }

    // 휴가 유형인 경우 시간 표시 처리
    const isLeaveType = workType.is_leave === true
    let timeDisplay = "-"
    
    if (isLeaveType) {
      if (workType.start_time === "00:00:00" && workType.end_time === "23:59:59") {
        timeDisplay = "종일 휴가"
      } else {
        timeDisplay = `${workType.start_time.slice(0, 5)}-${workType.end_time.slice(0, 5)}`
      }
    } else {
      timeDisplay = `${workType.start_time.slice(0, 5)}-${workType.end_time.slice(0, 5)}`
    }

    return {
      name: workType.name,
      time: timeDisplay,
      bgcolor: workType.bgcolor || "#f3f4f6",
      fontcolor: workType.fontcolor || "#4a5568"
    }
  }

  const selectedWorkType = getWorkTypeInfo(selectedWorkTypeId)

  const handleSubmit = () => {
    onSave(selectedWorkTypeId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            {member.memberName}님 근무 일정 수정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 날짜 정보 */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(member.date)} {member.dayName}요일
            </span>
          </div>

          {/* 현재 근무 형태 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">현재 근무 형태</div>
            <div className="flex items-center space-x-2">
              <Badge 
                style={{ 
                  backgroundColor: getWorkTypeInfo(member.currentWorkTypeId).bgcolor,
                  color: getWorkTypeInfo(member.currentWorkTypeId).fontcolor
                }}
                className="border-0"
              >
                {getWorkTypeInfo(member.currentWorkTypeId).name}
              </Badge>
              <span className="text-sm text-gray-600">{getWorkTypeInfo(member.currentWorkTypeId).time}</span>
            </div>
          </div>

          {/* 연차 안내 메시지 */}
          {isLeaveSchedule && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-yellow-600 font-medium">🏖️ 연차 일정</div>
              </div>
              <div className="mt-2 text-sm text-yellow-700">
                이 날짜는 연차 신청이 승인된 일정입니다.
                <br />
                연차 일정은 개별 근무표 수정으로 변경할 수 없으며, 연차 취소 후 다시 설정해주세요.
              </div>
            </div>
          )}

          {/* 근무 형태 선택 */}
          {!isLeaveSchedule && (
            <div className="space-y-2">
              <Label>변경할 근무 형태</Label>
              <Select value={selectedWorkTypeId} onValueChange={setSelectedWorkTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="근무 형태를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {regularWorkTypes.map((workType) => (
                    <SelectItem key={workType.id} value={workType.id}>
                      {workType.name} ({workType.start_time.slice(0, 5)}-{workType.end_time.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 선택된 근무 형태 미리보기 */}
          {!isLeaveSchedule && selectedWorkTypeId && selectedWorkTypeId !== member.currentWorkTypeId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-2">변경 후 근무 형태</div>
              <div className="flex items-center space-x-2">
                <Badge 
                  style={{ 
                    backgroundColor: selectedWorkType.bgcolor,
                    color: selectedWorkType.fontcolor
                  }}
                  className="border-0"
                >
                  {selectedWorkType.name}
                </Badge>
                <span className="text-sm text-blue-600">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {selectedWorkType.time}
                </span>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          {!isLeaveSchedule && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              💡 참고: 근무 형태는 관리자가 별도로 설정할 수 있습니다.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          {!isLeaveSchedule && (
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={selectedWorkTypeId === member.currentWorkTypeId}
            >
              변경사항 추가
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
