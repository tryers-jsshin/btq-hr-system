"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Clock, FileText, CheckCircle, XCircle, Users, X, Search, Filter } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabase } from "@/lib/supabase"
import { LeaveApprovalDialog } from "@/components/leave-approval-dialog"
import type { LeaveRequest, LeaveRequestStats } from "@/types/leave-request"

// Linear Light 테마 색상 시스템
const statusColors = {
  "대기중": "text-[#ea580c]",
  "승인됨": "text-[#16a34a]", 
  "반려됨": "text-[#dc2626]",
  "취소됨": "text-[#64748b]",
}

const statusBadgeColors = {
  "대기중": "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
  "승인됨": "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]",
  "반려됨": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "취소됨": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
  "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  "특별휴가": "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  "병가": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "경조휴가": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const getLeaveTypeColor = (leaveType: string) => {
  return leaveTypeColors[leaveType as keyof typeof leaveTypeColors] || "bg-[#fef3c7] text-[#d97706] border-[#fde68a]"
}

export default function LeaveApprovalDemo2() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<LeaveRequestStats | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role !== "관리자") {
        alert("관리자만 접근 가능합니다.")
        window.history.back()
        return
      }
      setCurrentUser(user)
      loadData()
    }
  }, [])

  // 필터링 로직
  useEffect(() => {
    let filtered = leaveRequests

    // 탭에 따른 기본 필터링
    if (activeTab === "pending") {
      filtered = filtered.filter(request => request.status === "대기중")
    } else if (activeTab !== "all") {
      filtered = filtered.filter(request => request.status === activeTab)
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터링 (탭과 중복되지 않는 경우만)
    if (statusFilter !== "all" && activeTab === "all") {
      filtered = filtered.filter(request => request.status === statusFilter)
    }

    // 연차 유형 필터링
    if (leaveTypeFilter !== "all") {
      filtered = filtered.filter(request => request.leave_type === leaveTypeFilter)
    }

    setFilteredRequests(filtered)
  }, [leaveRequests, searchTerm, statusFilter, leaveTypeFilter, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const requests = await supabaseLeaveRequestStorage.getAllLeaveRequests()
      setLeaveRequests(requests)
      
      const requestStats = await supabaseLeaveRequestStorage.getLeaveRequestStats()
      setStats(requestStats)
    } catch (error) {
      console.error("데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = (request: LeaveRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setApprovalAction(action)
    setShowApprovalDialog(true)
  }

  const handleApprovalSubmit = async () => {
    await loadData()
    setShowApprovalDialog(false)
    setSelectedRequest(null)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "M/d", { locale: ko })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "M/d HH:mm", { locale: ko })
  }

  const canTakeAction = (request: LeaveRequest): boolean => {
    return request.status === "대기중"
  }
  
  const canCancelRequest = (request: LeaveRequest): boolean => {
    return request.status === "승인됨"
  }
  
  const handleCancelRequest = async (requestId: string, memberName: string) => {
    if (!currentUser) return
    
    if (!confirm(`${memberName}님의 연차 신청을 취소하시겠습니까?`)) return
    
    try {
      const result = await supabaseLeaveRequestStorage.cancelLeaveRequest({
        request_id: requestId,
        cancelled_by: currentUser.name,
      })
      
      if (result.message) {
        alert(result.message)
      }
      
      await loadData()
    } catch (error) {
      console.error("연차 취소 오류:", error)
      alert(error instanceof Error ? error.message : "연차 취소 중 오류가 발생했습니다.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0a0b0c]">연차 승인 관리</h1>
            <p className="text-[#4a5568] mt-1">시안 2: Information Dense</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#5e6ad2] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#4a5568]">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0b0c]">연차 승인 관리</h1>
          <p className="text-[#718096] mt-1">시안 2: Information Dense</p>
        </div>
        <div className="text-sm text-[#4a5568]">
          관리자: <span className="font-semibold text-[#0a0b0c]">{currentUser?.name}</span>
        </div>
      </div>

      {/* 그라데이션 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] border-0 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total_requests}</div>
              <div className="text-sm opacity-90">전체 신청</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-[#ea580c] to-[#f97316] border-0 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.pending_requests}</div>
              <div className="text-sm opacity-90">대기중</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-[#16a34a] to-[#22c55e] border-0 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.approved_requests}</div>
              <div className="text-sm opacity-90">승인됨</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-[#dc2626] to-[#ef4444] border-0 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.rejected_requests}</div>
              <div className="text-sm opacity-90">반려됨</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-[#64748b] to-[#94a3b8] border-0 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.cancelled_requests}</div>
              <div className="text-sm opacity-90">취소됨</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터링 및 검색 */}
      <Card className="bg-white border-[#f3f4f6]">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#718096]" />
                <Input
                  placeholder="이름 또는 팀명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] border-[#f3f4f6]">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="대기중">대기중</SelectItem>
                <SelectItem value="승인됨">승인됨</SelectItem>
                <SelectItem value="반려됨">반려됨</SelectItem>
                <SelectItem value="취소됨">취소됨</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="w-[150px] border-[#f3f4f6]">
                <SelectValue placeholder="연차 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="연차">연차</SelectItem>
                <SelectItem value="오전반차">오전반차</SelectItem>
                <SelectItem value="오후반차">오후반차</SelectItem>
                <SelectItem value="특별휴가">특별휴가</SelectItem>
                <SelectItem value="병가">병가</SelectItem>
                <SelectItem value="경조휴가">경조휴가</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 연차 신청 목록 */}
      <Card className="bg-white border-[#f3f4f6]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-[#0a0b0c]">
            <FileText className="h-5 w-5 text-[#5e6ad2]" />
            연차 신청 목록
            <Badge className="bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]">
              {filteredRequests.length}건
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 bg-[#fafbfb]">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2]">
                대기중 ({stats?.pending_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2]">
                전체
              </TabsTrigger>
              <TabsTrigger value="승인됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2]">
                승인됨
              </TabsTrigger>
              <TabsTrigger value="반려됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2]">
                반려됨
              </TabsTrigger>
              <TabsTrigger value="취소됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2]">
                취소됨
              </TabsTrigger>
            </TabsList>

            {/* 통합 컨텐츠 */}
            <div className="space-y-2">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="bg-[#fafbfb] border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* 구성원 정보 */}
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-8 h-8 bg-[#5e6ad2] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {request.member_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0a0b0c] text-sm">{request.member_name}</div>
                            {request.team_name && (
                              <div className="text-xs text-[#718096]">{request.team_name}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Badge 정보 */}
                        <div className="flex items-center gap-2">
                          <Badge className={getLeaveTypeColor(request.leave_type)} variant="outline">
                            {request.leave_type}
                          </Badge>
                          <Badge className={statusBadgeColors[request.status]} variant="outline">
                            {request.status}
                          </Badge>
                        </div>
                        
                        {/* 날짜 및 기간 */}
                        <div className="flex items-center gap-4 text-sm text-[#4a5568]">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            <span>
                              {request.start_date === request.end_date
                                ? formatDate(request.start_date)
                                : `${formatDate(request.start_date)}~${formatDate(request.end_date)}`
                              }
                            </span>
                          </div>
                          <div className="font-semibold text-[#0a0b0c]">
                            {request.total_days}일
                          </div>
                        </div>
                        
                        {/* 신청일 */}
                        <div className="flex items-center gap-1 text-xs text-[#718096]">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(request.requested_at)}</span>
                        </div>
                        
                        {/* 사유 (있는 경우만) */}
                        {request.reason && (
                          <div className="text-xs text-[#4a5568] max-w-[200px] truncate">
                            {request.reason}
                          </div>
                        )}
                      </div>
                      
                      {/* 액션 버튼 */}
                      <div className="flex gap-1">
                        {canTakeAction(request) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprovalAction(request, "approve")}
                              className="bg-[#16a34a] hover:bg-[#15803d] text-white h-8 px-3"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalAction(request, "reject")}
                              className="text-[#dc2626] hover:text-[#b91c1c] border-[#fecaca] hover:bg-[#fef2f2] h-8 px-3"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              반려
                            </Button>
                          </>
                        )}
                        
                        {canCancelRequest(request) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(request.id, request.member_name)}
                            className="text-[#dc2626] hover:text-[#b91c1c] border-[#fecaca] hover:bg-[#fef2f2] h-8 px-3"
                          >
                            <X className="h-3 w-3 mr-1" />
                            취소
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* 추가 정보 (반려 사유, 승인/취소일 등) */}
                    {(request.rejected_reason || request.approved_at || request.cancelled_at) && (
                      <div className="mt-3 pt-3 border-t border-[#f3f4f6] text-xs">
                        {request.status === "반려됨" && request.rejected_reason && (
                          <div className="text-[#dc2626]">
                            <span className="font-medium">반려 사유:</span> {request.rejected_reason}
                          </div>
                        )}
                        {request.status === "승인됨" && request.approved_at && (
                          <div className="text-[#16a34a]">
                            <span className="font-medium">승인일:</span> {formatDateTime(request.approved_at)}
                          </div>
                        )}
                        {request.status === "취소됨" && request.cancelled_at && (
                          <div className="text-[#64748b]">
                            <span className="font-medium">취소일:</span> {formatDateTime(request.cancelled_at)}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#f7f8f9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="h-8 w-8 text-[#718096]" />
                  </div>
                  <p className="text-[#4a5568] text-lg">조건에 맞는 연차 신청이 없습니다.</p>
                  <p className="text-[#718096] text-sm mt-2">검색 조건을 변경해보세요.</p>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* 승인/반려 다이얼로그 */}
      {selectedRequest && (
        <LeaveApprovalDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          request={selectedRequest}
          action={approvalAction}
          approverId={currentUser?.id || ""}
          onSubmit={handleApprovalSubmit}
        />
      )}
    </div>
  )
}