"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CalendarCheck, Eye, CheckCircle, XCircle, Clock, Users, Trash2 } from "lucide-react"
import { supabaseVacationStorage } from "@/lib/supabase-vacation-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"]
type VacationAllowance = Database["public"]["Tables"]["vacation_allowances"]["Row"]
type Member = Database["public"]["Tables"]["members"]["Row"]

export default function VacationManagement() {
  const [pendingRequests, setPendingRequests] = useState<VacationRequest[]>([])
  const [allRequests, setAllRequests] = useState<VacationRequest[]>([])
  const [allowances, setAllowances] = useState<VacationAllowance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedMemberUsage, setSelectedMemberUsage] = useState<any[]>([])
  const [selectedMemberName, setSelectedMemberName] = useState("")
  const [editAllowanceDialogOpen, setEditAllowanceDialogOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<VacationAllowance | null>(null)
  const [editTotalDays, setEditTotalDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allowanceLoading, setAllowanceLoading] = useState(false)
  const { toast } = useToast()

  // 현재 사용자
  const [currentUser, setCurrentUser] = useState<Member | null>(null)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadRequestsData()
    }
  }, [currentUser])

  // 연도 변경 시 연차 부여 데이터만 다시 로드
  useEffect(() => {
    if (currentUser) {
      loadAllowancesData()
    }
  }, [selectedYear, currentUser])

  const loadCurrentUser = async () => {
    try {
      const user = await supabaseAuthStorage.getCurrentUser()
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error)
      toast({
        title: "오류",
        description: "사용자 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const loadRequestsData = async () => {
    if (!currentUser) return

    try {
      setLoading(true)

      const [pending, all, allMembers] = await Promise.all([
        supabaseVacationStorage.getPendingVacationRequests(),
        supabaseVacationStorage.getVacationRequests(),
        supabaseMemberStorage.getMembers(),
      ])

      setPendingRequests(pending)
      setAllRequests(all)
      setMembers(allMembers)
    } catch (error) {
      console.error("요청 데이터 로드 실패:", error)
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAllowancesData = async () => {
    if (!currentUser) return

    try {
      setAllowanceLoading(true)

      // 구성원별 휴가 부여 내역 자동 생성
      await supabaseVacationStorage.ensureVacationAllowances(selectedYear)

      const yearAllowances = await supabaseVacationStorage.getVacationAllowancesByYear(selectedYear)
      setAllowances(yearAllowances)
    } catch (error) {
      console.error("연차 부여 데이터 로드 실패:", error)
      toast({
        title: "오류",
        description: "연차 부여 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setAllowanceLoading(false)
    }
  }

  // UUID로 구성원 정보 조회
  const getMemberInfo = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    return {
      name: member?.name || "알 수 없음",
      teamName: member?.team_name || "알 수 없음",
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!currentUser) return

    try {
      const request = allRequests.find((req) => req.id === requestId)
      if (!request) return

      await supabaseVacationStorage.updateVacationRequest(requestId, {
        status: "approved",
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
      })

      // 연차 사용량 업데이트
      await supabaseVacationStorage.updateVacationUsage(request.member_id, new Date(request.start_date).getFullYear())

      toast({
        title: "휴가 신청이 승인되었습니다",
        description: `${getMemberInfo(request.member_id).name}님의 휴가 신청이 승인되었습니다.`,
      })

      await loadRequestsData()
      await loadAllowancesData()
    } catch (error) {
      console.error("승인 처리 실패:", error)
      toast({
        title: "오류",
        description: "휴가 승인 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: string, reason: string) => {
    if (!currentUser) return

    try {
      const request = allRequests.find((req) => req.id === requestId)
      if (!request) return

      await supabaseVacationStorage.updateVacationRequest(requestId, {
        status: "rejected",
        rejection_reason: reason,
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
      })

      toast({
        title: "휴가 신청이 반려되었습니다",
        description: `${getMemberInfo(request.member_id).name}님의 휴가 신청이 반려되었습니다.`,
      })

      await loadRequestsData()
    } catch (error) {
      console.error("반려 처리 실패:", error)
      toast({
        title: "오류",
        description: "휴가 반려 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAdminCancel = async (requestId: string) => {
    if (!confirm("이 휴가를 취소하시겠습니까?")) return

    try {
      const request = allRequests.find((req) => req.id === requestId)
      if (!request) return

      // 관리자는 isAdmin = true로 호출
      const success = await supabaseVacationStorage.cancelVacationRequest(requestId, true)

      if (success) {
        toast({
          title: "휴가가 취소되었습니다",
          description: `${getMemberInfo(request.member_id).name}님의 휴가가 취소되었습니다.`,
        })

        await loadRequestsData()
        await loadAllowancesData()
      } else {
        toast({
          title: "취소 실패",
          description: "휴가 취소에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("관리자 취소 처리 실패:", error)
      toast({
        title: "오류",
        description: "휴가 취소 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const canAdminCancel = (request: VacationRequest) => {
    // 승인된 휴가만 관리자가 취소 가능
    return request.status === "approved"
  }

  const handleViewDetails = async (memberId: string, memberName: string) => {
    try {
      const usageDetails = await supabaseVacationStorage.getVacationUsageDetails(memberId, selectedYear)
      setSelectedMemberUsage(usageDetails)
      setSelectedMemberName(memberName)
      setDetailDialogOpen(true)
    } catch (error) {
      console.error("휴가 이력 조회 실패:", error)
      toast({
        title: "오류",
        description: "휴가 이력을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleEditAllowance = (allowance: VacationAllowance) => {
    setEditingAllowance(allowance)
    setEditTotalDays(allowance.total_days)
    setEditAllowanceDialogOpen(true)
  }

  const handleSaveAllowance = async () => {
    if (!editingAllowance) return

    try {
      await supabaseVacationStorage.updateVacationAllowanceDays(
        editingAllowance.member_id,
        editingAllowance.year,
        editTotalDays,
      )

      const memberInfo = getMemberInfo(editingAllowance.member_id)
      toast({
        title: "휴가 부여량이 수정되었습니다",
        description: `${memberInfo.name}님의 ${editingAllowance.year}년 휴가가 ${editTotalDays}일로 수정되었습니다.`,
      })

      setEditAllowanceDialogOpen(false)
      await loadAllowancesData()
    } catch (error) {
      console.error("휴가 부여량 수정 실패:", error)
      toast({
        title: "오류",
        description: "휴가 부여량 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800">승인됨</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">반려됨</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">취소됨</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "annual":
        return <Badge variant="outline">연차</Badge>
      case "morning_half":
        return <Badge variant="outline">오전반차</Badge>
      case "afternoon_half":
        return <Badge variant="outline">오후반차</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "-"
      return date.toLocaleDateString("ko-KR")
    } catch (error) {
      console.error("Date formatting error:", error)
      return "-"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 관리</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 관리자 권한 확인
  if (!currentUser || currentUser.role !== "관리자") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 관리</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">관리자만 접근할 수 있는 페이지입니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CalendarCheck className="h-6 w-6 mr-2" />
          휴가 관리
        </h1>
      </div>

      <Tabs defaultValue="approval" className="space-y-6">
        <TabsList>
          <TabsTrigger value="approval">연차 승인 관리</TabsTrigger>
          <TabsTrigger value="allowance">연차 부여 관리</TabsTrigger>
        </TabsList>

        {/* 연차 승인 관리 탭 */}
        <TabsContent value="approval" className="space-y-6">
          {/* 승인 대기 중인 신청 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                승인 대기 중인 신청 ({pendingRequests.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">승인 대기 중인 신청이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">신청자</TableHead>
                        <TableHead className="min-w-[70px]">팀</TableHead>
                        <TableHead className="min-w-[90px]">휴가 유형</TableHead>
                        <TableHead className="min-w-[140px]">기간</TableHead>
                        <TableHead className="min-w-[70px]">일수</TableHead>
                        <TableHead className="min-w-[110px]">신청일</TableHead>
                        <TableHead className="min-w-[100px]">사유</TableHead>
                        <TableHead className="min-w-[140px]">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => {
                        const memberInfo = getMemberInfo(request.member_id)
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium min-w-[80px]">{memberInfo.name}</TableCell>
                            <TableCell className="min-w-[70px]">{memberInfo.teamName}</TableCell>
                            <TableCell className="min-w-[90px]">{getTypeBadge(request.type)}</TableCell>
                            <TableCell className="min-w-[140px]">
                              {request.start_date === request.end_date
                                ? formatDate(request.start_date)
                                : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`}
                            </TableCell>
                            <TableCell className="min-w-[70px]">{request.days}일</TableCell>
                            <TableCell className="min-w-[110px]">{formatDate(request.created_at)}</TableCell>
                            <TableCell className="min-w-[100px] max-w-32 truncate">{request.reason}</TableCell>
                            <TableCell className="min-w-[140px]">
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={() => handleApprove(request.id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt("반려 사유를 입력하세요:")
                                    if (reason) handleReject(request.id, reason)
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  반려
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 전체 신청 내역 */}
          <Card>
            <CardHeader>
              <CardTitle>전체 신청 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">신청자</TableHead>
                      <TableHead className="min-w-[70px]">팀</TableHead>
                      <TableHead className="min-w-[90px]">휴가 유형</TableHead>
                      <TableHead className="min-w-[140px]">기간</TableHead>
                      <TableHead className="min-w-[70px]">일수</TableHead>
                      <TableHead className="min-w-[110px]">상태</TableHead>
                      <TableHead className="min-w-[110px]">신청일</TableHead>
                      <TableHead className="min-w-[100px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRequests.map((request) => {
                      const memberInfo = getMemberInfo(request.member_id)
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium min-w-[80px]">{memberInfo.name}</TableCell>
                          <TableCell className="min-w-[70px]">{memberInfo.teamName}</TableCell>
                          <TableCell className="min-w-[90px]">{getTypeBadge(request.type)}</TableCell>
                          <TableCell className="min-w-[140px]">
                            {request.start_date === request.end_date
                              ? formatDate(request.start_date)
                              : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`}
                          </TableCell>
                          <TableCell className="min-w-[70px]">{request.days}일</TableCell>
                          <TableCell className="min-w-[110px]">{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="min-w-[110px]">{formatDate(request.created_at)}</TableCell>
                          <TableCell className="min-w-[100px]">
                            {canAdminCancel(request) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdminCancel(request.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                취소
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 연차 부여 관리 탭 */}
        <TabsContent value="allowance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  연차 부여 현황
                </div>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024년</SelectItem>
                    <SelectItem value="2025">2025년</SelectItem>
                    <SelectItem value="2026">2026년</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allowanceLoading ? (
                <p className="text-gray-500 text-center py-8">데이터를 불러오는 중...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">이름</TableHead>
                        <TableHead className="min-w-[70px]">팀</TableHead>
                        <TableHead className="min-w-[100px]">부여한 휴가</TableHead>
                        <TableHead className="min-w-[100px]">사용한 휴가</TableHead>
                        <TableHead className="min-w-[90px]">잔여 휴가</TableHead>
                        <TableHead className="min-w-[140px]">비고</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowances.map((allowance) => {
                        const memberInfo = getMemberInfo(allowance.member_id)
                        return (
                          <TableRow key={allowance.id}>
                            <TableCell className="font-medium min-w-[80px]">{memberInfo.name}</TableCell>
                            <TableCell className="min-w-[70px]">{memberInfo.teamName}</TableCell>
                            <TableCell className="min-w-[100px]">{allowance.total_days}일</TableCell>
                            <TableCell className="min-w-[100px]">{allowance.used_days}일</TableCell>
                            <TableCell className="min-w-[90px]">
                              <Badge variant={allowance.remaining_days > 5 ? "secondary" : "destructive"}>
                                {allowance.remaining_days}일
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[140px]">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetails(allowance.member_id, memberInfo.name)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  휴가 이력
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditAllowance(allowance)}>
                                  수정
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 휴가 사용 내역 상세 다이얼로그 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMemberName}님의 {selectedYear}년 휴가 사용 내역
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMemberUsage.length === 0 ? (
              <p className="text-gray-500 text-center py-8">사용한 휴가가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[90px]">휴가 유형</TableHead>
                      <TableHead className="min-w-[140px]">기간</TableHead>
                      <TableHead className="min-w-[70px]">일수</TableHead>
                      <TableHead className="min-w-[110px]">승인일</TableHead>
                      <TableHead className="min-w-[100px]">사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMemberUsage.map((usage, index) => (
                      <TableRow key={index}>
                        <TableCell className="min-w-[90px]">{getTypeBadge(usage.type)}</TableCell>
                        <TableCell className="min-w-[140px]">
                          {usage.start_date === usage.end_date
                            ? formatDate(usage.start_date)
                            : `${formatDate(usage.start_date)} ~ ${formatDate(usage.end_date)}`}
                        </TableCell>
                        <TableCell className="min-w-[70px]">{usage.days}일</TableCell>
                        <TableCell className="min-w-[110px]">{formatDate(usage.approved_at)}</TableCell>
                        <TableCell className="min-w-[100px]">{usage.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 휴가 부여량 수정 다이얼로그 */}
      <Dialog open={editAllowanceDialogOpen} onOpenChange={setEditAllowanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAllowance && getMemberInfo(editingAllowance.member_id).name}님의 {editingAllowance?.year}년 휴가
              부여량 수정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totalDays">부여할 휴가 일수</Label>
              <Input
                id="totalDays"
                type="number"
                min="0"
                max="30"
                value={editTotalDays}
                onChange={(e) => setEditTotalDays(Number(e.target.value))}
              />
            </div>

            {editingAllowance && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p>현재 사용한 휴가: {editingAllowance.used_days}일</p>
                <p>수정 후 잔여 휴가: {editTotalDays - editingAllowance.used_days}일</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAllowanceDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveAllowance}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
