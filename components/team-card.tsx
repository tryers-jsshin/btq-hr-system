"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Edit, Trash2 } from "lucide-react"
import type { Team } from "@/types/team"

interface TeamCardProps {
  team: Team
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export function TeamCard({ team, onEdit, onDelete }: TeamCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            {team.name}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(team)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">활성 구성원:</span>
          </div>
          <Badge variant="secondary">{team.member_count}명</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
