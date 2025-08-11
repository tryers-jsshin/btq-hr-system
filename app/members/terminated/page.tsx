"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, UserX, RotateCcw, Calendar, FileText } from "lucide-react"
import { TerminationFormDialog } from "@/components/termination-form-dialog"
import { supabaseTerminationStorage } from "@/lib/supabase-termination-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

type Member = Database["public"]["Tables"]["members"]["Row"]

export default function TerminatedMembers() {
  const [terminatedMembers, setTerminatedMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [formDialogOpen, setFormDialogOpen] = useState(false)
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
          member.employee_number.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredMembers(filtered)
    }
  }, [terminatedMembers, searchTerm])

  const loadTerminatedMembers = async () => {
    try {
      setLoading(true)
      const data = await supabaseTerminationStorage.getTerminatedMembers()
      setTerminatedMembers(data)
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
        title: "퇴사자 등록 완료",
        description: "퇴사 처리가 성공적으로 완료되었습니다.",
      })

      await loadTerminatedMembers()
    } catch (error) {
      console.error("퇴사 등록 실패:", error)
      toast({
        title: "오류",
        description: "퇴사 등록에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCancelTermination = async (member: Member) => {
    const cancellationReason = prompt("퇴사 취소 사유를 입력해주세요:")
    if (!cancellationReason) return

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

      await supabaseTerminationStorage.cancelTermination(member.id, cancellationReason, currentUser.name)

      toast({
        title: "퇴사 취소 완료",
        description: `${member.name} 구성원의 퇴사가 취소되었습니다.`,
      })

      await loadTerminatedMembers()
    } catch (error) {
      console.error("퇴사 취소 실패:", error)
      toast({
        title: "오류",
        description: "퇴사 취소에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">퇴사자 관리</h1>
            <p className="text-gray-600">퇴사한 구성원들을 관리합니다</p>
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserX className="h-6 w-6 mr-2 text-red-600" />
            퇴사자 관리
          </h1>
          <p className="text-gray-600">퇴사한 구성원들을 관리합니다</p>
        </div>
        <Button onClick={handleAddTermination}>
          <Plus className="h-4 w-4 mr-2" />
          퇴사자 등록
        </Button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="이름, 팀, 사원번호로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 퇴사자 목록 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  {member.name}
                  <Badge variant="secondary" className="ml-2">
                    {member.team_name}
                  </Badge>
                  <Badge variant="destructive" className="ml-2">
                    퇴사
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleCancelTermination(member)} title="퇴사 취소">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium">사원번호:</span>
                  <span className="ml-2 font-mono">{member.employee_number}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="font-medium">퇴사일:</span>
                  <span className="ml-2">
                    {member.termination_date ? new Date(member.termination_date).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </div>
              </div>
              {member.termination_reason && (
                <div className="flex items-start text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">퇴사 사유:</span>
                  <span className="ml-2 break-words">{member.termination_reason}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 퇴사자가 없을 때 */}
      {!loading && filteredMembers.length === 0 && searchTerm === "" && (
        <div className="text-center py-12">
          <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">등록된 퇴사자가 없습니다.</p>
          <Button onClick={handleAddTermination}>
            <Plus className="h-4 w-4 mr-2" />첫 번째 퇴사자 등록하기
          </Button>
        </div>
      )}

      {/* 검색 결과가 없을 때 */}
      {!loading && filteredMembers.length === 0 && searchTerm !== "" && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 퇴사자 등록 다이얼로그 */}
      <TerminationFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} onSave={handleSaveTermination} />
    </div>
  )
}
