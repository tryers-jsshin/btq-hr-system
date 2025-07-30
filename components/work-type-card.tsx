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
}

export function WorkTypeCard({ workType, onEdit, onDelete }: WorkTypeCardProps) {
  const formatTime = (time: string) => {
    return time.slice(0, 5) // HH:MM 형식으로 변환
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge style={{ backgroundColor: workType.bgcolor, color: workType.fontcolor }}>{workType.name}</Badge>
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
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>
            {formatTime(workType.start_time)} - {formatTime(workType.end_time)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
