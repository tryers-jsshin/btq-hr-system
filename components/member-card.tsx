"use client"

import { useEffect } from "react"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Eye, Edit, Hash, Crown } from "lucide-react"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]
type WorkType = Database["public"]["Tables"]["work_types"]["Row"]

interface MemberCardProps {
  member: Member
  onViewDetail: (member: Member) => void
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
}

export function MemberCard({ member, onViewDetail, onEdit, onDelete }: MemberCardProps) {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            {member.name}
            {member.role === "관리자" && <Crown className="ml-2 h-4 w-4 text-yellow-500" />}
            <Badge variant="secondary" className="ml-2">
              {member.team_name}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onViewDetail(member)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(member)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <Hash className="h-4 w-4 mr-2" />
          <span className="font-mono">{member.employee_number}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="h-4 w-4 mr-2" />
          {member.phone}
        </div>
      </CardContent>
    </Card>
  )
}
