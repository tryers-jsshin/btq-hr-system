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

  useEffect(() => {
    if (member) {
      setSelectedWorkTypeId(member.currentWorkTypeId)
    }
  }, [member, open])

  if (!member) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  }

  const getWorkTypeInfo = (workTypeId: string) => {
    if (workTypeId === "off") {
      return { name: "오프", time: "휴무", color: "bg-gray-200 text-gray-600" }
    }

    const workType = workTypes.find((wt) => wt.id === workTypeId)
    if (!workType) {
      return { name: "미정", time: "-", color: "bg-gray-200 text-gray-600" }
    }

    let color = "bg-blue-100 text-blue-800"
    if (workType.name.includes("오픈")) {
      color = "bg-green-100 text-green-800"
    } else if (workType.name.includes("마감")) {
      color = "bg-purple-100 text-purple-800"
    }

    return {
      name: workType.name,
      time: `${workType.start_time.slice(0, 5)}-${workType.end_time.slice(0, 5)}`,
      color,
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
              <Badge className={getWorkTypeInfo(member.currentWorkTypeId).color}>
                {getWorkTypeInfo(member.currentWorkTypeId).name}
              </Badge>
              <span className="text-sm text-gray-600">{getWorkTypeInfo(member.currentWorkTypeId).time}</span>
            </div>
          </div>

          {/* 근무 형태 선택 */}
          <div className="space-y-2">
            <Label>변경할 근무 형태</Label>
            <Select value={selectedWorkTypeId} onValueChange={setSelectedWorkTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="근무 형태를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">오프 (휴무)</SelectItem>
                {workTypes.map((workType) => (
                  <SelectItem key={workType.id} value={workType.id}>
                    {workType.name} ({workType.start_time.slice(0, 5)}-{workType.end_time.slice(0, 5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 근무 형태 미리보기 */}
          {selectedWorkTypeId && selectedWorkTypeId !== member.currentWorkTypeId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-2">변경 후 근무 형태</div>
              <div className="flex items-center space-x-2">
                <Badge className={selectedWorkType.color}>{selectedWorkType.name}</Badge>
                <span className="text-sm text-blue-600">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {selectedWorkType.time}
                </span>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 참고: 근무 형태는 관리자가 별도로 설정할 수 있습니다.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={selectedWorkTypeId === member.currentWorkTypeId}>
            변경사항 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
