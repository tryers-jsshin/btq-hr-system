"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  UserX, 
  RotateCcw, 
  Calendar, 
  FileText, 
  MoreVertical,
  Eye
} from "lucide-react"
import { TerminationFormDialog } from "@/components/termination-form-dialog"
import { TerminationCancelDialog } from "@/components/termination-cancel-dialog"
import { TerminatedMemberDetailDialog } from "@/components/terminated-member-detail-dialog"
import { supabaseTerminationStorage } from "@/lib/supabase-termination-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Member = Database["public"]["Tables"]["members"]["Row"]

export default function TerminatedMembers() {
  const [terminatedMembers, setTerminatedMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadTerminatedMembers()
  }, [])

  useEffect(() => {
    // 검색 필터링
    if (searchTerm.trim() === "") {
      setFilteredMembers(terminatedMembers)
    } else {
      const filtered = terminatedMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredMembers(filtered)
    }
  }, [terminatedMembers, searchTerm])

  const loadTerminatedMembers = async () => {
    try {
      setLoading(true)
      const data = await supabaseTerminationStorage.getTerminatedMembers()
      // 퇴사일 기준 최신순 정렬
      const sortedData = data.sort((a, b) => {
        if (!a.termination_date) return 1
        if (!b.termination_date) return -1
        return new Date(b.termination_date).getTime() - new Date(a.termination_date).getTime()
      })
      setTerminatedMembers(sortedData)
    } catch (error) {
      console.error("퇴사자 목록 로드 실패:", error)
      toast({
        title: "오류",
        description: "퇴사자 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTermination = () => {
    setFormDialogOpen(true)
  }

  const handleSaveTermination = async (data: {
    memberId: string
    terminationDate: string
    terminationReason: string
  }) => {
    try {
      const currentUser = await supabaseAuthStorage.getCurrentUser()
      if (!currentUser) {
        toast({
          title: "오류",
          description: "사용자 정보를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      await supabaseTerminationStorage.terminateMember(
        data.memberId,
        data.terminationDate,
        data.terminationReason,
        currentUser.name,
      )

      toast({
        title: "퇴사 처리 완료",
        description: "퇴사 처리가 성공적으로 완료되었습니다.",
      })

      await loadTerminatedMembers()
    } catch (error) {
      console.error("퇴사 등록 실패:", error)
      toast({
        title: "오류",
        description: "퇴사 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCancelTermination = (member: Member) => {
    setSelectedMember(member)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancelTermination = async (reason: string) => {
    if (!selectedMember) return

    try {
      const currentUser = await supabaseAuthStorage.getCurrentUser()
      if (!currentUser) {
        toast({
          title: "오류",
          description: "사용자 정보를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      await supabaseTerminationStorage.cancelTermination(selectedMember.id, reason, currentUser.name)

      toast({
        title: "퇴사 취소 완료",
        description: `${selectedMember.name} 구성원의 퇴사가 취소되었습니다.`,
      })

      await loadTerminatedMembers()
      setCancelDialogOpen(false)
      setSelectedMember(null)
    } catch (error) {
      console.error("퇴사 취소 실패:", error)
      toast({
        title: "오류",
        description: "퇴사 취소에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleViewDetail = (member: Member) => {
    setSelectedMember(member)
    setDetailDialogOpen(true)
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">퇴사자 관리</h1>
            </div>
            <Button
              onClick={handleAddTermination}
              className="hidden md:flex bg-red-600 hover:bg-red-700 text-white rounded-md h-9 sm:h-10 px-3 sm:px-4 text-sm font-medium transition-colors duration-100"
            >
              <UserX className="h-4 w-4 mr-2" />
              퇴사 처리
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
                    퇴사일
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
                      <span className="text-sm text-[#4a5568]">{member.employee_number || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">{member.team_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#4a5568]">
                        {member.termination_date 
                          ? new Date(member.termination_date).toLocaleDateString("ko-KR")
                          : '-'}
                      </span>
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetail(member)}>
                            <Eye className="h-4 w-4 mr-2" />
                            상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCancelTermination(member)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            퇴사 취소
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
                  {member.termination_date && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {new Date(member.termination_date).toLocaleDateString("ko-KR")}
                    </Badge>
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
                    onClick={() => handleCancelTermination(member)} 
                    className="py-2 px-3"
                  >
                    <span className="text-sm">퇴사 취소</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {/* Empty States */}
        {!loading && filteredMembers.length === 0 && searchTerm === "" && (
          <div className="text-center py-12">
            <UserX className="h-12 w-12 text-[#718096] mx-auto mb-4" />
            <p className="text-[#4a5568]">퇴사한 구성원이 없습니다</p>
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
        <TerminationFormDialog 
          open={formDialogOpen} 
          onOpenChange={setFormDialogOpen} 
          onSave={handleSaveTermination} 
        />
        
        <TerminationCancelDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          member={selectedMember}
          onConfirm={handleConfirmCancelTermination}
        />
        
        <TerminatedMemberDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          member={selectedMember}
        />
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleAddTermination}
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
        >
          <UserX className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}