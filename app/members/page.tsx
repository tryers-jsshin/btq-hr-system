"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { MemberCard } from "@/components/member-card"
import { MemberFormDialog } from "@/components/member-form-dialog"
import { MemberDetailDialog } from "@/components/member-detail-dialog"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

type Member = Database["public"]["Tables"]["members"]["Row"]
type MemberFormData = Omit<
  Database["public"]["Tables"]["members"]["Insert"],
  "id" | "created_at" | "updated_at" | "password"
>

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [viewingMember, setViewingMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    // 검색 필터링
    if (searchTerm.trim() === "") {
      setFilteredMembers(members)
    } else {
      const filtered = members.filter((member) => member.name.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredMembers(filtered)
    }
  }, [members, searchTerm])

  const loadMembers = async () => {
    try {
      setLoading(true)
      // 활성 구성원만 조회 (퇴사자 제외)
      const data = await supabaseMemberStorage.getMembers()
      setMembers(data)

      // 팀별 소속 구성원 수 업데이트
      await supabaseTeamStorage.updateTeamMemberCounts()
    } catch (error) {
      console.error("구성원 목록 로드 실패:", error)
      toast({
        title: "오류",
        description: "구성원 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = () => {
    setEditingMember(null)
    setFormDialogOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setFormDialogOpen(true)
  }

  const handleViewDetail = (member: Member) => {
    setViewingMember(member)
    setDetailDialogOpen(true)
  }

  const handleSaveMember = async (data: MemberFormData) => {
    try {
      if (editingMember) {
        await supabaseMemberStorage.updateMember(editingMember.id, data)
        toast({
          title: "구성원 정보가 수정되었습니다",
          description: `${data.name} 구성원의 정보가 성공적으로 수정되었습니다.`,
        })
      } else {
        await supabaseMemberStorage.createMember(data)
        toast({
          title: "구성원이 성공적으로 등록되었습니다",
          description: `${data.name} 구성원이 성공적으로 등록되었습니다.`,
        })
      }
      await loadMembers()
    } catch (error) {
      console.error("구성원 저장 실패:", error)
      toast({
        title: "오류",
        description: "구성원 정보 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMember = async (member: Member) => {
    if (confirm(`'${member.name}' 구성원을 삭제하시겠습니까?`)) {
      try {
        await supabaseMemberStorage.deleteMember(member.id)
        toast({
          title: "구성원이 삭제되었습니다",
          description: `${member.name} 구성원이 성공적으로 삭제되었습니다.`,
        })
        await loadMembers()
      } catch (error) {
        console.error("구성원 삭제 실패:", error)
        toast({
          title: "오류",
          description: "구성원 삭제에 실패했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  // 로딩 중일 때 표시할 UI
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">활성 구성원</h1>
            <p className="text-gray-600">현재 재직 중인 구성원들을 관리합니다</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            구성원 추가
          </Button>
        </div>

        {/* 검색 */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="이름으로 검색..." value={searchTerm || ""} disabled className="pl-10" />
        </div>

        {/* 로딩 표시 */}
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">구성원 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">활성 구성원</h1>
          <p className="text-gray-600">현재 재직 중인 구성원들을 관리합니다</p>
        </div>
        <Button onClick={handleAddMember}>
          <Plus className="h-4 w-4 mr-2" />
          구성원 추가
        </Button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="이름으로 검색..."
          value={searchTerm || ""}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 구성원 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onViewDetail={handleViewDetail}
            onEdit={handleEditMember}
            onDelete={handleDeleteMember}
          />
        ))}
      </div>

      {/* 구성원이 없을 때 (로딩 완료 후) */}
      {!loading && filteredMembers.length === 0 && searchTerm === "" && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">등록된 활성 구성원이 없습니다.</p>
          <Button onClick={handleAddMember}>
            <Plus className="h-4 w-4 mr-2" />첫 번째 구성원 추가하기
          </Button>
        </div>
      )}

      {/* 검색 결과가 없을 때 */}
      {!loading && filteredMembers.length === 0 && searchTerm !== "" && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 다이얼로그들 */}
      <MemberFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        member={editingMember}
        onSave={handleSaveMember}
      />

      <MemberDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} member={viewingMember} />
    </div>
  )
}
