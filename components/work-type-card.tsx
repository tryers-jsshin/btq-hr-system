"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Edit, Trash2 } from "lucide-react"
import type { WorkTypeType } from "@/types/work-type"

interface WorkTypeCardProps {
  workType: WorkTypeType
  onEdit: (workType: WorkTypeType) => void
  onDelete: (workType: WorkTypeType) => void
  isSystemManaged?: boolean
}

export function WorkTypeCard({ workType, onEdit, onDelete, isSystemManaged }: WorkTypeCardProps) {
  const formatTime = (time: string) => {
    return time.slice(0, 5) // HH:MM 형식으로 변환
  }

  // 연차 유형인지 확인 (is_leave 기준)
  const isLeaveType = workType.is_leave === true

  return (
    <Card className={`hover:shadow-md transition-shadow ${isLeaveType ? 'border-blue-200 bg-blue-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge style={{ backgroundColor: workType.bgcolor, color: workType.fontcolor }}>{workType.name}</Badge>
            {isLeaveType && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                휴가 유형
              </Badge>
            )}
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(workType)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(workType)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {isLeaveType ? (
                // 휴가 유형의 경우 시간이 00:00:00-23:59:59이면 종일로 표시
                (workType.start_time === "00:00:00" && workType.end_time === "23:59:59") ? 
                  "종일 휴가" : 
                  `${formatTime(workType.start_time)} - ${formatTime(workType.end_time)}`
              ) : (
                `${formatTime(workType.start_time)} - ${formatTime(workType.end_time)}`
              )}
            </span>
          </div>
          
          {isLeaveType && workType.deduction_days !== null && workType.deduction_days !== undefined && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium text-blue-600">연차 차감:</span>
              <span className="font-semibold">
                {workType.deduction_days}일
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
