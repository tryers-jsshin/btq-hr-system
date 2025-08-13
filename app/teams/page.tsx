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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-50 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">팀 관리</h1>
            </div>
            <Button 
              onClick={handleAddTeam}
              className="hidden md:flex bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white rounded-md h-9 sm:h-10 px-3 sm:px-4 text-sm font-medium transition-colors duration-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              팀 추가
            </Button>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onEdit={handleEditTeam} onDelete={handleDeleteTeam} />
          ))}
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <div className="text-center py-12">
            <Plus className="h-12 w-12 text-[#718096] mx-auto mb-4" />
            <p className="text-[#4a5568]">등록된 팀이 없습니다</p>
          </div>
        )}

        <TeamFormDialog open={dialogOpen} onOpenChange={setDialogOpen} team={editingTeam} onSave={handleSaveTeam} />
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleAddTeam}
          className="h-14 w-14 rounded-full bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
