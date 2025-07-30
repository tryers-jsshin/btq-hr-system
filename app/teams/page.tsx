"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TeamCard } from "@/components/team-card"
import { TeamFormDialog } from "@/components/team-form-dialog"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    try {
      await supabaseTeamStorage.updateTeamMemberCounts()
      const data = await supabaseTeamStorage.getTeams()
      setTeams(data)
    } catch (error) {
      console.error("Error loading teams:", error)
      toast({
        title: "오류 발생",
        description: "팀 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeam = () => {
    setEditingTeam(null)
    setDialogOpen(true)
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setDialogOpen(true)
  }

  const handleSaveTeam = async (data: { name: string }) => {
    try {
      if (editingTeam) {
        await supabaseTeamStorage.updateTeam(editingTeam.id, data)
        toast({
          title: "팀이 수정되었습니다",
          description: `${data.name} 팀이 성공적으로 수정되었습니다.`,
        })
      } else {
        await supabaseTeamStorage.addTeam(data)
        toast({
          title: "팀이 추가되었습니다",
          description: `${data.name} 팀이 성공적으로 추가되었습니다.`,
        })
      }
      loadTeams()
    } catch (error) {
      console.error("Error saving team:", error)
      toast({
        title: "오류 발생",
        description: "팀 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTeam = async (team: Team) => {
    if (confirm(`'${team.name}' 팀을 삭제하시겠습니까?`)) {
      try {
        await supabaseTeamStorage.deleteTeam(team.id)
        toast({
          title: "팀이 삭제되었습니다",
          description: `${team.name} 팀이 성공적으로 삭제되었습니다.`,
        })
        loadTeams()
      } catch (error) {
        console.error("Error deleting team:", error)
        toast({
          title: "오류 발생",
          description: "팀 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
        </div>
        <Button onClick={handleAddTeam}>
          <Plus className="h-4 w-4 mr-2" />팀 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} onEdit={handleEditTeam} onDelete={handleDeleteTeam} />
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">등록된 팀이 없습니다.</p>
          <Button onClick={handleAddTeam}>
            <Plus className="h-4 w-4 mr-2" />첫 번째 팀 추가하기
          </Button>
        </div>
      )}

      <TeamFormDialog open={dialogOpen} onOpenChange={setDialogOpen} team={editingTeam} onSave={handleSaveTeam} />
    </div>
  )
}
