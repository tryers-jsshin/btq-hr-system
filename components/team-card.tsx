"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Edit2, Trash2, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Team } from "@/types/team"

interface TeamCardProps {
  team: Team
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export function TeamCard({ team, onEdit, onDelete }: TeamCardProps) {
  return (
    <Card className="bg-white border border-[#f3f4f6] hover:border-[#e5e7eb] transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-[#0a0b0c]">{team.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:bg-[#f3f4f6]"
              >
                <MoreVertical className="h-4 w-4 text-[#718096]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit(team)}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(team)}
                className="text-red-600 focus:text-red-600"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between py-3 px-3 bg-[#fafbfb] rounded-lg">
          <span className="text-sm text-[#4a5568]">활성 구성원</span>
          <Badge className="bg-[#5e6ad2]/10 text-[#5e6ad2] hover:bg-[#5e6ad2]/10 border-0 font-semibold">
            {team.member_count}명
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
