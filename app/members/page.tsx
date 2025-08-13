"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, UserPlus, Users, Phone, Mail, Building, MoreVertical, Edit2, Trash2, Eye } from "lucide-react"
import { MemberFormDialog } from "@/components/member-form-dialog"
import { MemberDetailDialog } from "@/components/member-detail-dialog"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

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
      const filtered = members.filter((member) => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredMembers(filtered)
    }
  }, [members, searchTerm])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const data = await supabaseMemberStorage.getMembers()
      // 사번 기준 오름차순 정렬
      const sortedData = data.sort((a, b) => {
        if (!a.employee_number) return 1
        if (!b.employee_number) return -1
        return a.employee_number.localeCompare(b.employee_number)
      })
      setMembers(sortedData)
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
          title: "수정 완료",
          description: `${data.name}님의 정보가 수정되었습니다.`,
        })
      } else {
        await supabaseMemberStorage.createMember(data)
        toast({
          title: "등록 완료",
          description: `${data.name}님이 등록되었습니다.`,
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
    if (confirm(`${member.name}님을 삭제하시겠습니까?`)) {
      try {
        await supabaseMemberStorage.deleteMember(member.id)
        toast({
          title: "삭제 완료",
          description: `${member.name}님이 삭제되었습니다.`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64 mb-8"></div>
            <div className="h-10 bg-gray-100 rounded mb-6"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded"></div>
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">활성 구성원</h1>
            </div>
            <Button
              onClick={handleAddMember}
              className="hidden md:flex bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white rounded-md h-9 sm:h-10 px-3 sm:px-4 text-sm font-medium transition-colors duration-100"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              구성원 추가
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#718096] h-4 w-4" />
            <Input
              placeholder="이름, 사번, 팀으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-[#fafbfb] border-[#f3f4f6] rounded-md text-sm placeholder:text-[#718096] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-100"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    이름
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    사번
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    팀
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    역할
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    연락처
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider">
                    입사일
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-[#f7f8f9] transition-colors duration-100"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#0a0b0c]">{member.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">{member.employee_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">{member.team_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.role === "관리자" ? (
                        <Badge className="bg-[#5e6ad2] text-white hover:bg-[#5e6ad2]">관리자</Badge>
                      ) : (
                        <Badge variant="secondary">일반직원</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">{member.phone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">{member.join_date}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
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
                          <DropdownMenuItem onClick={() => handleViewDetail(member)}>
                            상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditMember(member)}>
                            수정
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile List View - Option 9 Design */}
        <div className="md:hidden space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-[#f3f4f6] px-3 py-2.5 flex items-center"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#0a0b0c] truncate">{member.name}</h3>
                  {member.role === "관리자" && (
                    <Badge className="bg-[#5e6ad2] text-white text-[10px] px-1.5 py-0 h-4">관리자</Badge>
                  )}
                </div>
                <p className="text-xs text-[#718096] truncate">
                  {member.team_name || '소속 없음'}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-[#f3f4f6] rounded-lg"
                  >
                    <MoreVertical className="h-4 w-4 text-[#9ca3af]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem 
                    onClick={() => handleViewDetail(member)} 
                    className="py-2 px-3"
                  >
                    <span className="text-sm">상세보기</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleEditMember(member)} 
                    className="py-2 px-3"
                  >
                    <span className="text-sm">수정</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {/* Empty States */}
        {!loading && filteredMembers.length === 0 && searchTerm === "" && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[#718096] mx-auto mb-4" />
            <p className="text-[#4a5568]">등록된 구성원이 없습니다</p>
          </div>
        )}

        {!loading && filteredMembers.length === 0 && searchTerm !== "" && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-[#718096] mx-auto mb-4" />
            <p className="text-[#4a5568]">검색 결과가 없습니다</p>
            <p className="text-sm text-[#718096] mt-2">다른 검색어를 시도해보세요</p>
          </div>
        )}

        {/* Modals */}
        <MemberFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          member={editingMember}
          onSave={handleSaveMember}
        />
        <MemberDetailDialog 
          open={detailDialogOpen} 
          onOpenChange={setDetailDialogOpen} 
          member={viewingMember} 
        />
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleAddMember}
          className="h-14 w-14 rounded-full bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}