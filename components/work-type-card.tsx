"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Edit, Trash2, Calendar } from "lucide-react"
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
    <Card className={`group bg-white border border-[#f3f4f6] rounded-xl shadow-sm hover:shadow-md hover:border-[#5e6ad2]/20 hover:-translate-y-0.5 transition-all duration-200 ${
      isLeaveType ? 'bg-gradient-to-br from-[#fafbfb] to-white' : ''
    }`}>
      <CardContent className="p-5 sm:p-6">
        {/* 헤더 영역 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Badge 
              style={{ 
                backgroundColor: workType.bgcolor || '#f3f4f6', 
                color: workType.fontcolor || '#4a5568' 
              }}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg shadow-sm"
            >
              {workType.name}
            </Badge>
          </div>
          <div className="flex items-center gap-1 transition-opacity duration-200">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(workType)}
              className="h-8 w-8 p-0 text-[#5e6ad2] hover:bg-[#5e6ad2]/10 hover:text-[#4e5ac2] transition-all duration-200 rounded-lg"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(workType)}
              className="h-8 w-8 p-0 text-[#dc2626] hover:bg-[#dc2626]/10 hover:text-[#dc2626] transition-all duration-200 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 정보 영역 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#718096]">
            <Clock className="h-4 w-4" />
            <span className="text-[#4a5568]">
              {`${formatTime(workType.start_time)} - ${formatTime(workType.end_time)}`}
            </span>
          </div>
          
          {/* 연차 차감 정보 */}
          {isLeaveType && workType.deduction_days !== null && workType.deduction_days !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[#2563eb]" />
              <span className="text-[#718096]">연차 차감:</span>
              <span className="font-semibold text-[#0a0b0c]">
                {workType.deduction_days}일
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
